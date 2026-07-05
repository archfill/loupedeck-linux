import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')
const versionArg = process.argv[2]
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(rootDir, relativePath), content)
}

function updateJsonVersion(relativePath, version) {
  const filePath = path.join(rootDir, relativePath)
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  json.version = version
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`)
}

function replaceOnce(relativePath, pattern, replacement) {
  const content = readText(relativePath)

  if (!pattern.test(content)) {
    throw new Error(`No version field matched in ${relativePath}`)
  }

  const updated = content.replace(pattern, replacement)

  if (updated !== content) {
    writeText(relativePath, updated)
  }
}

function packageVersion() {
  return JSON.parse(readText('package.json')).version
}

const version = versionArg ?? packageVersion()

if (!semverPattern.test(version)) {
  throw new Error(`Invalid semver version: ${version}`)
}

for (const relativePath of [
  'package.json',
  'apps/desktop/package.json',
  'apps/desktop/frontend/package.json',
  'apps/desktop/sidecar/package.json',
]) {
  updateJsonVersion(relativePath, version)
}

replaceOnce('apps/desktop/src-tauri/Cargo.toml', /^version = ".+"$/m, `version = "${version}"`)
replaceOnce('apps/desktop/src-tauri/Cargo.lock', /(^name = "loupedeck-linux-desktop"\nversion = )".+"/m, `$1"${version}"`)
replaceOnce('apps/desktop/src-tauri/tauri.conf.json', /("version": )"[^"]+"/, `$1"${version}"`)
replaceOnce('nix/package.nix', /(\n  version = )"[^"]+"/, `$1"${version}"`)

console.log(`Synced version ${version}`)
