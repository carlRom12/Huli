import { normalizeItem, validateDoneOn, type HuliDatabase } from './db'
import { defaultReminderSettings, isReminderTime } from './reminderSettings'
import type { ReminderSettings } from './reminderSettings'
import type { Item, Log } from './types'

type Backup = {
  version: 1
  items: Item[]
  logs: Log[]
  reminders: ReminderSettings
}

function invalid(): never {
  throw new Error('This isn’t a valid Huli backup. Choose a JSON file exported by Huli.')
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}

function id(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) invalid()
  return value
}

function timestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 ||
      !(new Date(value).getFullYear() <= 9999)) invalid()
  return value
}

export function parseBackup(text: string, now = new Date()): Backup {
  try {
    const source = object(JSON.parse(text))
    if (source.version !== 1 || !Array.isArray(source.items) || !Array.isArray(source.logs)) invalid()

    const itemIds = new Set<string>()
    const items = source.items.map((value: unknown): Item => {
      const row = object(value)
      if (typeof row.name !== 'string' || typeof row.icon !== 'string' ||
          typeof row.defaultIntervalDays !== 'number') invalid()
      const itemId = id(row.id)
      if (itemIds.has(itemId)) invalid()
      itemIds.add(itemId)
      return {
        ...normalizeItem({ name: row.name, icon: row.icon as Item['icon'], defaultIntervalDays: row.defaultIntervalDays }, now),
        id: itemId,
        createdAt: timestamp(row.createdAt),
      }
    })

    const logIds = new Set<string>()
    const logs = source.logs.map((value: unknown): Log => {
      const row = object(value)
      const logId = id(row.id)
      const itemId = id(row.itemId)
      if (logIds.has(logId) || !itemIds.has(itemId) || typeof row.doneOn !== 'string') invalid()
      validateDoneOn(row.doneOn, now)
      logIds.add(logId)
      return { id: logId, itemId, doneOn: row.doneOn, createdAt: timestamp(row.createdAt) }
    })

    const { dailyNudge, time, headsUp } = object(source.reminders)
    if (typeof dailyNudge !== 'boolean' || typeof time !== 'string' || !isReminderTime(time) ||
        typeof headsUp !== 'boolean') invalid()
    return { version: 1, items, logs, reminders: { dailyNudge, time, headsUp } }
  } catch {
    return invalid()
  }
}

export function readBackup(db: HuliDatabase): Promise<Backup> {
  return db.transaction('r', db.items, db.logs, db.settings, async () => {
    const settings = await db.settings.get('reminders')
    return {
      version: 1,
      items: await db.items.toArray(),
      logs: await db.logs.toArray(),
      reminders: settings?.id === 'reminders' ? settings.value : defaultReminderSettings,
    }
  })
}

export async function replaceFromBackup(db: HuliDatabase, backup: Backup): Promise<void> {
  await db.transaction('rw', db.items, db.logs, db.settings, async () => {
    await db.logs.clear()
    await db.items.clear()
    await db.items.bulkAdd(backup.items)
    await db.logs.bulkAdd(backup.logs)
    await db.settings.put({ id: 'reminders', value: backup.reminders })
  })
}
