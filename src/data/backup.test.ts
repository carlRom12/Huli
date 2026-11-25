import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseBackup, readBackup, replaceFromBackup } from './backup'
import { HuliDatabase } from './db'

const now = new Date(2026, 10, 24, 12)
const fields = { name: 'Water refill', icon: 'droplet', defaultIntervalDays: 7 } as const
let db: HuliDatabase

beforeEach(() => {
  db = new HuliDatabase(crypto.randomUUID())
})

afterEach(async () => {
  await db.delete()
})

describe('Huli backups', () => {
  it('upgrades the existing database and exports its items with default settings', async () => {
    const previous = new Dexie(db.name)
    previous.version(1).stores({ items: 'id', logs: 'id, [itemId+doneOn]' })
    await previous.table('items').add({ ...fields, id: 'water', createdAt: now.getTime() })
    await previous.table('logs').add({
      id: 'log', itemId: 'water', doneOn: '2026-11-24', createdAt: now.getTime(),
    })
    previous.close()
    const backup = await readBackup(db)
    expect(backup).toMatchObject({
      version: 1,
      items: [{ id: 'water' }],
      logs: [{ itemId: 'water' }],
      reminders: { dailyNudge: true, time: '08:00', headsUp: false },
    })
  })

  it('round-trips history and preferences, replacing existing records', async () => {
    await db.createItem(fields, '2026-11-24', now)
    await db.settings.put({ id: 'reminders', value: { dailyNudge: false, time: '16:30', headsUp: true } })
    const exported = await readBackup(db)
    await db.createItem({ ...fields, name: 'Temporary' }, null, now)
    await db.settings.delete('reminders')
    await replaceFromBackup(db, parseBackup(JSON.stringify(exported), now))
    expect(await readBackup(db)).toEqual(exported)
  })

  it('rejects duplicate IDs, orphan logs, bad dates and invalid reminder times', async () => {
    await db.createItem(fields, '2026-11-24', now)
    const valid = await readBackup(db)
    const [item] = valid.items
    const [log] = valid.logs
    const invalidBackups = [
      { ...valid, items: [item, item] },
      { ...valid, items: [] },
      { ...valid, logs: [{ ...log, doneOn: '2026-11-25' }] },
      { ...valid, logs: [{ ...log, doneOn: '2026-11-31' }] },
      { ...valid, reminders: { ...valid.reminders, time: '25:30' } },
    ]
    for (const backup of invalidBackups) {
      expect(() => parseBackup(JSON.stringify(backup), now)).toThrow('valid Huli backup')
    }
    expect(await readBackup(db)).toEqual(valid)
  })
})
