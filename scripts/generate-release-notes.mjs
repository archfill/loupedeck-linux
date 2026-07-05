import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')
const defaultOutput = path.join(rootDir, 'dist', 'release', 'RELEASE_NOTES.md')

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--') {
      continue
    }

    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`)
    }

    const key = arg.slice(2)
    const value = argv[index + 1]

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }

    args[key] = value
    index += 1
  }

  return args
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'))
}

function readOptionalText(relativePath) {
  const filePath = path.join(rootDir, relativePath)

  if (!fs.existsSync(filePath)) {
    return null
  }

  return fs.readFileSync(filePath, 'utf8').trim()
}

function changelogSection(version) {
  const changelog = readOptionalText('CHANGELOG.md')

  if (!changelog) {
    return null
  }

  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const headingPattern = new RegExp(
    `^## \\[?v?${escapedVersion}\\]?(?:\\s+-\\s+\\d{4}-\\d{2}-\\d{2})?\\s*$`,
    'im'
  )
  const match = headingPattern.exec(changelog)

  if (!match) {
    return null
  }

  const sectionStart = match.index + match[0].length
  const rest = changelog.slice(sectionStart)
  const nextHeading = rest.search(/^##\s+/m)
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading)

  return section.trim()
}

function git(args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

function tryGit(args) {
  try {
    return git(args)
  } catch {
    return null
  }
}

function currentDate() {
  return new Date().toISOString().slice(0, 10)
}

function previousTag(tag) {
  const described = tryGit(['describe', '--tags', '--abbrev=0', `${tag}^{commit}^`])

  if (described) {
    return described
  }

  const tags = tryGit(['tag', '--sort=-creatordate'])

  if (!tags) {
    return null
  }

  return tags
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .find((candidate) => candidate !== tag)
}

function commitRange(tag, previous) {
  if (!previous) {
    return null
  }

  return `${previous}..${tag}`
}

function commitsForRange(range) {
  if (!range) {
    return []
  }

  const output = tryGit(['log', '--pretty=format:%h%x09%s', range])

  if (!output) {
    return []
  }

  return output
    .split('\n')
    .map((line) => {
      const [shortSha, ...subjectParts] = line.split('\t')
      return {
        shortSha,
        subject: subjectParts.join('\t'),
      }
    })
    .filter((commit) => commit.shortSha && commit.subject)
}

function commitCategory(subject) {
  if (/^feat(?:\(.+\))?:/.test(subject)) {
    return 'Features'
  }

  if (/^fix(?:\(.+\))?:/.test(subject)) {
    return 'Fixes'
  }

  if (/^docs(?:\(.+\))?:/.test(subject)) {
    return 'Documentation'
  }

  if (/^(ci|build)(?:\(.+\))?:/.test(subject)) {
    return 'Build and CI'
  }

  if (/^chore(?:\(.+\))?:/.test(subject)) {
    return 'Maintenance'
  }

  return 'Other changes'
}

function groupedCommits(commits) {
  const groups = new Map()

  for (const commit of commits) {
    const category = commitCategory(commit.subject)
    const items = groups.get(category) ?? []
    items.push(commit)
    groups.set(category, items)
  }

  return groups
}

function formatCommitGroups(commits) {
  if (commits.length === 0) {
    return '- No previous release tag was available for comparison.'
  }

  const preferredOrder = [
    'Features',
    'Fixes',
    'Documentation',
    'Build and CI',
    'Maintenance',
    'Other changes',
  ]
  const groups = groupedCommits(commits)
  const sections = []

  for (const category of preferredOrder) {
    const items = groups.get(category)

    if (!items?.length) {
      continue
    }

    sections.push(`#### ${category}`)
    sections.push('')
    sections.push(...items.map((commit) => `- ${commit.subject} (${commit.shortSha})`))
    sections.push('')
  }

  return sections.join('\n').trim()
}

function releaseBody({
  tag,
  version,
  date,
  previous,
  commits,
  releaseNotes,
  appImageName,
  checksumName,
  commitSha,
  workflowUrl,
}) {
  const compareLine = previous ? `Changes since \`${previous}\`.` : 'Initial tagged release.'
  const workflowLine = workflowUrl ? `- Workflow run: ${workflowUrl}` : null

  return [
    `## loupedeck-linux ${tag}`,
    '',
    `Released on ${date}. ${compareLine}`,
    '',
    releaseNotes ?? '- No changelog or manual release notes were provided.',
    '',
    '### Download',
    '',
    `Download the AppImage asset below:`,
    '',
    `- \`${appImageName}\``,
    '',
    'Optional checksum:',
    '',
    `- \`${checksumName}\``,
    '',
    '### Install / Run',
    '',
    '```sh',
    `chmod +x ${appImageName}`,
    `./${appImageName}`,
    '```',
    '',
    '### Verify',
    '',
    '```sh',
    `sha256sum -c ${checksumName}`,
    '```',
    '',
    '### Linux Device Permissions',
    '',
    'Device access may require udev / USB permissions depending on your Linux distribution.',
    '',
    '### Nix Users',
    '',
    'Nix users should use the repository flake / Nix package instead of downloading a release asset.',
    '',
    '### Changes',
    '',
    formatCommitGroups(commits),
    '',
    '### Build Metadata',
    '',
    `- Version: \`${version}\``,
    `- Commit: \`${commitSha}\``,
    workflowLine,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

const args = parseArgs(process.argv.slice(2))
const packageVersion = readJson('package.json').version
const tag = args.tag ?? process.env.GITHUB_REF_NAME ?? `v${packageVersion}`
const version = tag.startsWith('v') ? tag.slice(1) : tag

if (version !== packageVersion) {
  throw new Error(`Tag version ${version} does not match package.json version ${packageVersion}`)
}

const outputPath = path.resolve(rootDir, args.output ?? defaultOutput)
const previous = args.previous ?? previousTag(tag)
const range = commitRange(tag, previous)
const commits = commitsForRange(range)
const shortSha =
  tryGit(['rev-parse', '--short=12', `${tag}^{}`]) ??
  process.env.GITHUB_SHA?.slice(0, 12) ??
  'unknown'
const releaseNotes =
  changelogSection(version) ?? readOptionalText(path.join('docs', 'release-notes', `${tag}.md`))
const appImageName = `loupedeck-linux-${version}-x86_64.AppImage`
const checksumName = `${appImageName}.sha256`
const workflowUrl =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(
  outputPath,
  `${releaseBody({
    tag,
    version,
    date: currentDate(),
    previous,
    commits,
    releaseNotes,
    appImageName,
    checksumName,
    commitSha: shortSha,
    workflowUrl,
  })}\n`
)

console.log(`Generated release notes for ${tag}: ${path.relative(rootDir, outputPath)}`)
