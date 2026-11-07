/// <reference types="node" />
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildInstalledScript,
  buildPortableScript,
  buildZipScript,
  compareVersions,
  expectedSha256,
  isNewerVersion,
  isTrustedDownloadUrl,
  parseRelease,
  parseVersion,
  pickAsset,
  psq,
  smoothSpeed,
} from '../../electron/update-core.mjs'

const HASH = 'a'.repeat(64)
const asset = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  size: 1000,
  state: 'uploaded',
  browser_download_url: `https://github.com/pzxe/Aimless/releases/download/v2.3.0/${name}`,
  digest: `sha256:${HASH}`,
  ...extra,
})
// Shaped like GET /repos/pzxe/Aimless/releases/latest
const payload = (over: Record<string, unknown> = {}) => ({
  tag_name: 'v2.3.0',
  name: 'Aimless v2.3.0',
  draft: false,
  prerelease: false,
  html_url: 'https://github.com/pzxe/Aimless/releases/tag/v2.3.0',
  published_at: '2026-11-08T10:00:00Z',
  body: '## Notes',
  assets: [asset('Aimless-v2.3.0-Setup.exe'), asset('Aimless-v2.3.0-Portable.exe'), asset('Aimless-v2.3.0-Windows-NoInstall.zip'), asset('latest.yml')],
  ...over,
})

describe('semantic version comparison', () => {
  it('detects newer versions', () => {
    expect(isNewerVersion('2.3.0', '2.2.2')).toBe(true)
    expect(isNewerVersion('v2.3.0', '2.2.2')).toBe(true)
    expect(isNewerVersion('2.2.3', '2.2.2')).toBe(true)
    expect(isNewerVersion('3.0.0', '2.99.99')).toBe(true)
  })
  it('compares numerically, not as strings', () => {
    expect(isNewerVersion('2.10.0', '2.9.0')).toBe(true)
    expect(isNewerVersion('2.9.0', '2.10.0')).toBe(false)
    expect(isNewerVersion('10.0.0', '9.9.9')).toBe(true)
  })
  it('is false for equal and older versions', () => {
    expect(isNewerVersion('2.2.2', '2.2.2')).toBe(false)
    expect(isNewerVersion('2.2.1', '2.2.2')).toBe(false)
    expect(isNewerVersion('1.9.9', '2.0.0')).toBe(false)
  })
  it('orders pre-releases below their release, per semver', () => {
    expect(isNewerVersion('2.3.0', '2.3.0-beta.1')).toBe(true)
    expect(isNewerVersion('2.3.0-beta.1', '2.3.0')).toBe(false)
    expect(compareVersions('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1)
    expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBe(-1)
    expect(compareVersions('1.0.0-alpha.beta', '1.0.0-beta')).toBe(-1)
    expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.11')).toBe(-1)
    expect(compareVersions('1.0.0-rc.1', '1.0.0')).toBe(-1)
    expect(compareVersions('1.0.0+build.5', '1.0.0')).toBe(0)
  })
  it('never treats invalid input as newer, and rejects it when parsing', () => {
    for (const bad of ['', 'latest', '2.3', '2.3.0.1', 'v', '01.2.3', 'x.y.z', null as unknown as string]) {
      expect(isNewerVersion(bad, '2.2.2'), String(bad)).toBe(false)
      expect(isNewerVersion('9.9.9', bad), String(bad)).toBe(false)
      expect(parseVersion(bad)).toBeNull()
    }
    expect(() => compareVersions('nope', '1.0.0')).toThrow()
  })
})

describe('GitHub release payload parsing', () => {
  it('normalises a real-shaped payload', () => {
    const r = parseRelease(payload())!
    expect(r).toMatchObject({ tag: 'v2.3.0', version: '2.3.0', name: 'Aimless v2.3.0', htmlUrl: 'https://github.com/pzxe/Aimless/releases/tag/v2.3.0' })
    expect(r.assets).toHaveLength(4)
    expect(r.assets[0]).toEqual({ name: 'Aimless-v2.3.0-Setup.exe', size: 1000, url: 'https://github.com/pzxe/Aimless/releases/download/v2.3.0/Aimless-v2.3.0-Setup.exe', digest: `sha256:${HASH}` })
  })
  it('ignores drafts, pre-releases and unusable tags', () => {
    expect(parseRelease(payload({ draft: true }))).toBeNull()
    expect(parseRelease(payload({ prerelease: true }))).toBeNull()
    expect(parseRelease(payload({ tag_name: 'nightly' }))).toBeNull()
    expect(parseRelease(null)).toBeNull()
    expect(parseRelease('x')).toBeNull()
    expect(parseRelease({})).toBeNull()
  })
  it('drops assets that are not on GitHub (or not https)', () => {
    const r = parseRelease(
      payload({
        assets: [
          asset('Aimless-v2.3.0-Setup.exe', { browser_download_url: 'https://evil.example/Aimless-v2.3.0-Setup.exe' }),
          asset('Aimless-v2.3.0-Portable.exe', { browser_download_url: 'http://github.com/pzxe/Aimless/releases/download/v2.3.0/x.exe' }),
          asset('Aimless-v2.3.0-Windows-NoInstall.zip', { browser_download_url: 'https://github.com.evil.example/a.zip' }),
          asset('ok.exe'),
        ],
      }),
    )!
    expect(r.assets.map((a) => a.name)).toEqual(['ok.exe'])
  })
  it('falls back to the releases page for a suspicious html_url, and tolerates missing fields', () => {
    const r = parseRelease({ tag_name: 'v1.2.3', html_url: 'https://evil.example/x' })!
    expect(r.htmlUrl).toBe('https://github.com/pzxe/Aimless/releases/latest')
    expect(r.name).toBe('v1.2.3')
    expect(r.assets).toEqual([])
    expect(r.notes).toBe('')
  })
  it('accepts a loopback API only when explicitly allowed', () => {
    const p = payload({ assets: [asset('Aimless-v2.3.0-Setup.exe', { browser_download_url: 'http://127.0.0.1:5000/Aimless-v2.3.0-Setup.exe' })] })
    expect(parseRelease(p)!.assets).toEqual([])
    expect(parseRelease(p, { allowLoopback: true })!.assets).toHaveLength(1)
  })
})

describe('choosing the file for each install type', () => {
  const r = parseRelease(payload())!
  it('picks Setup, Portable and the ZIP by exact name', () => {
    expect(pickAsset(r, 'setup')?.name).toBe('Aimless-v2.3.0-Setup.exe')
    expect(pickAsset(r, 'portable')?.name).toBe('Aimless-v2.3.0-Portable.exe')
    expect(pickAsset(r, 'zip')?.name).toBe('Aimless-v2.3.0-Windows-NoInstall.zip')
  })
  it('never picks look-alikes or blockmaps', () => {
    const odd = parseRelease(payload({ assets: [asset('Aimless-v2.3.0-Setup.exe.blockmap'), asset('Other-v2.3.0-Setup.exe'), asset('Aimless-Setup.exe')] }))!
    expect(pickAsset(odd, 'setup')).toBeNull()
    expect(pickAsset(odd, 'portable')).toBeNull()
    expect(pickAsset(null, 'setup')).toBeNull()
  })
})

describe('checksum selection', () => {
  it("uses GitHub's digest field", () => {
    expect(expectedSha256({ name: 'a.exe', size: 1, url: 'u', digest: `sha256:${HASH.toUpperCase()}` })).toBe(HASH)
  })
  it('falls back to a "<hash>  <file>" line in the release notes, matching the exact file name', () => {
    const notes = `\`\`\`\n${'b'.repeat(64)}  Aimless-v2.3.0-Setup.exe\n${'c'.repeat(64)}  Aimless-v2.3.0-Portable.exe\n\`\`\``
    expect(expectedSha256({ name: 'Aimless-v2.3.0-Setup.exe', size: 1, url: 'u', digest: null }, notes)).toBe('b'.repeat(64))
    expect(expectedSha256({ name: 'Aimless-v2.3.0-Portable.exe', size: 1, url: 'u', digest: null }, notes)).toBe('c'.repeat(64))
  })
  it('returns null when nothing is published, so the update is refused', () => {
    expect(expectedSha256({ name: 'a.exe', size: 1, url: 'u', digest: null }, 'no hashes here')).toBeNull()
    expect(expectedSha256({ name: 'a.exe', size: 1, url: 'u', digest: 'sha1:abc' })).toBeNull()
    expect(expectedSha256(null)).toBeNull()
  })
})

describe('download URL trust', () => {
  it('allows GitHub hosts over https only', () => {
    for (const ok of ['https://github.com/pzxe/Aimless/releases/download/v1/x.exe', 'https://objects.githubusercontent.com/x', 'https://release-assets.githubusercontent.com/x']) expect(isTrustedDownloadUrl(ok), ok).toBe(true)
  })
  it('refuses everything else', () => {
    for (const bad of ['http://github.com/x', 'https://github.com.evil.test/x', 'https://evil.test/github.com', 'https://user:pw@github.com/x', 'file:///C:/x.exe', 'ftp://github.com/x', 'not a url', 'https://127.0.0.1/x', 'http://127.0.0.1/x']) {
      expect(isTrustedDownloadUrl(bad), bad).toBe(false)
    }
  })
  it('allows loopback http only for the test hook', () => {
    expect(isTrustedDownloadUrl('http://127.0.0.1:4555/x.exe', { allowLoopback: true })).toBe(true)
    expect(isTrustedDownloadUrl('http://evil.test/x.exe', { allowLoopback: true })).toBe(false)
  })
})

describe('download speed', () => {
  it('smooths the rate', () => {
    expect(smoothSpeed(0, 1000, 1)).toBe(1000)
    expect(smoothSpeed(1000, 2000, 1)).toBeCloseTo(1300)
    expect(smoothSpeed(500, 100, 0)).toBe(500)
  })
})

describe('updater scripts', () => {
  const evil = "C:\\Users\\O'Brien & Sons\\$env:TEMP\\x'; Remove-Item C:\\ -Recurse; '.exe"
  it('quotes paths as inert PowerShell literals', () => {
    expect(psq("a'b")).toBe("'a''b'")
    const s = buildInstalledScript({ pid: 123, setupPath: evil, exePath: 'C:\\Aimless\\Aimless.exe', logPath: 'C:\\t\\l.log' })
    expect(s).toContain(`$setup = ${psq(evil)}`)
    expect(s).not.toContain("x'; Remove-Item") // the quote was doubled, so the text stays inside the literal
  })
  it('installs silently with /S, waits for the app, repairs shortcuts and relaunches', () => {
    const s = buildInstalledScript({ pid: 4242, setupPath: 'C:\\t\\Aimless-v2.3.0-Setup.exe', exePath: 'C:\\Aimless\\Aimless.exe', logPath: 'C:\\t\\l.log' })
    expect(s).toContain('Wait-Gone 4242')
    expect(s).toContain("-ArgumentList '/S'")
    expect(s).toContain('Refresh-Shortcuts')
    expect(s).toContain("'Aimless.lnk'")
    expect(s).toContain('WScript.Shell')
    expect(s).toContain('Start-Process -FilePath $exe')
  })
  it('only repairs shortcuts that point at the app being updated, never other Aimless copies', () => {
    const s = buildPortableScript({ pid: 7, newFilePath: 'n', oldFilePath: 'o', newName: 'x.exe', logPath: 'l' })
    expect(s).toContain('$cur -eq $target -or ($oldTarget -and $cur -eq $oldTarget)')
    expect(s).not.toContain("-like '*Aimless*'")
  })
  it('replaces a portable .exe under its new name, deletes the old one and relaunches', () => {
    const s = buildPortableScript({ pid: 7, newFilePath: 'C:\\t\\Aimless-v2.3.0-Portable.exe', oldFilePath: 'D:\\Games\\Aimless-v2.2.2-Portable.exe', newName: 'Aimless-v2.3.0-Portable.exe', logPath: 'l' })
    expect(s).toContain("$dest = Join-Path (Split-Path $old) 'Aimless-v2.3.0-Portable.exe'")
    expect(s).toContain('Remove-Item -LiteralPath $old')
    expect(s).toContain('Refresh-Shortcuts $dest $old')
    expect(s).toContain('Start-Process -FilePath $dest')
    expect(s).toContain('Start-Process -FilePath $old') // roll back to the old file if the copy fails
  })
  it('unpacks the ZIP over the app folder', () => {
    const s = buildZipScript({ pid: 9, zipPath: 'C:\\t\\n.zip', appDir: 'D:\\Aimless', exePath: 'D:\\Aimless\\Aimless.exe', logPath: 'l' })
    expect(s).toContain('Expand-Archive -LiteralPath $zip -DestinationPath $dir -Force')
    expect(s).toContain("$dir = 'D:\\Aimless'")
  })
  it('only embeds a numeric pid', () => {
    expect(buildInstalledScript({ pid: '1; calc' as unknown as number, setupPath: 'a', exePath: 'b', logPath: 'c' })).toContain('Wait-Gone NaN')
  })
  it.skipIf(process.platform !== 'win32')('produces scripts that the real PowerShell parser accepts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aimless-ps-'))
    try {
      const scripts = {
        installed: buildInstalledScript({ pid: 1, setupPath: evil, exePath: "C:\\Program Files\\Aimless\\Aimless.exe", logPath: 'C:\\t\\l.log' }),
        portable: buildPortableScript({ pid: 1, newFilePath: evil, oldFilePath: 'D:\\a b\\old.exe', newName: 'new.exe', logPath: 'l' }),
        zip: buildZipScript({ pid: 1, zipPath: evil, appDir: 'D:\\x', exePath: 'D:\\x\\Aimless.exe', logPath: 'l' }),
      }
      for (const [name, body] of Object.entries(scripts)) {
        const file = join(dir, `${name}.ps1`)
        writeFileSync(file, '\ufeff' + body, 'utf8')
        const out = execFileSync(
          'powershell.exe',
          ['-NoProfile', '-Command', `$e=$null;$t=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('${file.replace(/'/g, "''")}',[ref]$t,[ref]$e);if($e.Count){$e|%{$_.Message};exit 1}else{'OK'}`],
          { encoding: 'utf8' },
        )
        expect(out.trim(), name).toBe('OK')
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
