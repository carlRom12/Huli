import { useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { starterPacks, type PackName, type Starter } from '../data/starterPacks'
import type { Item } from '../data/types'
import { CustomItemForm } from './CustomItemForm'
import { LastDoneField, resolveLastDone, type LastDone } from './LastDoneField'
import { Modal } from './Modal'

const packNames = Object.keys(starterPacks) as PackName[]
const modes = [['starter', 'Starter packs'], ['custom', 'Make your own']] as const

function StarterDialog({ starter, today, onClose }: { starter: Starter; today: string; onClose: () => void }) {
  const [lastDone, setLastDone] = useState<LastDone>({ choice: 'today', date: today })
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      const now = new Date()
      await db.createItem(starter, resolveLastDone(lastDone, now), now, starter.id)
      onClose()
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'ConstraintError') {
        onClose()
        return
      }
      setError(cause instanceof RangeError ? cause.message : 'Couldn’t add this item. Try again.')
      setWorking(false)
    }
  }

  return (
    <Modal title={`Add ${starter.name}`} onClose={onClose}>
      <form className="grid gap-3" onSubmit={submit}>
        <LastDoneField today={today} value={lastDone} onChange={setLastDone} />
        {error && <p role="alert" className="text-sm text-overdue-text">{error}</p>}
        <button type="submit" disabled={working}
          className="min-h-action rounded-full bg-teal px-4 font-extrabold text-surface disabled:opacity-60">
          Add item
        </button>
      </form>
    </Modal>
  )
}

export function Add({ today, items, onCustomAdded }: {
  today: string
  items: Item[] | null
  onCustomAdded: () => void
}) {
  const [mode, setMode] = useState<(typeof modes)[number][0]>('starter')
  const [pack, setPack] = useState<PackName>('Home')
  const [selected, setSelected] = useState<Starter | null>(null)
  const itemIds = new Set(items?.map(({ id }) => id))
  const starters: Starter[] = starterPacks[pack]

  return (
    <>
      <h1 className="mb-4 px-1 text-[clamp(1.75rem,8vw,2.25rem)] leading-tight font-extrabold tracking-tight">Add something</h1>
      <div role="group" aria-label="Add method" className="mb-4 grid grid-cols-2 rounded-full bg-icon-tile p-1">
        {modes.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
            className="min-h-touch rounded-full px-2 text-sm font-extrabold text-muted aria-pressed:bg-surface aria-pressed:text-ink sm:text-base">
            {label}
          </button>
        ))}
      </div>
      {mode === 'starter' ? (
        <>
          <div role="group" aria-label="Starter pack" className="mb-4 flex flex-wrap gap-2">
            {packNames.map((name) => (
              <button key={name} type="button" aria-pressed={pack === name} onClick={() => setPack(name)}
                className="min-h-touch rounded-full border border-border px-3.5 text-sm font-bold aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-surface sm:px-4">
                {name}
              </button>
            ))}
          </div>
          <p className="mb-2 px-1 text-sm text-muted sm:text-base">Tap Add to start with an estimated interval. Huli learns as you log.</p>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface px-3 sm:px-4">
            {starters.map((starter) => {
              const added = itemIds.has(starter.id) ||
                (import.meta.env.DEV && starter.demoId !== undefined && itemIds.has(starter.demoId))
              return (
                <li key={starter.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <h2 className="leading-tight font-extrabold wrap-break-word sm:text-lg">{starter.name}</h2>
                    <p className="mt-0.5 text-sm text-muted">Usually every ~{starter.defaultIntervalDays} days</p>
                  </div>
                  {added ? (
                    <span className="grid min-h-touch shrink-0 place-items-center rounded-full bg-ok-pill px-3.5 text-sm font-extrabold text-ok-pill-text">
                      Added
                    </span>
                  ) : (
                    <button type="button" aria-label={`Add ${starter.name}`} disabled={items === null}
                      onClick={() => setSelected(starter)}
                      className="min-h-touch shrink-0 rounded-full border border-teal px-4 text-sm font-extrabold text-teal disabled:opacity-60">
                      Add
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          {selected && <StarterDialog starter={selected} today={today} onClose={() => setSelected(null)} />}
        </>
      ) : <CustomItemForm today={today} onAdded={onCustomAdded} />}
    </>
  )
}
