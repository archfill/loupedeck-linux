import fs from 'node:fs'
import path from 'node:path'

const [sourceRoot, outputNodeModules] = process.argv.slice(2)

if (!sourceRoot || !outputNodeModules) {
  console.error('Usage: copy-sidecar-node-modules.mjs <source-root> <output-node-modules>')
  process.exit(1)
}

const root = path.resolve(sourceRoot)
const sourceNodeModules = path.join(root, 'node_modules')
const sourcePnpmStore = path.join(sourceNodeModules, '.pnpm')
const sidecarRoot = path.join(root, 'apps', 'desktop', 'sidecar')
const sidecarNodeModules = path.join(sidecarRoot, 'node_modules')
const sidecarPackageJson = JSON.parse(
  fs.readFileSync(path.join(sidecarRoot, 'package.json'), 'utf8')
)

const packageDirs = new Set()
const topLevelLinks = new Map()

function dependencyPath(baseDir, name) {
  if (name.startsWith('@')) {
    const [scope, packageName] = name.split('/')
    return path.join(baseDir, scope, packageName)
  }

  return path.join(baseDir, name)
}

function pnpmPackageDirFor(realPath) {
  const relative = path.relative(sourcePnpmStore, realPath)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }

  const parts = relative.split(path.sep)
  const nodeModulesIndex = parts.indexOf('node_modules')

  if (nodeModulesIndex <= 0) {
    return null
  }

  return parts[0]
}

function collectPackageLinks(packageDir) {
  const nodeModules = path.join(sourcePnpmStore, packageDir, 'node_modules')

  if (!fs.existsSync(nodeModules)) {
    return
  }

  for (const entry of fs.readdirSync(nodeModules)) {
    if (entry.startsWith('.')) {
      continue
    }

    if (entry.startsWith('@')) {
      const scopeDir = path.join(nodeModules, entry)
      if (!fs.statSync(scopeDir).isDirectory()) {
        continue
      }

      for (const scopedEntry of fs.readdirSync(scopeDir)) {
        collectLink(path.join(scopeDir, scopedEntry))
      }

      continue
    }

    collectLink(path.join(nodeModules, entry))
  }
}

function collectLink(linkPath) {
  if (!fs.existsSync(linkPath) || !fs.lstatSync(linkPath).isSymbolicLink()) {
    return null
  }

  const realPath = fs.realpathSync(linkPath)
  const packageDir = pnpmPackageDirFor(realPath)

  if (!packageDir || packageDirs.has(packageDir)) {
    return packageDir
  }

  packageDirs.add(packageDir)
  collectPackageLinks(packageDir)

  return packageDir
}

for (const dependency of Object.keys(sidecarPackageJson.dependencies ?? {})) {
  const linkPath = dependencyPath(sidecarNodeModules, dependency)
  const packageDir = collectLink(linkPath)

  if (!packageDir) {
    throw new Error(`Could not resolve sidecar dependency ${dependency}`)
  }

  topLevelLinks.set(dependency, path.join('.pnpm', packageDir, 'node_modules', dependency))
}

fs.rmSync(outputNodeModules, { force: true, recursive: true })
fs.mkdirSync(path.join(outputNodeModules, '.pnpm'), { recursive: true })

for (const packageDir of [...packageDirs].sort()) {
  fs.cpSync(
    path.join(sourcePnpmStore, packageDir),
    path.join(outputNodeModules, '.pnpm', packageDir),
    {
      dereference: false,
      recursive: true,
      verbatimSymlinks: true,
    }
  )
}

for (const [dependency, target] of [...topLevelLinks].sort()) {
  const linkPath = dependencyPath(outputNodeModules, dependency)
  fs.mkdirSync(path.dirname(linkPath), { recursive: true })
  fs.symlinkSync(target, linkPath)
}

console.log(`Copied ${packageDirs.size} sidecar runtime packages`)
