export const LIMITS: { titleMin: number; titleMax: number; bodyMin: number; bodyMax: number; requestMax: number }
export const TYPES: string[]
export const RATE: { perMinute: number; perHour: number }
export function neutralize(text: string): string
export function validate(p: unknown): string | null
export function buildIssue(p: { type: string; title: string; body: string; meta?: unknown }): { title: string; body: string; labels: string[] }
export function allow(ip: string, now?: number): boolean
export function resetRateLimit(): void
export function handle(request: Request, env: { GITHUB_TOKEN?: string; GITHUB_REPO?: string } | undefined, fetchImpl?: typeof fetch): Promise<Response>
declare const worker: { fetch: (request: Request, env: { GITHUB_TOKEN?: string; GITHUB_REPO?: string }) => Promise<Response> }
export default worker
