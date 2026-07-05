import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const resourcesRoot = path.join(root, 'apps', 'desktop', 'src-tauri', 'resources')
const sidecarResourcesRoot = path.join(resourcesRoot, 'apps', 'desktop', 'sidecar')
const binResourcesRoot = path.join(resourcesRoot, 'bin')

function copyDirectory(source, destination) {
  fs.rmSync(destination, { force: true, recursive: true })
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.cpSync(source, destination, {
    dereference: true,
    errorOnExist: false,
    force: true,
    recursive: true,
  })
}

function copyNodeRuntime() {
  const nodeSource = fs.realpathSync(process.execPath)
  const nodeDestination = path.join(binResourcesRoot, 'node')

  fs.mkdirSync(binResourcesRoot, { recursive: true })
  fs.copyFileSync(nodeSource, nodeDestination)
  fs.chmodSync(nodeDestination, 0o755)
}

function pruneNativePrebuilds(nodeModulesRoot) {
  const serialportPrebuildsRoot = path.join(
    nodeModulesRoot,
    '.pnpm',
    '@serialport+bindings-cpp@13.0.0',
    'node_modules',
    '@serialport',
    'bindings-cpp',
    'prebuilds'
  )

  if (!fs.existsSync(serialportPrebuildsRoot)) {
    return
  }

  for (const entry of fs.readdirSync(serialportPrebuildsRoot)) {
    const entryPath = path.join(serialportPrebuildsRoot, entry)
    if (entry !== 'linux-x64') {
      fs.rmSync(entryPath, { force: true, recursive: true })
      continue
    }

    for (const binary of fs.readdirSync(entryPath)) {
      if (!binary.endsWith('.glibc.node')) {
        fs.rmSync(path.join(entryPath, binary), { force: true })
      }
    }
  }
}

fs.rmSync(resourcesRoot, { force: true, recursive: true })

copyDirectory(
  path.join(root, 'apps', 'desktop', 'sidecar', 'dist'),
  path.join(sidecarResourcesRoot, 'dist')
)
copyDirectory(
  path.join(root, 'apps', 'desktop', 'sidecar', 'config'),
  path.join(sidecarResourcesRoot, 'config')
)
copyNodeRuntime()

execFileSync(
  process.execPath,
  [
    path.join(root, 'nix', 'copy-sidecar-node-modules.mjs'),
    root,
    path.join(resourcesRoot, 'node_modules'),
  ],
  {
    cwd: root,
    stdio: 'inherit',
  }
)

pruneNativePrebuilds(path.join(resourcesRoot, 'node_modules'))

console.log(`Prepared AppImage resources in ${path.relative(root, resourcesRoot)}`)
