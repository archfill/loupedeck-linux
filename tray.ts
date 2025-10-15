#!/usr/bin/env tsx

import SysTray from 'systray'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Service name
const SERVICE_NAME = 'loupedeck'
const WEB_UI_URL = 'http://localhost:3000'

// Icon paths
const ICON_PATH = path.join(__dirname, 'assets', 'tray', 'icon.png')
// Reserved for future use
// const ICON_ACTIVE = path.join(__dirname, 'assets', 'tray', 'icon-active.png')
// const ICON_INACTIVE = path.join(__dirname, 'assets', 'tray', 'icon-inactive.png')

interface MenuItem {
  title: string
  tooltip: string
  checked: boolean
  enabled: boolean
  click?: () => void
}

interface SysTrayConfig {
  menu: {
    icon: string
    title: string
    tooltip: string
    items: MenuItem[]
  }
}

class LoupedeckTray {
  private systray: SysTray
  private isServiceRunning = false
  private checkInterval: NodeJS.Timeout | null = null

  constructor() {
    this.systray = new SysTray({
      menu: this.buildMenu(),
      debug: false,
      copyDir: true,
    })

    this.systray.onClick((action: { seq_id: number }) => {
      this.handleMenuClick(action.seq_id)
    })

    // Check service status periodically
    this.startStatusCheck()
  }

  private buildMenu(): SysTrayConfig['menu'] {
    return {
      icon: ICON_PATH,
      title: 'Loupedeck',
      tooltip: 'Loupedeck Controller',
      items: [
        {
          title: 'Service Status',
          tooltip: 'Current service status',
          checked: false,
          enabled: false,
        },
        {
          title: this.isServiceRunning ? '  ● Running' : '  ○ Stopped',
          tooltip: this.isServiceRunning ? 'Service is running' : 'Service is stopped',
          checked: false,
          enabled: false,
        },
        {
          title: '---',
          tooltip: '',
          checked: false,
          enabled: true,
        },
        {
          title: 'Start Service',
          tooltip: 'Start the Loupedeck service',
          checked: false,
          enabled: !this.isServiceRunning,
        },
        {
          title: 'Stop Service',
          tooltip: 'Stop the Loupedeck service',
          checked: false,
          enabled: this.isServiceRunning,
        },
        {
          title: 'Restart Service',
          tooltip: 'Restart the Loupedeck service',
          checked: false,
          enabled: this.isServiceRunning,
        },
        {
          title: '---',
          tooltip: '',
          checked: false,
          enabled: true,
        },
        {
          title: 'Open Web UI',
          tooltip: 'Open web interface in browser',
          checked: false,
          enabled: this.isServiceRunning,
        },
        {
          title: 'View Logs',
          tooltip: 'View service logs',
          checked: false,
          enabled: true,
        },
        {
          title: '---',
          tooltip: '',
          checked: false,
          enabled: true,
        },
        {
          title: 'Quit',
          tooltip: 'Exit tray application',
          checked: false,
          enabled: true,
        },
      ],
    }
  }

  private async handleMenuClick(seqId: number): Promise<void> {
    // Menu item indices (0-based)
    const MENU_START = 3
    const MENU_STOP = 4
    const MENU_RESTART = 5
    const MENU_WEB_UI = 7
    const MENU_LOGS = 8
    const MENU_QUIT = 10

    try {
      switch (seqId) {
        case MENU_START:
          await this.startService()
          break
        case MENU_STOP:
          await this.stopService()
          break
        case MENU_RESTART:
          await this.restartService()
          break
        case MENU_WEB_UI:
          await this.openWebUI()
          break
        case MENU_LOGS:
          await this.viewLogs()
          break
        case MENU_QUIT:
          this.quit()
          break
      }
    } catch (error) {
      console.error('Error handling menu click:', error)
    }
  }

  private async checkServiceStatus(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`systemctl is-active ${SERVICE_NAME}`)
      return stdout.trim() === 'active'
    } catch {
      return false
    }
  }

  private startStatusCheck(): void {
    // Check immediately
    this.updateServiceStatus()

    // Check every 5 seconds
    this.checkInterval = setInterval(() => {
      this.updateServiceStatus()
    }, 5000)
  }

  private async updateServiceStatus(): Promise<void> {
    const wasRunning = this.isServiceRunning
    this.isServiceRunning = await this.checkServiceStatus()

    if (wasRunning !== this.isServiceRunning) {
      // Status changed, update menu
      this.systray.sendAction({
        type: 'update-menu',
        menu: this.buildMenu(),
      })
    }
  }

  private async startService(): Promise<void> {
    console.log('Starting service...')
    try {
      await execAsync(`systemctl start ${SERVICE_NAME}`)
      console.log('Service started')
      setTimeout(() => this.updateServiceStatus(), 1000)
    } catch (error) {
      console.error('Failed to start service:', error)
    }
  }

  private async stopService(): Promise<void> {
    console.log('Stopping service...')
    try {
      await execAsync(`systemctl stop ${SERVICE_NAME}`)
      console.log('Service stopped')
      setTimeout(() => this.updateServiceStatus(), 1000)
    } catch (error) {
      console.error('Failed to stop service:', error)
    }
  }

  private async restartService(): Promise<void> {
    console.log('Restarting service...')
    try {
      await execAsync(`systemctl restart ${SERVICE_NAME}`)
      console.log('Service restarted')
      setTimeout(() => this.updateServiceStatus(), 1000)
    } catch (error) {
      console.error('Failed to restart service:', error)
    }
  }

  private async openWebUI(): Promise<void> {
    console.log('Opening web UI...')
    try {
      // Try xdg-open first (standard on Linux)
      await execAsync(`xdg-open ${WEB_UI_URL}`)
    } catch (error) {
      console.error('Failed to open web UI:', error)
    }
  }

  private async viewLogs(): Promise<void> {
    console.log('Opening logs...')
    try {
      // Open logs in default terminal
      const terminals = [
        'gnome-terminal -- journalctl -u loupedeck -f',
        'konsole -e journalctl -u loupedeck -f',
        'xterm -e journalctl -u loupedeck -f',
      ]

      for (const terminal of terminals) {
        try {
          await execAsync(terminal)
          return
        } catch {
          continue
        }
      }

      console.error('No suitable terminal found')
    } catch (error) {
      console.error('Failed to open logs:', error)
    }
  }

  private quit(): void {
    console.log('Quitting tray application...')
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    this.systray.kill()
    process.exit(0)
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('Received SIGINT, exiting...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, exiting...')
  process.exit(0)
})

// Start the tray application
console.log('Starting Loupedeck tray application...')
// Keep reference to prevent garbage collection
new LoupedeckTray()
console.log('Tray application started. Press Ctrl+C to exit.')
