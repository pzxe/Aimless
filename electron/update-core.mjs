// Pure update logic shared by the Electron main process (dynamic import), the web build and the tests.
// No Electron, Node or DOM APIs here.

export const REPO = { owner: 'pzxe', name: 'Aimless' }
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/releases/latest`
export const RELEASES_PAGE = `https://github.com/${REPO.owner}/${REPO.name}/releases/latest`

/** Hosts GitHub serves release assets from. Downloads from anywhere else are refused. */
const TRUSTED_HOSTS = new Set(['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com'])
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]'])

/**
 * Parses `v1.2.3`, `1.2.3` or `1.2.3-beta.1+build` (semver 2.0.0). Returns null if it is not a version.
 * @returns {{major:number,minor:number,patch:number,pre:(string|number)[]}|null}
 */
export function parseVersion(input) {
  if (typeof input !== 'string') return null
  const m = input.trim().match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/)
  if (!m) return null
  const pre = m[4] ? m[4].split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : []
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre }
}

/** Semver precedence: -1 if a < b, 0 if equal, 1 if a > b. Throws on an invalid version. */
export function compareVersions(a, b) {
  const x = parseVersion(a)
  const y = parseVersion(b)
  if (!x || !y) throw new Error(`invalid version: ${!x ? a : b}`)
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1
  if (x.pre.length === 0 && y.pre.length === 0) return 0
  if (x.pre.length === 0) return 1 // a release is newer than its own pre-release
  if (y.pre.length === 0) return -1
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i]
    const q = y.pre[i]
    if (p === undefined) return -1
    if (q === undefined) return 1
    if (p === q) continue
    if (typeof p === 'number' && typeof q === 'number') return p < q ? -1 : 1
    if (typeof p === 'number') return -1 // numeric identifiers sort before alphanumeric ones
    if (typeof q === 'number') return 1
    return p < q ? -1 : 1
  }
  return 0
}

/** True when `latest` is strictly newer than `current`. Invalid input is never "newer". */
export function isNewerVersion(latest, current) {
  try {
    return compareVersions(latest, current) > 0
  } catch {
    return false
  }
}

/**
 * Is this URL one we may download an update from? HTTPS on GitHub's hosts only. A loopback address
 * is accepted only when `allowLoopback` is set (the test hook in the desktop app).
 */
export function isTrustedDownloadUrl(url, { allowLoopback = false } = {}) {
  let u
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (allowLoopback && u.protocol === 'http:' && LOOPBACK.has(u.hostname)) return true
  return u.protocol === 'https:' && !u.username && !u.password && TRUSTED_HOSTS.has(u.hostname)
}

/** Which kind of install is running: the NSIS installer, the portable .exe, or the extracted ZIP folder. */
export const ASSET_PATTERNS = {
  setup: /^Aimless-v\d+\.\d+\.\d+(?:-[\w.]+)?-Setup\.exe$/i,
  portable: /^Aimless-v\d+\.\d+\.\d+(?:-[\w.]+)?-Portable\.exe$/i,
  zip: /^Aimless-v\d+\.\d+\.\d+(?:-[\w.]+)?-Windows-NoInstall\.zip$/i,
}

/**
 * Normalises a GitHub "latest release" payload. Returns null for anything unusable
 * (drafts, pre-releases, bad tags). Assets with untrusted URLs are dropped.
 */
export function parseRelease(json, opts = {}) {
  if (!json || typeof json !== 'object') return null
  const tag = typeof json.tag_name === 'string' ? json.tag_name : ''
  const parsed = parseVersion(tag)
  if (!parsed || json.draft === true || json.prerelease === true) return null
  const assets = Array.isArray(json.assets) ? json.assets : []
  return {
    tag,
    version: `${parsed.major}.${parsed.minor}.${parsed.patch}${parsed.pre.length ? '-' + parsed.pre.join('.') : ''}`,
    name: typeof json.name === 'string' && json.name ? json.name : tag,
    notes: typeof json.body === 'string' ? json.body : '',
    htmlUrl: typeof json.html_url === 'string' && /^https:\/\/github\.com\//.test(json.html_url) ? json.html_url : RELEASES_PAGE,
    publishedAt: typeof json.published_at === 'string' ? json.published_at : null,
    assets: assets
      .filter((a) => a && typeof a.name === 'string' && typeof a.browser_download_url === 'string' && a.state !== 'starter' && isTrustedDownloadUrl(a.browser_download_url, opts))
      .map((a) => ({
        name: a.name,
        size: Number.isFinite(a.size) && a.size > 0 ? a.size : 0,
        url: a.browser_download_url,
        digest: typeof a.digest === 'string' ? a.digest : null,
      })),
  }
}

/** The asset to download for an install kind (`setup`, `portable` or `zip`), or null. */
export function pickAsset(release, kind) {
  const re = ASSET_PATTERNS[kind]
  return (re && release?.assets.find((a) => re.test(a.name))) || null
}

/**
 * The SHA-256 the download must match: GitHub's own `digest` field, or a "<hash>  <file name>" line in the
 * release notes. Returns lowercase hex, or null when the release publishes neither (the update is then refused).
 */
export function expectedSha256(asset, notes = '') {
  const fromDigest = asset?.digest?.match(/^sha256:([0-9a-f]{64})$/i)
  if (fromDigest) return fromDigest[1].toLowerCase()
  if (!asset) return null
  for (const line of notes.split(/\r?\n/)) {
    const m = line.match(/\b([0-9a-f]{64})\b\s+\*?(.+?)\s*$/i)
    if (m && m[2] === asset.name) return m[1].toLowerCase()
  }
  return null
}

/** Rolling transfer speed (bytes/s), smoothed so the number is readable. */
export function smoothSpeed(previous, bytesDelta, secondsDelta) {
  if (secondsDelta <= 0) return previous
  const instant = bytesDelta / secondsDelta
  return previous === 0 ? instant : previous * 0.7 + instant * 0.3
}

// ---------------------------------------------------------------------------------------------
// Updater scripts (PowerShell). Values are embedded as single-quoted literals, which are inert in PowerShell
// (only a quote needs doubling), so paths with spaces, &, % or $ cannot break or inject into the script.

export const psq = (s) => `'${String(s).replace(/'/g, "''")}'`

const HEADER = (logPath) => `$ErrorActionPreference = 'Stop'
try { Start-Transcript -Path ${psq(logPath)} -Force | Out-Null } catch {}
function Wait-Gone($processId) { try { Wait-Process -Id $processId -Timeout 90 -ErrorAction SilentlyContinue } catch {} ; Start-Sleep -Milliseconds 700 }
function Set-Shortcut($path, $target, $icon, $workDir) {
  $sh = New-Object -ComObject WScript.Shell
  $l = $sh.CreateShortcut($path)
  $l.TargetPath = $target
  $l.WorkingDirectory = $workDir
  $l.IconLocation = "$icon,0"
  $l.Description = 'Aimless: FPS sensitivity converter'
  $l.Save()
}
function Refresh-Shortcuts($target, $oldTarget) {
  # Only repair shortcuts that exist AND point at this app (its current exe, or the old portable file). A shortcut to a
  # different Aimless copy (for example an installed one while a portable one updates) is left alone.
  $desktop = [Environment]::GetFolderPath('Desktop')
  $programs = Join-Path ([Environment]::GetFolderPath('Programs')) 'Aimless.lnk'
  foreach ($p in @((Join-Path $desktop 'Aimless.lnk'), $programs)) {
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $cur = (New-Object -ComObject WScript.Shell).CreateShortcut($p).TargetPath
    if ($cur -eq $target -or ($oldTarget -and $cur -eq $oldTarget)) { Set-Shortcut $p $target $target (Split-Path $target); Write-Output "shortcut updated: $p -> $target" }
  }
}
function Copy-Retry($from, $to) {
  for ($i = 0; $i -lt 30; $i++) { try { Copy-Item -LiteralPath $from -Destination $to -Force; return } catch { Start-Sleep -Milliseconds 700 } }
  throw "could not write $to"
}
`

const FOOTER = (selfCleanup) => `
try { Stop-Transcript | Out-Null } catch {}
${selfCleanup}
`

/**
 * NSIS install: wait for the app to exit, run the downloaded Setup silently (it reuses the existing
 * install folder), repair the Desktop and Start Menu shortcuts, start the new Aimless.exe.
 */
export function buildInstalledScript({ pid, setupPath, exePath, logPath }) {
  return `${HEADER(logPath)}
$setup = ${psq(setupPath)}
$exe = ${psq(exePath)}
Wait-Gone ${Number(pid)}
$ok = $false
try {
  $p = Start-Process -FilePath $setup -ArgumentList '/S' -PassThru -Wait
  $ok = ($p.ExitCode -eq 0)
  if (-not $ok) { Write-Output "installer exit code $($p.ExitCode)" }
} catch { Write-Output "installer failed: $_" }
if ($ok -and (Test-Path -LiteralPath $exe)) { Refresh-Shortcuts $exe $null; Remove-Item -LiteralPath $setup -Force -ErrorAction SilentlyContinue }
if (Test-Path -LiteralPath $exe) { Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe) }
${FOOTER("Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue")}`
}

/**
 * Portable .exe: wait for the app to exit, put the new file next to the old one under its new name,
 * delete the old file, repoint any Aimless shortcut, start the new file.
 */
export function buildPortableScript({ pid, newFilePath, oldFilePath, newName, logPath }) {
  return `${HEADER(logPath)}
$new = ${psq(newFilePath)}
$old = ${psq(oldFilePath)}
$dest = Join-Path (Split-Path $old) ${psq(newName)}
Wait-Gone ${Number(pid)}
try {
  if ($dest -ne $old) { Copy-Retry $new $dest } else { Copy-Retry $new $old }
  if ($dest -ne $old) { Remove-Item -LiteralPath $old -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath $new -Force -ErrorAction SilentlyContinue
  Refresh-Shortcuts $dest $old
  Start-Process -FilePath $dest -WorkingDirectory (Split-Path $dest)
} catch {
  Write-Output "portable update failed: $_"
  if (Test-Path -LiteralPath $old) { Start-Process -FilePath $old -WorkingDirectory (Split-Path $old) }
}
${FOOTER("Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue")}`
}

/** No-install ZIP folder: unpack the new ZIP over the app folder, then start Aimless.exe again. */
export function buildZipScript({ pid, zipPath, appDir, exePath, logPath }) {
  return `${HEADER(logPath)}
$zip = ${psq(zipPath)}
$dir = ${psq(appDir)}
$exe = ${psq(exePath)}
Wait-Gone ${Number(pid)}
try {
  for ($i = 0; $i -lt 20; $i++) { try { Expand-Archive -LiteralPath $zip -DestinationPath $dir -Force; break } catch { if ($i -eq 19) { throw } ; Start-Sleep -Milliseconds 700 } }
  Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
  Refresh-Shortcuts $exe $null
} catch { Write-Output "zip update failed: $_" }
if (Test-Path -LiteralPath $exe) { Start-Process -FilePath $exe -WorkingDirectory $dir }
${FOOTER("Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue")}`
}
