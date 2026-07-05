#!/usr/bin/env bash
set -euo pipefail

VENDOR_ID="2ec2"
PRODUCT_IDS=("0004" "0006")
RULE_PATH="/etc/udev/rules.d/50-loupedeck.rules"
usb_access_ok=false
serial_access_ok=false

ok() {
  printf '✓ %s\n' "$1"
}

warn() {
  printf '⚠ %s\n' "$1"
}

fail() {
  printf '✗ %s\n' "$1"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

check_command() {
  local command_name="$1"
  local hint="$2"

  if has_command "$command_name"; then
    ok "$command_name is available"
  else
    fail "$command_name is missing"
    printf '  %s\n' "$hint"
  fi
}

echo "Loupedeck Linux device setup doctor"
echo ""

echo "Core tools"
check_command node "Install Node.js 22+ or enter the Nix dev shell: nix develop"
check_command pnpm "Install pnpm or enter the Nix dev shell: nix develop"
check_command cargo "Install Rust/Cargo or enter the Nix dev shell: nix develop"
check_command pkg-config "Install pkgconf/pkg-config for non-Nix Tauri builds"

echo ""
echo "Desktop native libraries"
if has_command pkg-config; then
  for package in gtk+-3.0 webkit2gtk-4.1 ayatana-appindicator3-0.1; do
    if pkg-config --exists "$package"; then
      ok "$package is available"
    else
      warn "$package was not found by pkg-config"
    fi
  done
else
  warn "Skipping native library checks because pkg-config is missing"
fi

echo ""
echo "Device"
if has_command lsusb; then
  if ! lsusb_output=$(lsusb 2>&1); then
    warn "lsusb failed: ${lsusb_output}"
    printf '  If this is running inside a sandbox, run the doctor from a normal host shell.\n'
  else
    device_line=""
    for product_id in "${PRODUCT_IDS[@]}"; do
      if candidate=$(printf '%s\n' "$lsusb_output" | grep -i "${VENDOR_ID}:${product_id}" | head -n 1); then
        device_line="$candidate"
        break
      fi
    done

    if [ -n "$device_line" ]; then
      product_id=$(printf '%s\n' "$device_line" | awk '{print $6}' | cut -d: -f2)
      ok "Loupedeck Live S is connected (${VENDOR_ID}:${product_id})"
      bus=$(printf '%s\n' "$device_line" | awk '{print $2}')
      device=$(printf '%s\n' "$device_line" | awk '{print $4}' | tr -d ':')
      device_path="/dev/bus/usb/${bus}/${device}"

      if [ -e "$device_path" ]; then
        ok "USB device node exists: $device_path"
        ls -l "$device_path"
        if [ -r "$device_path" ] && [ -w "$device_path" ]; then
          ok "current user can read/write the device node"
          usb_access_ok=true
        else
          warn "current user may not be able to access the device node"
          printf '  Run: pnpm run device:setup:udev\n'
          printf '  Then reconnect the device or re-login.\n'
        fi
      fi

      serial_paths=()
      if [ -d /dev/serial/by-id ]; then
        while IFS= read -r serial_path; do
          serial_paths+=("$(readlink -f "$serial_path")")
        done < <(find /dev/serial/by-id -maxdepth 1 -type l -name 'usb-Loupedeck_*' | sort)
      fi

      for serial_path in /dev/ttyACM*; do
        [ -e "$serial_path" ] || continue
        serial_paths+=("$serial_path")
      done

      if [ "${#serial_paths[@]}" -gt 0 ]; then
        seen_serial_paths=""
        for serial_target in "${serial_paths[@]}"; do
          case " $seen_serial_paths " in
            *" $serial_target "*) continue ;;
          esac
          seen_serial_paths="${seen_serial_paths} ${serial_target}"

          ok "serial device node exists: $serial_target"
          ls -l "$serial_target"
          if [ -r "$serial_target" ] && [ -w "$serial_target" ]; then
            ok "current user can read/write the serial device node"
            serial_access_ok=true
          else
            warn "current user cannot read/write the serial device node"
            printf '  The Loupedeck library opens the tty device, not only /dev/bus/usb.\n'
            printf '  On NixOS, rebuild with programs.loupedeck-linux.enable = true, then reconnect the device.\n'
          fi
        done
      else
        warn "Loupedeck serial device node was not found under /dev/serial/by-id or /dev/ttyACM*"
      fi
    else
      warn "Loupedeck Live S was not found by lsusb (${VENDOR_ID}:0004 or ${VENDOR_ID}:0006)"
      printf '  Connect the device and run this doctor again.\n'
    fi
  fi
else
  warn "lsusb is missing; device detection was skipped"
fi

echo ""
echo "udev"
if [ -f /etc/os-release ] && grep -q '^ID=nixos$' /etc/os-release; then
  if [ "$usb_access_ok" = true ] && [ "$serial_access_ok" = true ]; then
    ok "NixOS uaccess permissions appear active for the current user"
  else
    warn "NixOS detected; import this repository's NixOS module in your system configuration"
    cat <<'EOF'
  Example:
  imports = [
    inputs.loupedeck-linux.nixosModules.default
  ];

  programs.loupedeck-linux.enable = true;
EOF
  fi
elif [ -f "$RULE_PATH" ]; then
  ok "udev rule exists: $RULE_PATH"
else
  warn "udev rule is missing: $RULE_PATH"
  printf '  Run: pnpm run device:setup:udev\n'
fi

echo ""
echo "Runtime utilities"
check_command pamixer "Optional: needed for PulseAudio volume controls"
check_command playerctl "Optional: needed for media controls"
check_command wtype "Optional: needed for Wayland keyboard automation"

echo ""
echo "Suggested verification"
echo "  nix develop -c pnpm run dev"
echo "  pnpm run device:doctor"
