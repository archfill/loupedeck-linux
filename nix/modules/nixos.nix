{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.programs.loupedeck-linux;

  udevRules = lib.concatMapStringsSep "\n" (
    productId:
    ''
      SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="${productId}", MODE="0660", TAG+="uaccess"
      SUBSYSTEM=="tty", ATTRS{idVendor}=="2ec2", ATTRS{idProduct}=="${productId}", MODE="0660", TAG+="uaccess"
    ''
  ) cfg.udevProductIds;
in
{
  options.programs.loupedeck-linux = {
    enable = lib.mkEnableOption "Loupedeck Linux device integration";

    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = null;
      description = ''
        Optional Loupedeck Linux desktop package to add to systemPackages.
        Leave null when running from a source checkout.
      '';
    };

    udevProductIds = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [
        "0004"
        "0006"
      ];
      description = "Loupedeck USB product IDs that should receive uaccess permissions.";
    };

    runtimeUtilities.enable = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Install optional runtime utilities used by bundled example actions.";
    };
  };

  config = lib.mkIf cfg.enable {
    services.udev.extraRules = udevRules;

    environment.systemPackages =
      lib.optional (cfg.package != null) cfg.package
      ++ lib.optionals cfg.runtimeUtilities.enable [
        pkgs.pamixer
        pkgs.playerctl
      ];
  };
}
