{
  description = "Development shell for loupedeck-linux";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
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
              glib
              gtk3
              libayatana-appindicator
              nodejs_22
              openssl
              pkg-config
              pnpm
              rustc
              webkitgtk_4_1
            ];

            env = {
              GIO_MODULE_DIR = "${pkgs.glib-networking}/lib/gio/modules";
            };
          };
        }
      );
    };
}
