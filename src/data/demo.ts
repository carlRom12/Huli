import { subDays } from 'date-fns'
import { dateKey } from './dates'
import type { HuliDatabase } from './db'
import type { Item, Log } from './types'

export function seedDemoOnCreate(database: HuliDatabase) {
  database.on('populate', async (transaction) => {
    const now = new Date()
    const createdAt = now.getTime()
    const samples = [
      ['lpg', 'LPG tank', 'flame', 35, [194, 157, 119, 80, 42]],
      ['oil', 'Motorcycle oil change', 'wrench', 90, [102]],
      ['water', 'Water refill', 'droplet', 7, [6]],
      ['haircut', 'Haircut', 'scissors', 28, [22]],
      ['aircon', 'Aircon cleaning', 'wind', 90, [52]],
    ] as const

    const items: Item[] = []
    const logs: Log[] = []
    for (const [id, name, icon, defaultIntervalDays, offsets] of samples) {
      items.push({ id, name, icon, defaultIntervalDays, createdAt })
      for (const offset of offsets) {
        const date = subDays(now, offset)
        logs.push({ id: `${id}-${offset}`, itemId: id, doneOn: dateKey(date), createdAt: date.getTime() })
      }
    }

    await transaction.table<Item>('items').bulkAdd(items)
    await transaction.table<Log>('logs').bulkAdd(logs)
  })
}
