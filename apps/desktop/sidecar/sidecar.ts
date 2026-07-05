import readline from 'node:readline'
import { createDeviceRuntime } from './src/runtime/deviceRuntime.ts'
import { logger } from './src/utils/logger.ts'

type SidecarRequest = {
  id?: string | number
  method?: string
}

const runtime = createDeviceRuntime()

function writeResponse(id: SidecarRequest['id'], result: unknown): void {
  process.stdout.write(`${JSON.stringify({ id, result })}\n`)
}

function writeError(id: SidecarRequest['id'], message: string): void {
  process.stdout.write(`${JSON.stringify({ id, error: message })}\n`)
}

async function handleRequest(request: SidecarRequest): Promise<void> {
  switch (request.method) {
    case 'ping':
      writeResponse(request.id, { ok: true })
      return
    case 'status':
      writeResponse(request.id, { state: runtime.getConnectionState() })
      return
    case 'stop':
      await runtime.stop()
      writeResponse(request.id, { ok: true })
      process.exit(0)
      return
    default:
      writeError(request.id, `Unknown method: ${request.method ?? '(missing)'}`)
  }
}

async function main() {
  try {
    await runtime.start()
    runtime.setupExitHandlers()

    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    })

    rl.on('line', (line) => {
      void (async () => {
        try {
          const request = JSON.parse(line) as SidecarRequest
          await handleRequest(request)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          writeError(undefined, message)
        }
      })()
    })

    logger.info('Loupedeck sidecar is ready')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to start sidecar: ${message}`)
    await runtime.stop()
    process.exit(1)
  }
}

main()
