#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service name and file
SERVICE_NAME="loupedeck"
SERVICE_FILE="${SERVICE_NAME}.service"
TEMPLATE_FILE="${SERVICE_FILE}.template"

# Get current directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# User service configuration
SOURCE_FILE="$PROJECT_DIR/$TEMPLATE_FILE"
INSTALL_DIR="$HOME/.config/systemd/user"
INSTALLED_SERVICE_FILE="$INSTALL_DIR/$SERVICE_FILE"

# Function to display usage
usage() {
    echo -e "${BLUE}Loupedeck Linux systemd Service Manager${NC}\n"
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  install     Copy, enable and start the user service"
    echo "  uninstall   Stop, disable and remove the user service"
    echo "  enable      Enable and start the service"
    echo "  disable     Disable and stop the service"
    echo "  start       Start the service"
    echo "  stop        Stop the service"
    echo "  restart     Restart the service"
    echo "  status      Show service status"
    echo "  logs        Show service logs (follow mode)"
    echo ""
    echo "Examples:"
    echo "  $0 install    # Install and start the service"
    echo "  $0 status     # Check service status"
    echo "  $0 logs       # View service logs"
    echo ""
    echo "Note: This installs a user systemd service that runs when you log in."
    echo "      User services have access to GUI environment variables (DISPLAY, etc.)"
    echo ""
    exit 1
}

# Function to check if service file exists
service_installed() {
    [ -f "$INSTALLED_SERVICE_FILE" ]
}

# Function to check if service is enabled
service_enabled() {
    systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null
}

# Function to check if service is active
service_active() {
    systemctl --user is-active "$SERVICE_NAME" &>/dev/null
}

# Command: install
cmd_install() {
    # Check if pnpm is available
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}Error: pnpm is not installed or not in PATH${NC}"
        echo "Please install pnpm: npm install -g pnpm"
        exit 1
    fi

    # Verify service template file exists
    if [ ! -f "$SOURCE_FILE" ]; then
        echo -e "${RED}Error: Service template file not found: $SOURCE_FILE${NC}"
        exit 1
    fi

    echo -e "${GREEN}=== Installing Loupedeck User Service ===${NC}\n"

    # Create install directory if needed
    if [ ! -d "$INSTALL_DIR" ]; then
        echo "Creating user systemd directory..."
        mkdir -p "$INSTALL_DIR"
        echo -e "${GREEN}✓ Directory created${NC}\n"
    fi

    # Generate service file from template and replace placeholders
    echo "Generating service file from template..."
    sed "s|{{PROJECT_DIR}}|$PROJECT_DIR|g" "$SOURCE_FILE" > "$INSTALLED_SERVICE_FILE"
    echo -e "${GREEN}✓ Service file generated (PROJECT_DIR set to: $PROJECT_DIR)${NC}\n"

    # Reload systemd
    echo "Reloading systemd daemon..."
    systemctl --user daemon-reload
    echo -e "${GREEN}✓ Systemd daemon reloaded${NC}\n"

    # Enable service
    echo "Enabling service..."
    systemctl --user enable "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service enabled${NC}\n"

    # Start service
    echo "Starting service..."
    systemctl --user start "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service started${NC}\n"

    echo -e "${GREEN}=== Installation Complete ===${NC}\n"
    echo "The user service is now running and will start automatically when you log in."
    echo -e "${YELLOW}Note: The service will automatically stop when you log out.${NC}"
    echo -e "${YELLOW}      GUI environment variables are inherited from your session.${NC}"
    echo ""
    cmd_status
}

# Command: uninstall
cmd_uninstall() {
    if ! service_installed; then
        echo -e "${YELLOW}Service is not installed.${NC}"
        exit 0
    fi

    echo -e "${GREEN}=== Uninstalling Loupedeck User Service ===${NC}\n"

    # Stop service if running
    if service_active; then
        echo "Stopping service..."
        systemctl --user stop "$SERVICE_NAME"
        echo -e "${GREEN}✓ Service stopped${NC}\n"
    fi

    # Disable service if enabled
    if service_enabled; then
        echo "Disabling service..."
        systemctl --user disable "$SERVICE_NAME"
        echo -e "${GREEN}✓ Service disabled${NC}\n"
    fi

    # Remove service file
    echo "Removing service file..."
    rm "$INSTALLED_SERVICE_FILE"
    echo -e "${GREEN}✓ Service file removed${NC}\n"

    # Reload systemd
    echo "Reloading systemd daemon..."
    systemctl --user daemon-reload
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
    systemctl --user enable "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service enabled${NC}\n"

    echo "Starting service..."
    systemctl --user start "$SERVICE_NAME"
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
    systemctl --user stop "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service stopped${NC}\n"

    echo "Disabling service..."
    systemctl --user disable "$SERVICE_NAME"
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
    systemctl --user start "$SERVICE_NAME"
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
    systemctl --user stop "$SERVICE_NAME"
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
    systemctl --user restart "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service restarted${NC}\n"

    cmd_status
}

# Command: status
cmd_status() {
    if ! service_installed; then
        echo -e "${YELLOW}Service is not installed.${NC}"
        exit 0
    fi

    systemctl --user status "$SERVICE_NAME" --no-pager
}

# Command: logs
cmd_logs() {
    if ! service_installed; then
        echo -e "${RED}Error: Service is not installed.${NC}"
        exit 1
    fi

    echo -e "${BLUE}Following service logs (Ctrl+C to exit)...${NC}\n"
    journalctl --user -u "$SERVICE_NAME" -f
}

# Main script
if [ $# -eq 0 ]; then
    usage
fi

COMMAND=$1

case "$COMMAND" in
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
