import { useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { itemIcons, type ItemIcon } from '../data/types'
import { Icon } from './Icon'
import { LastDoneField, resolveLastDone, type LastDone } from './LastDoneField'

const units = { days: 1, weeks: 7, months: 30 }
type Unit = keyof typeof units

export function CustomItemForm({ today, onAdded }: { today: string; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<ItemIcon>('tag')
  const [interval, setInterval] = useState('')
  const [unit, setUnit] = useState<Unit>('days')
  const [lastDone, setLastDone] = useState<LastDone>({ choice: 'today', date: today })
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      const now = new Date()
      await db.createItem({
        name,
        icon,
        defaultIntervalDays: Number(interval) * units[unit],
      }, resolveLastDone(lastDone, now), now)
      onAdded()
    } catch (cause) {
      setError(cause instanceof RangeError ? cause.message : 'Couldn’t add this item. Try again.')
      setWorking(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-card border border-border bg-surface p-4">
      <label className="grid gap-1 text-sm font-bold">
        Name
        <input required value={name} onChange={(event) => setName(event.target.value)}
          className="min-h-touch min-w-0 rounded-xl border border-border bg-bg px-3" />
      </label>
      <fieldset className="min-w-0">
        <legend className="mb-1 text-sm font-bold">Icon</legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2">
          {itemIcons.map((value) => (
            <label key={value} className="relative">
              <input type="radio" name="icon" aria-label={value[0].toUpperCase() + value.slice(1)}
                value={value} checked={value === icon} onChange={() => setIcon(value)} className="peer sr-only" />
              <span className="grid min-h-touch cursor-pointer place-items-center rounded-xl border border-border bg-bg peer-checked:border-teal peer-checked:bg-teal peer-checked:text-surface peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal">
                <Icon name={value} className="size-5" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-1 text-sm font-bold">Usually every</legend>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" aria-label="Interval amount" required min={1} step={1}
            value={interval} onChange={(event) => setInterval(event.target.value)}
            className="min-h-touch min-w-0 rounded-xl border border-border bg-bg px-3" />
          <select aria-label="Interval unit" value={unit} onChange={(event) => setUnit(event.target.value as Unit)}
            className="min-h-touch min-w-0 rounded-xl border border-border bg-bg px-3">
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
          </select>
        </div>
        {unit === 'months' && <p className="mt-1 text-xs text-muted">Huli estimates a month as 30 days.</p>}
      </fieldset>
      <LastDoneField today={today} value={lastDone} onChange={setLastDone} />
      {error && <p role="alert" className="text-sm text-overdue-text">{error}</p>}
      <button type="submit" disabled={working}
        className="min-h-action rounded-full bg-teal px-4 font-extrabold text-surface disabled:opacity-60">
        Add item
      </button>
    </form>
  )
}
