export const REPO: { owner: string; name: string }
export const LATEST_RELEASE_URL: string
export const RELEASES_PAGE: string
export type InstallKind = 'setup' | 'portable' | 'zip'
export interface ParsedVersion {
  major: number
  minor: number
  patch: number
  pre: (string | number)[]
}
export interface ReleaseAsset {
  name: string
  size: number
  url: string
  digest: string | null
}
export interface Release {
  tag: string
  version: string
  name: string
  notes: string
  htmlUrl: string
  publishedAt: string | null
  assets: ReleaseAsset[]
}
export function parseVersion(input: unknown): ParsedVersion | null
export function compareVersions(a: string, b: string): -1 | 0 | 1
export function isNewerVersion(latest: string, current: string): boolean
export function isTrustedDownloadUrl(url: string, opts?: { allowLoopback?: boolean }): boolean
export const ASSET_PATTERNS: Record<InstallKind, RegExp>
export function parseRelease(json: unknown, opts?: { allowLoopback?: boolean }): Release | null
export function pickAsset(release: Release | null | undefined, kind: InstallKind): ReleaseAsset | null
export function expectedSha256(asset: ReleaseAsset | null | undefined, notes?: string): string | null
export function smoothSpeed(previous: number, bytesDelta: number, secondsDelta: number): number
export function psq(s: string): string
export function buildInstalledScript(o: { pid: number; setupPath: string; exePath: string; logPath: string }): string
export function buildPortableScript(o: { pid: number; newFilePath: string; oldFilePath: string; newName: string; logPath: string }): string
export function buildZipScript(o: { pid: number; zipPath: string; appDir: string; exePath: string; logPath: string }): string
