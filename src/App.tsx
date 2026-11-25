import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { Icon } from './components/Icon'
import { Today } from './components/Today'
import { dateKey } from './data/dates'
import { db } from './data/db'
import { predict } from './data/prediction'
import type { Item, Log } from './data/types'

type Snapshot = { items: Item[]; logs: Log[] }
type Notice = { name: string; log: Log; expiresAt: number }

export function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [selected, setSelected] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [today, setToday] = useState(() => dateKey(new Date()))
  const [notice, setNotice] = useState<Notice | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.transaction('r', db.items, db.logs, async () => ({
        items: await db.items.toArray(),
        logs: await db.logs.toArray(),
      })),
    ).subscribe({
      next: setSnapshot,
      error: () => setError('Huli couldn’t load your items. Refresh to try again.'),
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const refresh = () => setToday(dateKey(new Date()))
    const timer = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => {
      setNotice((current) => current === notice ? null : current)
    }, Math.max(0, notice.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [notice])

  async function markDone(item: Item) {
    setError('')
    const now = new Date()
    const doneOn = dateKey(now)
    setToday(doneOn)
    try {
      const log = await db.recordDone(item.id, doneOn, now)
      setNotice({ name: item.name, log, expiresAt: Date.now() + 5000 })
    } catch {
      setError(`Couldn't log ${item.name}. Try again.`)
    }
  }

  async function undoDone() {
    if (!notice || Date.now() >= notice.expiresAt) return
    setNotice(null)
    try {
      await db.deleteLog(notice.log.id)
    } catch {
      setError(`Couldn't undo the log for ${notice.name}.`)
    }
  }

  function selectTab(nextTab: Tab) {
    setSelected(null)
    setTab(nextTab)
  }

  const entries = snapshot && snapshot.items.map((item) => ({
    item,
    prediction: predict(item, snapshot.logs, today),
  }))
  const selectedItem = entries?.find(({ item }) => item.id === selected)

  return (
    <>
      <main className="mx-auto max-w-[488px] px-4 pt-5 pb-36 sm:pt-6">
        {error && <p role="alert" className="mb-4 rounded-card border border-border bg-surface p-3 text-sm text-overdue-text">{error}</p>}
        {tab === 'today' && !selectedItem && (
          <Today today={today} entries={entries} onOpen={(item) => setSelected(item.id)}
            onDone={markDone} onAdd={() => selectTab('add')} />
        )}
        {tab === 'today' && selectedItem && (
          <>
            <button type="button" aria-label="Back to Today" onClick={() => setSelected(null)}
              className="mb-3 grid size-touch place-items-center rounded-full">
              <Icon name="back" className="size-5" />
            </button>
            <h1 className="flex items-center gap-3 text-2xl font-extrabold">
              <span className="grid size-action shrink-0 place-items-center rounded-[13px] bg-icon-tile">
                <Icon name={selectedItem.item.icon} className="size-6" />
              </span>
              {selectedItem.item.name}
            </h1>
          </>
        )}
        {tab === 'add' && <h1 className="text-2xl font-extrabold">Starter packs</h1>}
        {tab === 'settings' && <h1 className="text-2xl font-extrabold">Settings</h1>}
      </main>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[488px] px-4">
        {notice && (
          <div className="pointer-events-auto flex min-h-action items-center justify-between gap-3 rounded-button-large bg-ink py-1 pr-2 pl-4 text-surface">
            <p role="status" className="text-sm font-medium">Logged {notice.name} for today</p>
            <button type="button" onClick={undoDone}
              className="min-h-touch rounded-full px-3 text-sm font-bold text-mint focus-visible:outline-mint">
              Undo
            </button>
          </div>
        )}
      </div>
      <BottomNav active={tab} onSelect={selectTab} />
    </>
  )
}
