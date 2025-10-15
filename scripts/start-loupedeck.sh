#!/bin/bash

# Loupedeck Linux startup script
# This script ensures proper environment variables are set for GUI app launching

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project directory
cd "$PROJECT_DIR"

# Import systemd user environment variables if not already set
if [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
    echo "Importing environment variables from systemd..."

    # Try to get environment from systemd
    eval $(systemctl --user show-environment | grep -E "^(DISPLAY|WAYLAND_DISPLAY|XDG_RUNTIME_DIR|DBUS_SESSION_BUS_ADDRESS)=" | sed 's/^/export /')
fi

# Fallback: Try to detect X11 display if still not set
if [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
    # Try common display values
    if [ -S "/tmp/.X11-unix/X0" ]; then
        export DISPLAY=:0
    elif [ -S "/tmp/.X11-unix/X1" ]; then
        export DISPLAY=:1
    fi
fi

# Fallback: Try to detect Wayland display
if [ -z "$WAYLAND_DISPLAY" ] && [ -n "$XDG_RUNTIME_DIR" ]; then
    if [ -S "$XDG_RUNTIME_DIR/wayland-0" ]; then
        export WAYLAND_DISPLAY=wayland-0
    elif [ -S "$XDG_RUNTIME_DIR/wayland-1" ]; then
        export WAYLAND_DISPLAY=wayland-1
    fi
fi

# Set XDG_RUNTIME_DIR if not set
if [ -z "$XDG_RUNTIME_DIR" ]; then
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
fi

# Set DBUS_SESSION_BUS_ADDRESS if not set
if [ -z "$DBUS_SESSION_BUS_ADDRESS" ]; then
    if [ -S "$XDG_RUNTIME_DIR/bus" ]; then
        export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
    fi
fi

# Log environment for debugging
echo "Starting Loupedeck Linux with environment:"
echo "  DISPLAY=$DISPLAY"
echo "  WAYLAND_DISPLAY=$WAYLAND_DISPLAY"
echo "  XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"
echo "  DBUS_SESSION_BUS_ADDRESS=$DBUS_SESSION_BUS_ADDRESS"
echo "  NODE_ENV=${NODE_ENV:-production}"
echo "  LOG_LEVEL=${LOG_LEVEL:-info}"

# Start the application
exec npm start
