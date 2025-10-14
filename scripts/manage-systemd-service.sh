#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service name
SERVICE_NAME="loupedeck"
SERVICE_FILE="${SERVICE_NAME}.service"

# Get current directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TEMPLATE_FILE="$PROJECT_DIR/${SERVICE_FILE}.template"
GENERATED_FILE="$PROJECT_DIR/$SERVICE_FILE"
SYSTEM_SERVICE_FILE="/etc/systemd/system/$SERVICE_FILE"

# Function to display usage
usage() {
    echo -e "${BLUE}Loupedeck Linux systemd Service Manager${NC}\n"
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  setup       Generate service file only (no installation)"
    echo "  install     Generate, copy, enable and start the service"
    echo "  uninstall   Stop, disable and remove the service"
    echo "  enable      Enable and start the service"
    echo "  disable     Disable and stop the service"
    echo "  start       Start the service"
    echo "  stop        Stop the service"
    echo "  restart     Restart the service"
    echo "  status      Show service status"
    echo "  logs        Show service logs (follow mode)"
    echo ""
    exit 1
}

# Function to generate service file
generate_service_file() {
    echo -e "${GREEN}=== Generating Service File ===${NC}\n"

    # Get current user
    CURRENT_USER=$(whoami)

    # Get npx path
    NPX_PATH=$(which npx)
    if [ -z "$NPX_PATH" ]; then
        echo -e "${RED}Error: npx not found in PATH${NC}"
        exit 1
    fi

    echo "Detected configuration:"
    echo "  User: $CURRENT_USER"
    echo "  Project directory: $PROJECT_DIR"
    echo "  npx path: $NPX_PATH"
    echo ""

    if [ ! -f "$TEMPLATE_FILE" ]; then
        echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
        exit 1
    fi

    # Replace placeholders
    sed -e "s|{{USER}}|$CURRENT_USER|g" \
        -e "s|{{WORKING_DIR}}|$PROJECT_DIR|g" \
        -e "s|{{NPX_PATH}}|$NPX_PATH|g" \
        "$TEMPLATE_FILE" > "$GENERATED_FILE"

    echo -e "${GREEN}✓ Service file generated: $GENERATED_FILE${NC}\n"
}

# Function to check if service file exists in system
service_installed() {
    [ -f "$SYSTEM_SERVICE_FILE" ]
}

# Function to check if service is enabled
service_enabled() {
    systemctl is-enabled "$SERVICE_NAME" &>/dev/null
}

# Function to check if service is active
service_active() {
    systemctl is-active "$SERVICE_NAME" &>/dev/null
}

# Command: setup
cmd_setup() {
    generate_service_file

    echo -e "${YELLOW}Service file generated but not installed.${NC}"
    echo -e "To install, run: ${GREEN}$0 install${NC}\n"
}

# Command: install
cmd_install() {
    # Generate service file if it doesn't exist
    if [ ! -f "$GENERATED_FILE" ]; then
        generate_service_file
    fi

    echo -e "${GREEN}=== Installing Service ===${NC}\n"

    # Copy service file
    echo "Copying service file to systemd directory..."
    sudo cp "$GENERATED_FILE" "$SYSTEM_SERVICE_FILE"
    echo -e "${GREEN}✓ Service file copied${NC}\n"

    # Reload systemd
    echo "Reloading systemd daemon..."
    sudo systemctl daemon-reload
    echo -e "${GREEN}✓ Systemd daemon reloaded${NC}\n"

    # Enable service
    echo "Enabling service..."
    sudo systemctl enable "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service enabled${NC}\n"

    # Start service
    echo "Starting service..."
    sudo systemctl start "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service started${NC}\n"

    echo -e "${GREEN}=== Installation Complete ===${NC}\n"
    echo "The service is now running and will start automatically on boot."
    echo ""
    cmd_status
}

# Command: uninstall
cmd_uninstall() {
    if ! service_installed; then
        echo -e "${YELLOW}Service is not installed.${NC}"
        exit 0
    fi

    echo -e "${GREEN}=== Uninstalling Service ===${NC}\n"

    # Stop service if running
    if service_active; then
        echo "Stopping service..."
        sudo systemctl stop "$SERVICE_NAME"
        echo -e "${GREEN}✓ Service stopped${NC}\n"
    fi

    # Disable service if enabled
    if service_enabled; then
        echo "Disabling service..."
        sudo systemctl disable "$SERVICE_NAME"
        echo -e "${GREEN}✓ Service disabled${NC}\n"
    fi

    # Remove service file
    echo "Removing service file..."
    sudo rm "$SYSTEM_SERVICE_FILE"
    echo -e "${GREEN}✓ Service file removed${NC}\n"

    # Reload systemd
    echo "Reloading systemd daemon..."
    sudo systemctl daemon-reload
    echo -e "${GREEN}✓ Systemd daemon reloaded${NC}\n"

    echo -e "${GREEN}=== Uninstallation Complete ===${NC}\n"
    echo "The service has been completely removed."
}

# Command: enable
cmd_enable() {
    if ! service_installed; then
        echo -e "${RED}Error: Service is not installed. Run '$0 install' first.${NC}"
        exit 1
    fi

    echo "Enabling service..."
    sudo systemctl enable "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service enabled${NC}\n"

    echo "Starting service..."
    sudo systemctl start "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service started${NC}\n"

    cmd_status
}

# Command: disable
cmd_disable() {
    if ! service_installed; then
        echo -e "${RED}Error: Service is not installed.${NC}"
        exit 1
    fi

    echo "Stopping service..."
    sudo systemctl stop "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service stopped${NC}\n"

    echo "Disabling service..."
    sudo systemctl disable "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service disabled${NC}\n"

    cmd_status
}

# Command: start
cmd_start() {
    if ! service_installed; then
        echo -e "${RED}Error: Service is not installed. Run '$0 install' first.${NC}"
        exit 1
    fi

    echo "Starting service..."
    sudo systemctl start "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service started${NC}\n"

    cmd_status
}

# Command: stop
cmd_stop() {
    if ! service_installed; then
        echo -e "${RED}Error: Service is not installed.${NC}"
        exit 1
    fi

    echo "Stopping service..."
    sudo systemctl stop "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service stopped${NC}\n"

    cmd_status
}

# Command: restart
cmd_restart() {
    if ! service_installed; then
        echo -e "${RED}Error: Service is not installed. Run '$0 install' first.${NC}"
        exit 1
    fi

    echo "Restarting service..."
    sudo systemctl restart "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service restarted${NC}\n"

    cmd_status
}

# Command: status
cmd_status() {
    if ! service_installed; then
        echo -e "${YELLOW}Service is not installed.${NC}"
        exit 0
    fi

    sudo systemctl status "$SERVICE_NAME" --no-pager
}

# Command: logs
cmd_logs() {
    if ! service_installed; then
        echo -e "${RED}Error: Service is not installed.${NC}"
        exit 1
    fi

    echo -e "${BLUE}Following service logs (Ctrl+C to exit)...${NC}\n"
    sudo journalctl -u "$SERVICE_NAME" -f
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
    install)
        cmd_install
        ;;
    uninstall)
        cmd_uninstall
        ;;
    enable)
        cmd_enable
        ;;
    disable)
        cmd_disable
        ;;
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$COMMAND'${NC}\n"
        usage
        ;;
esac
