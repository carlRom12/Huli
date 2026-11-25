import { format } from 'date-fns'
import { useState } from 'react'
import { parseDateKey } from '../data/dates'
import type { predict } from '../data/prediction'
import type { Item, Log } from '../data/types'
import { DateDialog, EditItemDialog } from './ItemDialog'
import { daysLabel, GapChart, ItemHistory } from './ItemHistory'
import { Icon } from './Icon'
import { dueLabel, statuses } from './Today'

const statusColors = {
  overdue: 'bg-overdue-tint text-overdue-card-ink',
  soon: 'bg-[#F9E4BE] text-soon-text',
  ok: 'bg-ok-pill text-ok-pill-text',
} as const

export function ItemDetail({ item, prediction, logs, today, onBack, onLog, onDeleteLog }: {
  item: Item
  prediction: ReturnType<typeof predict>
  logs: Log[]
  today: string
  onBack: () => void
  onLog: (date?: string) => Promise<boolean>
  onDeleteLog: (log: Log) => void
}) {
  const [dialog, setDialog] = useState<'edit' | 'date' | null>(null)
  const [logging, setLogging] = useState(false)
  const sortedLogs = [...logs].sort((a, b) => b.doneOn.localeCompare(a.doneOn) || b.createdAt - a.createdAt)
  const status = statuses[prediction.status]
  const overdue = prediction.status === 'overdue'
  const refill = item.icon === 'flame' || item.icon === 'droplet'
  const daysSince = prediction.daysSince
  const ago = daysSince === 0 ? 'today' : `${daysLabel(daysSince)} ago`
  const lastDone = format(parseDateKey(prediction.lastDone), 'MMM d')
  const due = format(parseDateKey(prediction.dueOn), 'MMM d')
  const title = overdue ? `${daysLabel(Math.ceil(-prediction.daysUntilDue))} late` : dueLabel(prediction.daysUntilDue)

  async function logToday() {
    setLogging(true)
    try {
      await onLog()
    } finally {
      setLogging(false)
    }
  }

  return (
    <>
      <header className="mb-4 lg:relative">
        <div className="mb-3 flex items-center justify-between lg:mb-0">
          <button type="button" aria-label="Back to Today" onClick={onBack}
            className="grid size-touch place-items-center rounded-full lg:hidden">
            <Icon name="back" className="size-6" />
          </button>
          <button type="button" aria-label="Edit item" onClick={() => setDialog('edit')}
            className="grid size-touch place-items-center rounded-full lg:absolute lg:top-0 lg:right-0">
            <Icon name="edit" className="size-6" />
          </button>
        </div>
        <h1 className="flex items-center gap-3 text-[clamp(1.5rem,7vw,2rem)] leading-tight font-extrabold tracking-tight lg:pr-12 lg:text-[2.5rem]">
          <span className="grid size-action shrink-0 place-items-center rounded-[14px] bg-icon-tile lg:hidden">
            <Icon name={item.icon} className="size-6" />
          </span>
          <span className="min-w-0 wrap-break-word">{item.name}</span>
        </h1>
      </header>

      <section aria-label="Due status" className={`rounded-status p-4 sm:p-5 ${statusColors[prediction.status]}`}>
        <p className={`flex items-center gap-2 text-xs font-extrabold tracking-[0.14em] uppercase ${overdue ? 'text-overdue-card-label' : ''}`}>
          <Icon name={status.icon} className="size-4" />
          {status.label}
        </p>
        <p className="mt-1 text-[clamp(1.85rem,9vw,2.5rem)] leading-tight font-extrabold tracking-tight">{title}</p>
        <p className="mt-1 text-sm">
          {logs.length ? `Last done ${lastDone} · ${ago}` : `Last done unknown · Tracking since ${lastDone}`}
        </p>
        <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-current/15">
          <div className={`h-full rounded-full ${overdue ? 'bg-overdue-text' : status.bar}`}
            style={{ width: `${Math.min(1, Math.max(0, prediction.ratio)) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm">
          {prediction.usesStartingGuess
            ? `Based on a starting guess of ${daysLabel(item.defaultIntervalDays)}. Gets smarter as you log.`
            : `Expected around ${due}, based on your last ${prediction.predictionGaps.length} gaps (usually ${daysLabel(prediction.typicalInterval)}).`}
        </p>
      </section>

      <div className="mt-3 grid grid-cols-[1.5fr_1fr] gap-2">
        <button type="button" aria-label={`Mark ${item.name} done today`} onClick={logToday} disabled={logging}
          className="min-h-action-large rounded-full bg-teal px-2 font-extrabold text-surface disabled:opacity-60">
          Done today
        </button>
        <button type="button" onClick={() => setDialog('date')}
          className="min-h-action-large rounded-full border border-ink px-2 font-bold">
          Other date
        </button>
      </div>

      <GapChart logs={sortedLogs} gaps={prediction.recentGaps} daysSince={daysSince} overdue={overdue} refill={refill} />
      <ItemHistory logs={sortedLogs} onDelete={onDeleteLog} />

      {dialog === 'date' && <DateDialog today={today} onSave={onLog} onClose={() => setDialog(null)} />}
      {dialog === 'edit' && <EditItemDialog item={item} onClose={() => setDialog(null)} onDeleted={onBack} />}
    </>
  )
}
