#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TEMPLATE_FILE="$PROJECT_DIR/loupedeck-tray.desktop.template"
DESKTOP_FILE="$PROJECT_DIR/loupedeck-tray.desktop"
AUTOSTART_DIR="$HOME/.config/autostart"
AUTOSTART_FILE="$AUTOSTART_DIR/loupedeck-tray.desktop"

# Function to display usage
usage() {
    echo -e "${BLUE}Loupedeck Tray Autostart Manager${NC}\n"
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  setup       Generate desktop file only (no installation)"
    echo "  enable      Enable autostart"
    echo "  disable     Disable autostart"
    echo "  status      Show autostart status"
    echo ""
    exit 1
}

# Function to generate desktop file
generate_desktop_file() {
    echo -e "${GREEN}=== Generating Desktop File ===${NC}\n"

    # Get npx path
    NPX_PATH=$(which npx)
    if [ -z "$NPX_PATH" ]; then
        echo -e "${RED}Error: npx not found in PATH${NC}"
        exit 1
    fi

    echo "Detected configuration:"
    echo "  Project directory: $PROJECT_DIR"
    echo "  npx path: $NPX_PATH"
    echo ""

    if [ ! -f "$TEMPLATE_FILE" ]; then
        echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
        exit 1
    fi

    # Replace placeholders
    sed -e "s|{{WORKING_DIR}}|$PROJECT_DIR|g" \
        -e "s|{{NPX_PATH}}|$NPX_PATH|g" \
        "$TEMPLATE_FILE" > "$DESKTOP_FILE"

    echo -e "${GREEN}✓ Desktop file generated: $DESKTOP_FILE${NC}\n"
}

# Function to check if autostart is enabled
is_autostart_enabled() {
    [ -f "$AUTOSTART_FILE" ]
}

# Command: setup
cmd_setup() {
    generate_desktop_file

    echo -e "${YELLOW}Desktop file generated but autostart not enabled.${NC}"
    echo -e "To enable autostart, run: ${GREEN}$0 enable${NC}\n"
}

# Command: enable
cmd_enable() {
    # Generate desktop file if it doesn't exist
    if [ ! -f "$DESKTOP_FILE" ]; then
        generate_desktop_file
    fi

    echo -e "${GREEN}=== Enabling Autostart ===${NC}\n"

    # Create autostart directory if it doesn't exist
    if [ ! -d "$AUTOSTART_DIR" ]; then
        echo "Creating autostart directory..."
        mkdir -p "$AUTOSTART_DIR"
        echo -e "${GREEN}✓ Autostart directory created${NC}\n"
    fi

    # Copy desktop file to autostart directory
    echo "Copying desktop file to autostart directory..."
    cp "$DESKTOP_FILE" "$AUTOSTART_FILE"
    echo -e "${GREEN}✓ Desktop file copied${NC}\n"

    echo -e "${GREEN}=== Autostart Enabled ===${NC}\n"
    echo "The tray application will start automatically when you log in."
    echo ""
    echo "To start the tray application now, run:"
    echo -e "  ${YELLOW}npm run tray${NC}\n"
}

# Command: disable
cmd_disable() {
    if ! is_autostart_enabled; then
        echo -e "${YELLOW}Autostart is not enabled.${NC}"
        exit 0
    fi

    echo -e "${GREEN}=== Disabling Autostart ===${NC}\n"

    echo "Removing autostart entry..."
    rm "$AUTOSTART_FILE"
    echo -e "${GREEN}✓ Autostart entry removed${NC}\n"

    echo -e "${GREEN}=== Autostart Disabled ===${NC}\n"
    echo "The tray application will no longer start automatically."
}

# Command: status
cmd_status() {
    echo -e "${BLUE}=== Autostart Status ===${NC}\n"

    if is_autostart_enabled; then
        echo -e "${GREEN}Autostart is ENABLED${NC}"
        echo ""
        echo "Desktop file location:"
        echo "  $AUTOSTART_FILE"
        echo ""
        echo "To disable, run:"
        echo -e "  ${YELLOW}$0 disable${NC}\n"
    else
        echo -e "${YELLOW}Autostart is DISABLED${NC}"
        echo ""
        echo "To enable, run:"
        echo -e "  ${YELLOW}$0 enable${NC}\n"
    fi
}

# Main script
if [ $# -eq 0 ]; then
    usage
fi

COMMAND=$1

case "$COMMAND" in
    setup)
        cmd_setup
        ;;
    enable)
        cmd_enable
        ;;
    disable)
        cmd_disable
        ;;
    status)
        cmd_status
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$COMMAND'${NC}\n"
        usage
        ;;
esac
