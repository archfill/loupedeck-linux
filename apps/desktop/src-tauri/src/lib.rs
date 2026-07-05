use serde_json::{json, Value};
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{self, Receiver};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, State};
use thiserror::Error;

#[derive(Debug, Error)]
enum DesktopError {
    #[error("home directory is not available")]
    MissingHome,
    #[error("configuration is missing the pages object")]
    MissingPages,
    #[error("page {0} was not found")]
    PageNotFound(String),
    #[error("sidecar error: {0}")]
    Sidecar(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

impl serde::Serialize for DesktopError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

type DesktopResult<T> = Result<T, DesktopError>;

const DEFAULT_CONFIG: &str = include_str!("../../sidecar/config/config.default.json");

struct SidecarProcess {
    child: Child,
    stdin: ChildStdin,
    responses: Receiver<Value>,
    next_request_id: u64,
}

struct SidecarManager {
    process: Mutex<Option<SidecarProcess>>,
    project_root: Mutex<Option<PathBuf>>,
}

impl SidecarManager {
    fn new() -> Self {
        Self {
            process: Mutex::new(None),
            project_root: Mutex::new(None),
        }
    }

    fn set_project_root(&self, project_root: PathBuf) -> DesktopResult<()> {
        let mut slot = self
            .project_root
            .lock()
            .map_err(|_| DesktopError::Sidecar("project root lock was poisoned".to_string()))?;
        *slot = Some(project_root);
        Ok(())
    }

    fn project_root(&self) -> DesktopResult<PathBuf> {
        if let Ok(root) = env::var("LOUPEDECK_PROJECT_ROOT") {
            return Ok(PathBuf::from(root));
        }

        let slot = self
            .project_root
            .lock()
            .map_err(|_| DesktopError::Sidecar("project root lock was poisoned".to_string()))?;
        Ok(slot.clone().unwrap_or_else(repo_root))
    }

    fn status(&self) -> DesktopResult<Value> {
        let mut process = self
            .process
            .lock()
            .map_err(|_| DesktopError::Sidecar("sidecar lock was poisoned".to_string()))?;

        let status = match process.as_mut() {
            Some(sidecar) => match sidecar.child.try_wait()? {
                Some(exit_status) => {
                    let code = exit_status.code();
                    *process = None;
                    json!({
                        "state": "exited",
                        "code": code,
                    })
                }
                None => {
                    let pid = sidecar.child.id();
                    match request_sidecar(sidecar, "status") {
                        Ok(controller) => json!({
                            "state": "running",
                            "pid": pid,
                            "controller": controller,
                        }),
                        Err(error) => json!({
                            "state": "running",
                            "pid": pid,
                            "controllerError": error.to_string(),
                        }),
                    }
                }
            },
            None => json!({
                "state": "stopped",
            }),
        };

        Ok(status)
    }

    fn start(&self) -> DesktopResult<Value> {
        {
            let status = self.status()?;
            if status.get("state").and_then(Value::as_str) == Some("running") {
                return Ok(status);
            }
        }

        let project_root = self.project_root()?;
        let mut command = sidecar_command(&project_root);
        let child = command
            .current_dir(&project_root)
            .env("LOUPEDECK_PROJECT_ROOT", &project_root)
            .env("LOUPEDECK_LOG_TO_STDERR", "true")
            .env("NODE_ENV", "production")
            .env("LOG_LEVEL", "info")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()?;

        let pid = child.id();
        let mut child = child;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| DesktopError::Sidecar("sidecar stdin is unavailable".to_string()))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| DesktopError::Sidecar("sidecar stdout is unavailable".to_string()))?;
        let responses = spawn_sidecar_stdout_reader(stdout);

        let mut slot = self
            .process
            .lock()
            .map_err(|_| DesktopError::Sidecar("sidecar lock was poisoned".to_string()))?;
        *slot = Some(SidecarProcess {
            child,
            stdin,
            responses,
            next_request_id: 1,
        });

        Ok(json!({
            "state": "running",
            "pid": pid,
        }))
    }

    fn stop(&self) -> DesktopResult<Value> {
        let mut process = self
            .process
            .lock()
            .map_err(|_| DesktopError::Sidecar("sidecar lock was poisoned".to_string()))?;

        if let Some(sidecar) = process.as_mut() {
            if sidecar.child.try_wait()?.is_none() {
                let _ = request_sidecar(sidecar, "stop");
            }
            if sidecar.child.try_wait()?.is_none() {
                let _ = sidecar.child.kill();
            }
            let _ = sidecar.child.wait();
        }
        *process = None;

        Ok(json!({
            "state": "stopped",
        }))
    }

    fn restart(&self) -> DesktopResult<Value> {
        self.stop()?;
        self.start()
    }
}

impl Drop for SidecarManager {
    fn drop(&mut self) {
        if let Ok(mut process) = self.process.lock() {
            if let Some(sidecar) = process.as_mut() {
                let _ = sidecar.child.kill();
                let _ = sidecar.child.wait();
            }
            *process = None;
        }
    }
}

fn request_sidecar(sidecar: &mut SidecarProcess, method: &str) -> DesktopResult<Value> {
    let id = sidecar.next_request_id;
    sidecar.next_request_id += 1;

    let request = json!({
        "id": id,
        "method": method,
    });
    writeln!(sidecar.stdin, "{request}")?;
    sidecar.stdin.flush()?;

    loop {
        let response = sidecar
            .responses
            .recv_timeout(Duration::from_secs(2))
            .map_err(|error| DesktopError::Sidecar(format!("sidecar response timeout: {error}")))?;

        if response.get("id").and_then(Value::as_u64) != Some(id) {
            continue;
        }

        if let Some(error) = response.get("error").and_then(Value::as_str) {
            return Err(DesktopError::Sidecar(error.to_string()));
        }

        return Ok(response.get("result").cloned().unwrap_or(Value::Null));
    }
}

fn spawn_sidecar_stdout_reader(stdout: std::process::ChildStdout) -> Receiver<Value> {
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            if let Ok(value) = serde_json::from_str::<Value>(&line) {
                let _ = sender.send(value);
            }
        }
    });
    receiver
}

fn sidecar_command(project_root: &Path) -> Command {
    let built_sidecar = project_root.join("apps/desktop/sidecar/dist/sidecar.js");
    if !cfg!(debug_assertions) && built_sidecar.exists() {
        let bundled_node = project_root.join("bin/node");
        let mut command = if bundled_node.exists() {
            Command::new(bundled_node)
        } else {
            Command::new("node")
        };
        command.arg(built_sidecar);
        return command;
    }

    let mut command = Command::new("pnpm");
    command.args(["--filter", "@loupedeck-linux/sidecar", "run", "sidecar"]);
    command
}

fn bundled_project_root(app: &tauri::App) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    let sidecar_path = resource_dir.join("apps/desktop/sidecar/dist/sidecar.js");
    sidecar_path.exists().then_some(resource_dir)
}

fn repo_root() -> PathBuf {
    if let Ok(root) = env::var("LOUPEDECK_PROJECT_ROOT") {
        return PathBuf::from(root);
    }

    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")))
}

fn config_home() -> DesktopResult<PathBuf> {
    if let Ok(xdg_config_home) = env::var("XDG_CONFIG_HOME") {
        return Ok(PathBuf::from(xdg_config_home));
    }

    let home = env::var("HOME").map_err(|_| DesktopError::MissingHome)?;
    Ok(PathBuf::from(home).join(".config"))
}

fn config_dir() -> DesktopResult<PathBuf> {
    Ok(config_home()?.join("loupedeck-linux"))
}

fn user_config_path() -> DesktopResult<PathBuf> {
    Ok(config_dir()?.join("config.json"))
}

fn ensure_user_config() -> DesktopResult<PathBuf> {
    let path = user_config_path()?;
    if path.exists() {
        return Ok(path);
    }

    fs::create_dir_all(config_dir()?)?;
    fs::write(&path, DEFAULT_CONFIG)?;
    Ok(path)
}

fn read_config_value() -> DesktopResult<Value> {
    let path = ensure_user_config()?;
    let contents = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&contents)?)
}

fn write_config_value(config: &Value) -> DesktopResult<()> {
    let path = ensure_user_config()?;
    let temp_path = path.with_extension("json.tmp");
    let contents = serde_json::to_string_pretty(config)?;
    fs::write(&temp_path, format!("{contents}\n"))?;
    fs::rename(temp_path, path)?;
    Ok(())
}

fn next_page_number(pages: &serde_json::Map<String, Value>) -> String {
    let mut page_num = 1;
    while pages.contains_key(&page_num.to_string()) {
        page_num += 1;
    }
    page_num.to_string()
}

fn device_info() -> Value {
    json!({
        "type": "Loupedeck Live S",
        "grid": {
            "columns": 5,
            "rows": 3,
        },
        "knobs": ["knobTL", "knobCL"],
        "buttons": [0, 1, 2, 3],
    })
}

fn runtime_constants() -> Value {
    json!({
        "autoUpdateInterval": 1000,
        "knobIds": {
            "TOP_LEFT": "knobTL",
            "CENTER_LEFT": "knobCL",
        },
        "volumeStep": 5,
        "volumeDisplayTimeout": 2000,
    })
}

fn config_for_ui(mut config: Value) -> Value {
    if let Value::Object(config_object) = &mut config {
        config_object.entry("device").or_insert_with(device_info);
        config_object
            .entry("constants")
            .or_insert_with(runtime_constants);
    }

    config
}

#[tauri::command]
fn get_config() -> DesktopResult<Value> {
    Ok(config_for_ui(read_config_value()?))
}

#[tauri::command]
fn get_device_info() -> DesktopResult<Value> {
    Ok(device_info())
}

#[tauri::command]
fn save_pages(pages: Value) -> DesktopResult<()> {
    let mut config = read_config_value()?;
    config["pages"] = pages;
    write_config_value(&config)
}

#[tauri::command]
fn create_page(title: Option<String>, description: Option<String>) -> DesktopResult<String> {
    let mut config = read_config_value()?;
    let pages = config
        .get_mut("pages")
        .and_then(Value::as_object_mut)
        .ok_or(DesktopError::MissingPages)?;

    let page_num = next_page_number(pages);
    pages.insert(
        page_num.clone(),
        json!({
            "_meta": {
                "title": title.unwrap_or_else(|| format!("Page {page_num}")),
                "description": description.unwrap_or_default()
            }
        }),
    );
    write_config_value(&config)?;
    Ok(page_num)
}

#[tauri::command]
fn delete_page(page_num: String) -> DesktopResult<()> {
    let mut config = read_config_value()?;
    let pages = config
        .get_mut("pages")
        .and_then(Value::as_object_mut)
        .ok_or(DesktopError::MissingPages)?;

    if pages.remove(&page_num).is_none() {
        return Err(DesktopError::PageNotFound(page_num));
    }

    write_config_value(&config)
}

#[tauri::command]
fn update_page_meta(page_num: String, title: String, description: String) -> DesktopResult<()> {
    let mut config = read_config_value()?;
    let pages = config
        .get_mut("pages")
        .and_then(Value::as_object_mut)
        .ok_or(DesktopError::MissingPages)?;
    let page = pages
        .get_mut(&page_num)
        .and_then(Value::as_object_mut)
        .ok_or(DesktopError::PageNotFound(page_num))?;

    page.insert(
        "_meta".to_string(),
        json!({
            "title": title,
            "description": description
        }),
    );
    write_config_value(&config)
}

#[tauri::command]
fn get_sidecar_status(sidecar: State<'_, SidecarManager>) -> DesktopResult<Value> {
    sidecar.status()
}

#[tauri::command]
fn start_sidecar(sidecar: State<'_, SidecarManager>) -> DesktopResult<Value> {
    sidecar.start()
}

#[tauri::command]
fn restart_sidecar(sidecar: State<'_, SidecarManager>) -> DesktopResult<Value> {
    sidecar.restart()
}

#[tauri::command]
fn stop_sidecar(sidecar: State<'_, SidecarManager>) -> DesktopResult<Value> {
    sidecar.stop()
}

fn show_settings_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg(target_os = "linux")]
fn appindicator_runtime_available() -> bool {
    const LIB_NAMES: &[&str] = &[
        "libayatana-appindicator3.so.1",
        "libayatana-appindicator3.so",
        "libappindicator3.so.1",
        "libappindicator3.so",
    ];
    const COMMON_LIB_DIRS: &[&str] = &[
        "/usr/lib",
        "/usr/lib64",
        "/usr/lib/x86_64-linux-gnu",
        "/lib",
        "/lib64",
        "/lib/x86_64-linux-gnu",
    ];

    let env_dirs = env::var_os("LD_LIBRARY_PATH")
        .into_iter()
        .flat_map(|paths| env::split_paths(&paths).collect::<Vec<_>>());
    let common_dirs = COMMON_LIB_DIRS.iter().map(PathBuf::from);

    env_dirs.chain(common_dirs).any(|dir| {
        LIB_NAMES
            .iter()
            .any(|name| Path::new(&dir).join(name).exists())
    })
}

#[cfg(not(target_os = "linux"))]
fn appindicator_runtime_available() -> bool {
    true
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    if !appindicator_runtime_available() {
        eprintln!("AppIndicator runtime library was not found; tray icon is disabled.");
        return Ok(());
    }

    let open_settings =
        MenuItem::with_id(app, "open_settings", "Open Settings", true, None::<&str>)?;
    let restart_device = MenuItem::with_id(
        app,
        "restart_device",
        "Restart Device Controller",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_settings, &restart_device, &quit])?;

    TrayIconBuilder::new()
        .icon(
            app.default_window_icon()
                .expect("missing default window icon")
                .clone(),
        )
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open_settings" => show_settings_window(app),
            "restart_device" => {
                let sidecar = app.state::<SidecarManager>();
                if let Err(error) = sidecar.restart() {
                    eprintln!("Failed to restart sidecar: {error}");
                }
            }
            "quit" => {
                let sidecar = app.state::<SidecarManager>();
                let _ = sidecar.stop();
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .manage(SidecarManager::new())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Loupedeck Linux");
            }
            let sidecar = app.state::<SidecarManager>();
            if let Some(project_root) = bundled_project_root(app) {
                if let Err(error) = sidecar.set_project_root(project_root) {
                    eprintln!("Failed to configure bundled sidecar path: {error}");
                }
            }
            if let Err(error) = sidecar.start() {
                eprintln!("Failed to start sidecar: {error}");
            }
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            get_device_info,
            save_pages,
            create_page,
            delete_page,
            update_page_meta,
            get_sidecar_status,
            start_sidecar,
            restart_sidecar,
            stop_sidecar
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
