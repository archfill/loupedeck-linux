{
  description = "Development shell for loupedeck-linux";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      nixosModules.default = import ./nix/modules/nixos.nix;

      packages = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.callPackage ./nix/package.nix { };
          loupedeck-linux = pkgs.callPackage ./nix/package.nix { };
        }
      );

      apps = forAllSystems (
        system:
        {
          default = {
            type = "app";
            program = "${self.packages.${system}.default}/bin/loupedeck-linux";
          };
          loupedeck-linux = {
            type = "app";
            program = "${self.packages.${system}.loupedeck-linux}/bin/loupedeck-linux";
          };
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              cargo
              dbus
              fontconfig
              glib
              gtk3
              libayatana-appindicator
              libuuid
              nerd-fonts.symbols-only
              nodejs_22
              noto-fonts-cjk-sans
              openssl
              pkg-config
              pnpm
              rustc
              webkitgtk_4_1
            ];

            env = {
              FONTCONFIG_FILE = pkgs.makeFontsConf {
                fontDirectories = [
                  pkgs.nerd-fonts.symbols-only
                  pkgs.noto-fonts-cjk-sans
                ];
              };
              GIO_MODULE_DIR = "${pkgs.glib-networking}/lib/gio/modules";
              LOUPEDECK_ICON_FONT_PATH = "${pkgs.nerd-fonts.symbols-only}/share/fonts/truetype/NerdFonts/Symbols/SymbolsNerdFont-Regular.ttf";
              LOUPEDECK_UI_FONT_PATH = "${pkgs.noto-fonts-cjk-sans}/share/fonts/opentype/noto-cjk/NotoSansCJK-VF.otf.ttc";
              LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
                pkgs.gtk3
                (pkgs.lib.getLib pkgs.libayatana-appindicator)
                pkgs.libuuid
                pkgs.webkitgtk_4_1
              ];
            };
          };
        }
      );
    };
}
