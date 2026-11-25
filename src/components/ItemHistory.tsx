import { differenceInCalendarDays, format } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { parseDateKey } from '../data/dates'
import type { Log } from '../data/types'
import { Icon } from './Icon'

export function daysLabel(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

export function GapChart({ logs, gaps, daysSince, overdue, refill }: {
  logs: Log[]
  gaps: number[]
  daysSince: number
  overdue: boolean
  refill: boolean
}) {
  const dates = [...new Set(logs.map(({ doneOn }) => doneOn))].slice(0, gaps.length).reverse()
  const bars = [
    ...gaps.map((days, index) => ({ key: dates[index], label: format(parseDateKey(dates[index]), 'MMM'), days })),
    { key: 'now', label: 'Now', days: Math.max(0, daysSince) },
  ]
  const max = Math.max(1, ...bars.map(({ days }) => days))

  return (
    <section aria-labelledby="gap-heading" className="mt-6">
      <h2 id="gap-heading" className="px-1 text-xs font-extrabold tracking-[0.14em] text-muted uppercase">
        {refill ? 'Days between refills' : 'Days between completions'}
      </h2>
      <ul aria-label="Completion gaps in days" className="mt-3 flex justify-start">
        {bars.map(({ key, label, days }) => {
          const isOverdue = key === 'now' && overdue
          return (
            <li key={key} className="flex min-w-0 max-w-20 flex-1 flex-col items-center">
              <div className="flex h-24 w-full flex-col items-center justify-end border-b border-border px-1">
                <span className={`mb-1 text-xs font-bold ${isOverdue ? 'text-overdue-text' : ''}`}
                  aria-label={`${daysLabel(days)}${isOverdue ? ', overdue' : ''}`}>
                  {days}{isOverdue && '+'}
                </span>
                <div aria-hidden="true" className={`w-full max-w-10 rounded-t-lg rounded-b-sm ${isOverdue ? 'bg-coral' : 'bg-teal'}`}
                  style={{ height: `${days ? Math.max(4, (days / max) * 68) : 2}px` }} />
              </div>
              <span className="mt-1 text-xs text-muted">{label}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function HistoryRow({ log, previous, onDelete }: { log: Log; previous?: Log; onDelete: (log: Log) => void }) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const press = useRef<{ x: number; y: number; timer: number } | null>(null)
  const date = parseDateKey(log.doneOn)
  const label = format(date, 'MMM d, yyyy')
  const gap = previous ? differenceInCalendarDays(date, parseDateKey(previous.doneOn)) : null

  function stopPress() {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }

  useEffect(() => stopPress, [])

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex min-h-action items-center gap-2 px-1"
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
          stopPress()
          press.current = {
            x: event.clientX,
            y: event.clientY,
            timer: window.setTimeout(() => setActionsOpen(true), 500),
          }
        }}
        onPointerMove={(event) => {
          const start = press.current
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) stopPress()
        }}
        onPointerUp={stopPress} onPointerCancel={stopPress} onPointerLeave={stopPress}
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest('button')) return
          event.preventDefault()
          setActionsOpen(true)
          stopPress()
        }}>
        <time dateTime={log.doneOn} className="mr-auto text-sm font-bold sm:text-base">{label}</time>
        {gap !== null && <span className="text-sm text-muted">{daysLabel(gap)} after</span>}
        <button type="button" aria-label={`Actions for ${label} log`} aria-expanded={actionsOpen}
          onClick={() => setActionsOpen(!actionsOpen)} className="grid size-touch shrink-0 place-items-center rounded-full text-muted">
          <Icon name="more" className="size-5" />
        </button>
      </div>
      {actionsOpen && (
        <button type="button" onClick={() => { setActionsOpen(false); onDelete(log) }}
          className="mb-2 min-h-touch rounded-full border border-border px-4 text-sm font-bold text-overdue-text">
          Delete log
        </button>
      )}
    </li>
  )
}

export function ItemHistory({ logs, onDelete }: { logs: Log[]; onDelete: (log: Log) => void }) {
  return (
    <section aria-labelledby="history-heading" className="mt-6">
      <h2 id="history-heading" className="px-1 text-xs font-extrabold tracking-[0.14em] text-muted uppercase">History</h2>
      {logs.length ? (
        <ul className="mt-2">
          {logs.map((log, index) => <HistoryRow key={log.id} log={log} previous={logs[index + 1]} onDelete={onDelete} />)}
        </ul>
      ) : <p className="mt-2 px-1 text-sm text-muted">No completions logged yet.</p>}
    </section>
  )
}
