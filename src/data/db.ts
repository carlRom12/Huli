import Dexie, { type Table } from 'dexie'
import { addDays } from 'date-fns'
import { dateKey, parseDateKey } from './dates'
import { seedDemoOnCreate } from './demo'
import { itemIcons, type Item, type Log } from './types'

type ItemFields = Pick<Item, 'name' | 'icon' | 'defaultIntervalDays'>

function normalizeItem(fields: ItemFields, now = new Date()): ItemFields {
  const name = fields.name.trim()
  if (!name) throw new RangeError('Enter an item name.')
  if (!itemIcons.includes(fields.icon)) throw new RangeError('Choose an item icon.')
  if (!Number.isSafeInteger(fields.defaultIntervalDays) || fields.defaultIntervalDays < 1) {
    throw new RangeError('Enter an interval of at least one day.')
  }
  if (!(addDays(now, fields.defaultIntervalDays).getFullYear() <= 9999)) {
    throw new RangeError('Enter a shorter interval so Huli can calculate a due date.')
  }
  return { name, icon: fields.icon, defaultIntervalDays: fields.defaultIntervalDays }
}

function validateDoneOn(doneOn: string, now: Date): void {
  parseDateKey(doneOn)
  if (doneOn > dateKey(now)) throw new RangeError('Choose today or an earlier date.')
}

export class HuliDatabase extends Dexie {
  items!: Table<Item, string>
  logs!: Table<Log, string>

  constructor(name = 'huli') {
    super(name)
    this.version(1).stores({
      items: 'id',
      logs: 'id, [itemId+doneOn]',
    })
  }

  async createItem(fields: ItemFields, lastDone: string | null, now = new Date(), id: string = crypto.randomUUID()): Promise<Item> {
    const item: Item = {
      ...normalizeItem(fields, now),
      id,
      createdAt: now.getTime(),
    }
    if (lastDone !== null) validateDoneOn(lastDone, now)

    return this.transaction('rw', this.items, this.logs, async () => {
      await this.items.add(item)
      if (lastDone !== null) {
        await this.logs.add({
          id: crypto.randomUUID(),
          itemId: item.id,
          doneOn: lastDone,
          createdAt: item.createdAt,
        })
      }
      return item
    })
  }

  async updateItem(id: string, fields: ItemFields): Promise<void> {
    const updated = await this.items.update(id, normalizeItem(fields))
    if (!updated) throw new Error('This item no longer exists.')
  }

  async deleteItem(id: string): Promise<void> {
    await this.transaction('rw', this.items, this.logs, async () => {
      await this.logs.where('itemId').equals(id).delete()
      await this.items.delete(id)
    })
  }

  async recordDone(itemId: string, doneOn: string, now = new Date()): Promise<Log> {
    const log: Log = { id: crypto.randomUUID(), itemId, doneOn, createdAt: now.getTime() }
    await this.restoreLog(log, now)
    return log
  }

  async deleteLog(id: string): Promise<Log | undefined> {
    return this.transaction('rw', this.logs, async () => {
      const log = await this.logs.get(id)
      if (log) await this.logs.delete(id)
      return log
    })
  }

  async restoreLog(log: Log, now = new Date()): Promise<void> {
    validateDoneOn(log.doneOn, now)
    await this.transaction('rw', this.items, this.logs, async () => {
      if (!(await this.items.get(log.itemId))) throw new Error('This item no longer exists.')
      await this.logs.add(log)
    })
  }
}

export const db = new HuliDatabase(import.meta.env.DEV ? 'huli-development' : 'huli')
if (import.meta.env.DEV) seedDemoOnCreate(db)
