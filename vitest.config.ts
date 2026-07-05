import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['apps/desktop/sidecar/src/**/*.test.ts'],
  },
})
