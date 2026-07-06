{
  lib,
  rustPlatform,

  cargo-tauri,
  fetchPnpmDeps,
  makeWrapper,
  node-gyp,
  nodejs_22,
  pkg-config,
  pnpm_11,
  pnpmConfigHook,
  python3,
  wrapGAppsHook3,

  cairo,
  dbus,
  fontconfig,
  giflib,
  glib,
  glib-networking,
  gtk3,
  libayatana-appindicator,
  libjpeg,
  librsvg,
  libuuid,
  nerd-fonts,
  noto-fonts-cjk-sans,
  openssl,
  pango,
  pixman,
  webkitgtk_4_1,
}:

let
  pnpmDepsSrc = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../package.json
      ../pnpm-lock.yaml
      ../pnpm-workspace.yaml
      ../apps/desktop/package.json
      ../apps/desktop/frontend/package.json
      ../apps/desktop/sidecar/package.json
    ];
  };
in
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "loupedeck-linux";
  version = "0.1.1";

  src = lib.cleanSourceWith {
    src = ../.;
    filter =
      path: type:
      let
        baseName = baseNameOf path;
      in
      !(
        baseName == ".git"
        || baseName == "node_modules"
        || baseName == "target"
        || baseName == "dist"
      );
  };

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version;
    src = pnpmDepsSrc;
    pnpm = pnpm_11;
    fetcherVersion = 4;
    pnpmWorkspaces = [
      "@loupedeck-linux/sidecar"
      "@loupedeck-linux/desktop"
      "@loupedeck-linux/frontend"
    ];
    pnpmInstallFlags = [
      "--force"
      "--prod=false"
    ];
    hash = "sha256-ZxwacLb0ubJEgNNRGtYgdlqOotnm2fsv4oLdqtU/Gnw=";
  };

  cargoRoot = "apps/desktop/src-tauri";
  buildAndTestSubdir = finalAttrs.cargoRoot;
  cargoHash = "sha256-xG73KzISu5CbLHQ79gxBBy6qhfF/DUSnERyMJ3IyINc=";

  nativeBuildInputs = [
    cargo-tauri.hook
    makeWrapper
    node-gyp
    nodejs_22
    pkg-config
    pnpm_11
    pnpmConfigHook
    python3
    wrapGAppsHook3
  ];

  buildInputs = [
    cairo
    dbus
    fontconfig
    giflib
    glib
    glib-networking
    gtk3
    libayatana-appindicator
    libjpeg
    librsvg
    libuuid
    openssl
    pango
    pixman
    webkitgtk_4_1
  ];

  dontWrapGApps = true;
  pnpmWorkspaces = [
    "@loupedeck-linux/sidecar"
    "@loupedeck-linux/desktop"
    "@loupedeck-linux/frontend"
  ];

  prePnpmInstall = ''
    pnpmInstallFlags+=(--force --prod=false)
  '';

  postInstall = ''
    mkdir -p "$out/libexec" "$out/share/loupedeck-linux/apps/desktop/sidecar"
    mv "$out/bin/loupedeck-linux-desktop" "$out/libexec/"

    cp -R apps/desktop/sidecar/dist "$out/share/loupedeck-linux/apps/desktop/sidecar/dist"
    cp -R apps/desktop/sidecar/config "$out/share/loupedeck-linux/apps/desktop/sidecar/config"

    npm_config_build_from_source=true npm_config_nodedir=${nodejs_22} pnpm --filter @loupedeck-linux/sidecar rebuild canvas
    node nix/copy-sidecar-node-modules.mjs "$PWD" "$out/share/loupedeck-linux/node_modules"

    makeWrapper "$out/libexec/loupedeck-linux-desktop" "$out/bin/loupedeck-linux" \
      --prefix PATH : ${lib.makeBinPath [ nodejs_22 ]} \
      --prefix LD_LIBRARY_PATH : ${
        lib.makeLibraryPath [
          cairo
          fontconfig
          giflib
          glib
          gtk3
          libayatana-appindicator
          libjpeg
          librsvg
          libuuid
          openssl
          pango
          pixman
          webkitgtk_4_1
        ]
      } \
      --set GIO_MODULE_DIR "${glib-networking}/lib/gio/modules" \
      --set LOUPEDECK_ICON_FONT_PATH "${nerd-fonts.symbols-only}/share/fonts/truetype/NerdFonts/Symbols/SymbolsNerdFont-Regular.ttf" \
      --set LOUPEDECK_PROJECT_ROOT "$out/share/loupedeck-linux" \
      --set LOUPEDECK_UI_FONT_PATH "${noto-fonts-cjk-sans}/share/fonts/opentype/noto-cjk/NotoSansCJK-VF.otf.ttc" \
      --set WEBKIT_DISABLE_DMABUF_RENDERER "1"
  '';

  meta = {
    description = "Loupedeck Live S Linux controller desktop application";
    homepage = "https://github.com/archfill/loupedeck-linux";
    license = lib.licenses.mit;
    mainProgram = "loupedeck-linux";
    platforms = lib.platforms.linux;
  };
})
