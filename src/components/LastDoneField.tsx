import { subDays } from 'date-fns'
import { dateKey } from '../data/dates'

const options = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['date', 'Pick date'],
  ['unknown', 'Not sure'],
] as const

export type LastDone = {
  choice: (typeof options)[number][0]
  date: string
}

export function resolveLastDone({ choice, date }: LastDone, now: Date): string | null {
  switch (choice) {
    case 'unknown': return null
    case 'date': return date
    case 'yesterday': return dateKey(subDays(now, 1))
    case 'today': return dateKey(now)
  }
}

export function LastDoneField({ today, value, onChange }: {
  today: string
  value: LastDone
  onChange: (value: LastDone) => void
}) {
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-1 text-sm font-bold">Last done</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map(([choice, label]) => (
          <label key={choice} className="relative">
            <input type="radio" name="lastDone" value={choice} checked={value.choice === choice}
              onChange={() => onChange({ ...value, choice })} className="peer sr-only" />
            <span className="grid min-h-touch cursor-pointer place-items-center rounded-full border border-border px-2 text-center text-sm font-bold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal">
              {label}
            </span>
          </label>
        ))}
      </div>
      {value.choice === 'date' && (
        <label className="grid gap-1 text-sm font-bold">
          Date completed
          <input type="date" required max={today} value={value.date}
            onChange={(event) => onChange({ ...value, date: event.target.value })}
            className="min-h-touch min-w-0 rounded-xl border border-border bg-bg px-3" />
        </label>
      )}
    </fieldset>
  )
}
