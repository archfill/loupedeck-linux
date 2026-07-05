#!/usr/bin/env bash
set -euo pipefail

RULE_PATH="/etc/udev/rules.d/50-loupedeck.rules"

if [ -f /etc/os-release ] && grep -q '^ID=nixos$' /etc/os-release; then
  cat <<'EOF'
NixOS detected.

Import this repository's NixOS module instead of writing /etc/udev/rules.d directly:

{
  imports = [
    inputs.loupedeck-linux.nixosModules.default
  ];

  programs.loupedeck-linux.enable = true;
}

Then rebuild your system and reconnect the device:

  sudo nixos-rebuild switch
  pnpm run device:doctor
EOF
  exit 0
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required to install udev rules" >&2
  exit 1
fi

echo "Installing Loupedeck udev rule to ${RULE_PATH}"

sudo tee "$RULE_PATH" >/dev/null <<'EOF'
# Loupedeck Live S
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0004", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="2ec2", ATTRS{idProduct}=="0004", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0006", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="2ec2", ATTRS{idProduct}=="0006", MODE="0660", TAG+="uaccess"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger

echo "udev rule installed."
echo "Reconnect the Loupedeck device, then run:"
echo "  pnpm run device:doctor"
