use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use thiserror::Error;

#[derive(Debug, Error)]
enum DesktopError {
    #[error("home directory is not available")]
    MissingHome,
    #[error("configuration is missing the pages object")]
    MissingPages,
    #[error("page {0} was not found")]
    PageNotFound(String),
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

const DEFAULT_CONFIG: &str = include_str!("../../../backend/config/config.default.json");

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

#[tauri::command]
fn get_config() -> DesktopResult<Value> {
    read_config_value()
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

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Loupedeck Linux");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_pages,
            create_page,
            delete_page,
            update_page_meta
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
