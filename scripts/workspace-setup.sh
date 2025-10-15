#!/bin/bash

# =============================================================================
# Workspace Setup Script
# =============================================================================
# Sets up the workspace layout without modifying Hyprland config files
#
# Layout:
#   Workspace 1 (Main Monitor - DP-3):
#     - Left half: ghostty (terminal)
#     - Right half: Google Chrome
#   Workspace 6 (Sub Monitor - HDMI-A-1):
#     - Firefox
# =============================================================================

echo "🚀 Starting workspace setup..."

# -----------------------------------------------------------------------------
# Workspace 1: Main Monitor (DP-3, 3440x1440)
# -----------------------------------------------------------------------------

echo "📍 Setting up Workspace 1..."
hyprctl dispatch workspace 1

# Launch ghostty (terminal) on the left half
echo "  🖥️  Launching ghostty (left half)..."
setsid ghostty >/dev/null 2>&1 &
sleep 1.5

# Resize and move ghostty to left half
hyprctl dispatch resizeactive exact 1720 1440
hyprctl dispatch moveactive exact 0 0

# Launch Chrome on the right half
echo "  🌐 Launching Chrome (right half)..."
setsid google-chrome-stable >/dev/null 2>&1 &
sleep 2

# Resize and move Chrome to right half
hyprctl dispatch resizeactive exact 1720 1440
hyprctl dispatch moveactive exact 1720 0

# -----------------------------------------------------------------------------
# Workspace 6: Sub Monitor (HDMI-A-1, 1920x1080 portrait)
# -----------------------------------------------------------------------------

echo "📍 Setting up Workspace 6..."
# Move workspace 6 to HDMI-A-1 (sub monitor) if not already there
hyprctl dispatch moveworkspacetomonitor 6 HDMI-A-1
sleep 0.5

# Switch to workspace 6
hyprctl dispatch workspace 6
sleep 0.5

# Launch Firefox (fullscreen on sub monitor)
echo "  🦊 Launching Firefox..."
setsid firefox >/dev/null 2>&1 &
sleep 2

# Make sure Firefox is on workspace 6 and maximize it
hyprctl dispatch focuswindow firefox
sleep 0.5
hyprctl dispatch fullscreen 1

# -----------------------------------------------------------------------------
# Return to Workspace 1
# -----------------------------------------------------------------------------

echo "📍 Returning to Workspace 1..."
sleep 0.5
hyprctl dispatch workspace 1

echo "✅ Workspace setup complete!"
