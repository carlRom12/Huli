import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HuliDatabase } from './db'

const fields = { name: 'LPG tank', icon: 'flame', defaultIntervalDays: 35 } as const
const now = new Date(2026, 10, 24, 12)
let db: HuliDatabase

beforeEach(() => {
  db = new HuliDatabase(crypto.randomUUID())
})

afterEach(async () => {
  await db.delete()
})

describe('HuliDatabase', () => {
  it('stores a backdated initial log and leaves unknown dates without a log', async () => {
    const tracked = await db.createItem(fields, '2026-11-03', now)
    await db.createItem({ ...fields, name: 'Water refill' }, null, now)
    expect(await db.items.count()).toBe(2)
    expect(await db.logs.toArray()).toMatchObject([
      { itemId: tracked.id, doneOn: '2026-11-03' },
    ])
  })

  it('rejects future and invalid dates before writing', async () => {
    await expect(db.createItem(fields, '2026-11-25', now)).rejects.toThrow(RangeError)
    await expect(db.createItem(fields, '2026-11-31', now)).rejects.toThrow(RangeError)
    expect(await db.items.count()).toBe(0)
    const tracked = await db.createItem(fields, null, now)
    await expect(db.recordDone(tracked.id, '2026-12-01', now)).rejects.toThrow(RangeError)
    expect(await db.logs.count()).toBe(0)
  })

  it('keeps same-day logs individually undoable and removes logs with their item', async () => {
    const tracked = await db.createItem(fields, '2026-11-24', now)
    const other = await db.createItem({ ...fields, name: 'Water refill' }, '2026-11-24', now)
    const entry = await db.recordDone(tracked.id, '2026-11-24', now)
    expect(await db.logs.where('itemId').equals(tracked.id).count()).toBe(2)
    expect(await db.deleteLog(entry.id)).toEqual(entry)
    await db.restoreLog(entry, now)
    expect(await db.logs.get(entry.id)).toEqual(entry)

    await db.deleteItem(tracked.id)
    expect(await db.items.get(tracked.id)).toBeUndefined()
    expect(await db.logs.toArray()).toMatchObject([{ itemId: other.id }])
    await expect(db.restoreLog(entry, now)).rejects.toThrow('This item no longer exists.')
  })
})
