import { createDeviceRuntime } from './src/runtime/deviceRuntime.ts'
import { ApiServer } from './src/server/api.ts'
import { logger } from './src/utils/logger.ts'

async function main() {
  let apiServer: ApiServer | null = null
  const runtime = createDeviceRuntime()

  try {
    apiServer = new ApiServer(9876, () => runtime.getConnectionState())
    await apiServer.start()
    await runtime.start()
    runtime.setupExitHandlers(async () => {
      if (apiServer) {
        await apiServer.stop()
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to start legacy backend: ${message}`)

    if (apiServer) {
      await apiServer.stop()
    }
    await runtime.stop()
    process.exit(1)
  }
}

main()
