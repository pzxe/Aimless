import { beforeEach, describe, expect, it } from 'vitest'
import { emptyDraft, sanitizeAccount } from '@/core/accounts/types'
import { storageGet, STORAGE_KEYS } from '@/utils/storage'
import { useAccounts } from './accountsStore'

// Node has no localStorage or IndexedDB: the vault falls back to in-memory storage and a memory key,
// which exercises the same encrypt / decrypt code as the browser.
const flush = () => new Promise((r) => setTimeout(r, 30))
const draft = () => ({ ...emptyDraft('valorant'), label: 'Main Ranked', username: 'player@example.com', password: 'S3cret-pass!', inGameId: 'TenZ#0505' })

describe('alt accounts vault', () => {
  beforeEach(async () => {
    useAccounts.getState().wipe()
    useAccounts.setState({ status: 'ready' })
  })

  it('stores accounts encrypted, never as plaintext', async () => {
    useAccounts.getState().add(draft())
    await flush()
    const raw = storageGet(STORAGE_KEYS.vault)!
    expect(raw).toBeTruthy()
    for (const secret of ['S3cret-pass!', 'player@example.com', 'Main Ranked', 'TenZ']) expect(raw).not.toContain(secret)
    expect(JSON.parse(raw)).toMatchObject({ v: 1, kdf: 'device' })
  })

  it('adds, updates, favourites and removes', async () => {
    const s = useAccounts.getState()
    const a = s.add(draft())
    s.update(a.id, { label: 'Renamed' })
    s.toggleFavorite(a.id)
    expect(useAccounts.getState().accounts[0]).toMatchObject({ label: 'Renamed', favorite: true })
    s.remove(a.id)
    expect(useAccounts.getState().accounts).toEqual([])
  })

  it('locks with a PIN, rejects a wrong PIN and unlocks with the right one', async () => {
    const s = useAccounts.getState()
    s.add(draft())
    await s.setPin('1234')
    await flush()
    expect(JSON.parse(storageGet(STORAGE_KEYS.vault)!)).toMatchObject({ kdf: 'pbkdf2' })
    expect(storageGet(STORAGE_KEYS.vault)).not.toContain('S3cret-pass!')

    s.lock()
    await flush()
    expect(useAccounts.getState()).toMatchObject({ status: 'locked', accounts: [] })

    expect(await useAccounts.getState().unlock('wrong')).toBe(false)
    expect(useAccounts.getState().status).toBe('locked')
    expect(await useAccounts.getState().unlock('1234')).toBe(true)
    expect(useAccounts.getState().accounts[0]).toMatchObject({ label: 'Main Ranked', password: 'S3cret-pass!' })
  })

  it('does not let a late update overwrite a locked vault', async () => {
    const s = useAccounts.getState()
    const a = s.add(draft())
    await s.setPin('1234')
    await flush()
    s.lock()
    await flush()
    const before = storageGet(STORAGE_KEYS.vault)
    useAccounts.getState().update(a.id, { label: 'late' })
    useAccounts.getState().setLive(a.id, { game: 'overwatch2' } as never)
    await flush()
    expect(storageGet(STORAGE_KEYS.vault)).toBe(before)
    expect(await useAccounts.getState().unlock('1234')).toBe(true)
    expect(useAccounts.getState().accounts[0]!.label).toBe('Main Ranked')
  })

  it('removes the PIN and keeps the accounts', async () => {
    const s = useAccounts.getState()
    s.add(draft())
    await s.setPin('1234')
    await s.removePin()
    await flush()
    expect(JSON.parse(storageGet(STORAGE_KEYS.vault)!)).toMatchObject({ kdf: 'device' })
    expect(useAccounts.getState().pinEnabled).toBe(false)
    expect(useAccounts.getState().accounts).toHaveLength(1)
  })

  it('exports an encrypted backup and imports it, skipping duplicates', async () => {
    const s = useAccounts.getState()
    s.add(draft())
    const backup = await s.exportBackup('backup-pass')
    expect(backup).not.toContain('S3cret-pass!')
    expect(JSON.parse(backup)).toMatchObject({ app: 'aimless', type: 'alt-accounts-backup', kdf: 'pbkdf2' })

    expect(await useAccounts.getState().importBackup(backup, 'backup-pass')).toBe(0) // same ids already present
    useAccounts.getState().wipe()
    useAccounts.setState({ status: 'ready' })
    expect(await useAccounts.getState().importBackup(backup, 'backup-pass')).toBe(1)
    expect(useAccounts.getState().accounts[0]).toMatchObject({ label: 'Main Ranked', password: 'S3cret-pass!' })

    await expect(useAccounts.getState().importBackup(backup, 'nope')).rejects.toThrow()
    await expect(useAccounts.getState().importBackup('{"hello":1}', 'x')).rejects.toThrow()
  })
})

describe('alt accounts custom order', () => {
  beforeEach(async () => {
    useAccounts.getState().wipe()
    useAccounts.setState({ status: 'ready' })
  })
  const labels = () => useAccounts.getState().accounts.map((a) => a.label)
  const addThree = () => {
    const s = useAccounts.getState()
    s.add({ ...draft(), label: 'C' })
    s.add({ ...draft(), label: 'B' })
    s.add({ ...draft(), label: 'A' })
    return useAccounts.getState().accounts.map((a) => a.id) // newest first: A B C
  }

  it('puts the accounts in the requested order', () => {
    const ids = addThree()
    expect(labels()).toEqual(['A', 'B', 'C'])
    useAccounts.getState().reorder([ids[2]!, ids[0]!, ids[1]!])
    expect(labels()).toEqual(['C', 'A', 'B'])
  })

  it('keeps accounts that are missing from the list, ignores unknown and duplicate ids', () => {
    const ids = addThree()
    useAccounts.getState().reorder(['nope', ids[2]!, ids[2]!])
    expect(labels()).toEqual(['C', 'A', 'B'])
    expect(useAccounts.getState().accounts).toHaveLength(3)
  })

  it('does not rewrite the vault when nothing moved', async () => {
    const ids = addThree()
    await flush()
    const before = storageGet(STORAGE_KEYS.vault)
    useAccounts.getState().reorder(ids)
    await flush()
    expect(storageGet(STORAGE_KEYS.vault)).toBe(before)
  })

  it('survives an app restart: the order is stored (encrypted) with the vault', async () => {
    const ids = addThree()
    useAccounts.getState().reorder([ids[1]!, ids[2]!, ids[0]!])
    await flush()
    expect(storageGet(STORAGE_KEYS.vault)).not.toContain('Main Ranked')
    useAccounts.setState({ status: 'loading', accounts: [] }) // what a fresh launch starts from
    await useAccounts.getState().init()
    expect(useAccounts.getState().status).toBe('ready')
    expect(labels()).toEqual(['B', 'C', 'A'])
  })

  it('keeps the custom order across a PIN lock and unlock', async () => {
    const ids = addThree()
    useAccounts.getState().reorder([ids[2]!, ids[1]!, ids[0]!])
    await useAccounts.getState().setPin('1234')
    await flush()
    useAccounts.getState().lock()
    await flush()
    expect(await useAccounts.getState().unlock('1234')).toBe(true)
    expect(labels()).toEqual(['C', 'B', 'A'])
  })

  it('a locked vault cannot be reordered', async () => {
    const ids = addThree()
    await useAccounts.getState().setPin('1234')
    await flush()
    useAccounts.getState().lock()
    await flush()
    const before = storageGet(STORAGE_KEYS.vault)
    useAccounts.getState().reorder([...ids].reverse())
    await flush()
    expect(storageGet(STORAGE_KEYS.vault)).toBe(before)
  })
})

describe('sanitizeAccount', () => {
  it('rejects unknown games and missing ids, clamps values', () => {
    expect(sanitizeAccount({ id: 'x', gameId: 'nope' })).toBeNull()
    expect(sanitizeAccount({ gameId: 'valorant' })).toBeNull()
    const a = sanitizeAccount({ id: 'x', gameId: 'valorant', label: 'L'.repeat(500), rankTier: 99, rr: -5, status: 'weird', region: 'mars' })!
    expect(a.label).toHaveLength(80)
    expect(a).toMatchObject({ rankTier: undefined, rr: undefined, status: 'ready', region: '' })
  })
})
