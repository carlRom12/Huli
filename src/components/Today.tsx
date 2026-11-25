import { format } from 'date-fns'
import { parseDateKey } from '../data/dates'
import type { predict, Status } from '../data/prediction'
import type { Item } from '../data/types'
import { Brand } from './Brand'
import { Icon } from './Icon'

export type TodayEntry = { item: Item; prediction: ReturnType<typeof predict> }

export const statuses = {
  overdue: { label: 'Overdue', icon: 'warning', text: 'text-overdue-text', bar: 'bg-coral' },
  soon: { label: 'Coming up', icon: 'clock', text: 'text-soon-text', bar: 'bg-amber' },
  ok: { label: 'All good', icon: 'check', text: 'text-teal', bar: 'bg-teal' },
} as const
const statusOrder: Status[] = ['overdue', 'soon', 'ok']

export function dueLabel(days: number): string {
  if (days < 0) {
    const late = Math.ceil(-days)
    return `${late} ${late === 1 ? 'day' : 'days'} overdue`
  }
  const remaining = Math.ceil(days)
  if (remaining === 0) return 'Due today'
  if (remaining === 1) return 'Due tomorrow'
  return `Due in ${remaining} days`
}

type TodayProps = {
  today: string
  entries: TodayEntry[] | null
  selectedId: string | null
  onOpen: (item: Item) => void
  onDone: (item: Item) => void
  onAdd: () => void
}

export function Today({ today, entries, selectedId, onOpen, onDone, onAdd }: TodayProps) {
  const groups = statusOrder.map((status) => ({
    status,
    entries: entries?.filter((entry) => entry.prediction.status === status)
      .sort((a, b) => b.prediction.ratio - a.prediction.ratio) ?? [],
  }))
  const overdueCount = groups[0].entries.length
  const soonCount = groups[1].entries.length
  const dateLabel = format(parseDateKey(today), 'EEE, MMM d')
  const soonLabel = soonCount === 1 ? '1 more is coming up soon.' : `${soonCount} more are coming up soon.`

  return (
    <>
      <header className="mb-5 flex items-center justify-between gap-3 px-1 lg:hidden">
        <Brand />
        <time dateTime={today} className="text-sm font-medium text-muted">
          {dateLabel}
        </time>
      </header>

      {!entries?.length && <time dateTime={today} className="mb-3 hidden px-1 text-sm text-muted lg:block">{dateLabel}</time>}
      {entries === null ? <p role="status" className="text-muted">Loading items…</p> : entries.length === 0 ? (
        <section className="rounded-card border border-border bg-surface p-5">
          <h1 className="text-2xl font-extrabold tracking-tight">Nothing tracked yet</h1>
          <button type="button" onClick={onAdd}
            className="mt-4 min-h-action rounded-button bg-teal px-5 font-bold text-surface">
            Browse starter packs
          </button>
        </section>
      ) : (
        <>
          <div className="mb-5 px-1">
            <h1 className="text-[clamp(1.65rem,7vw,2rem)] leading-tight font-extrabold tracking-tight">
              {overdueCount === 0 ? "You're all caught up." : overdueCount === 1
                ? '1 thing needs you' : `${overdueCount} things need you`}
            </h1>
            <p className={`mt-1 text-muted ${soonCount ? '' : 'hidden lg:block'}`}>
              <time dateTime={today} className="hidden lg:inline">{dateLabel}</time>
              {soonCount > 0 && <><span className="hidden lg:inline"> · </span>{soonLabel}</>}
            </p>
          </div>
          {groups.filter((group) => group.entries.length > 0).map(({ status, entries: groupEntries }) => {
            const style = statuses[status]
            return (
              <section key={status} aria-labelledby={`status-${status}`} className="mb-4">
                <h2 id={`status-${status}`} className={`mb-2 flex items-center gap-2 px-1 text-xs font-extrabold tracking-[0.14em] uppercase ${style.text}`}>
                  <Icon name={style.icon} className="size-4" />
                  {style.label} <span className="text-ink">{groupEntries.length}</span>
                </h2>
                <ul className="space-y-2.5">
                  {groupEntries.map(({ item, prediction }) => (
                    <li key={item.id} className={`flex items-center gap-2 rounded-card border border-border bg-surface px-3 py-2.5 sm:gap-3 ${item.id === selectedId ? 'lg:outline-2 lg:outline-teal' : ''}`}>
                      <button type="button" aria-current={item.id === selectedId || undefined} onClick={() => onOpen(item)}
                        className="flex min-h-action min-w-0 flex-1 items-center gap-2 rounded-[12px] text-left sm:gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-icon-tile sm:size-11">
                          <Icon name={item.icon} className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base leading-tight font-extrabold wrap-break-word">{item.name}</span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted sm:text-sm">
                            <span className={`font-bold ${style.text}`}>
                              <Icon name={style.icon} className="mr-0.5 inline size-3 align-[-0.125em]" />
                              {dueLabel(prediction.daysUntilDue)}
                            </span>
                            {' · every ~'}{Math.round(prediction.typicalInterval)} days
                          </span>
                          <span aria-hidden="true" className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-icon-tile lg:hidden">
                            <span className={`block h-full rounded-full ${style.bar}`}
                              style={{ width: `${Math.min(1, Math.max(0, prediction.ratio)) * 100}%` }} />
                          </span>
                        </span>
                      </button>
                      <button type="button" aria-label={`Mark ${item.name} done today`} onClick={() => onDone(item)}
                        className="min-h-action shrink-0 rounded-full bg-teal px-3.5 font-extrabold text-surface sm:px-4">
                        Done
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </>
      )}
    </>
  )
}
