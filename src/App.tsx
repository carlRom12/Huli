import { liveQuery } from 'dexie'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Add } from './components/Add'
import { BottomNav, type Tab } from './components/BottomNav'
import { ItemDetail } from './components/ItemDetail'
import { Today } from './components/Today'
import { dateKey, parseDateKey } from './data/dates'
import { db } from './data/db'
import { predict } from './data/prediction'
import type { Item, Log } from './data/types'

type Snapshot = { items: Item[]; logs: Log[] }
type Notice = { action: 'record' | 'delete'; message: string; log: Log; expiresAt: number }

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

  async function markDone(item: Item, date?: string) {
    setError('')
    const now = new Date()
    const currentDate = dateKey(now)
    const doneOn = date ?? currentDate
    setToday(currentDate)
    try {
      const log = await db.recordDone(item.id, doneOn, now)
      const when = doneOn === currentDate ? 'today' : format(parseDateKey(doneOn), 'MMM d, yyyy')
      setNotice({ action: 'record', message: `Logged ${item.name} for ${when}`, log, expiresAt: Date.now() + 5000 })
      return true
    } catch {
      setError(`Couldn't log ${item.name}. Try again.`)
      return false
    }
  }

  async function deleteLog(log: Log) {
    setError('')
    try {
      const deleted = await db.deleteLog(log.id)
      if (deleted) {
        const date = format(parseDateKey(deleted.doneOn), 'MMM d, yyyy')
        setNotice({ action: 'delete', message: `Deleted log for ${date}`, log: deleted, expiresAt: Date.now() + 5000 })
      }
    } catch {
      setError('Could not delete this log. Try again.')
    }
  }

  async function undoDone() {
    if (!notice || Date.now() >= notice.expiresAt) return
    setNotice(null)
    try {
      if (notice.action === 'delete') await db.restoreLog(notice.log)
      else await db.deleteLog(notice.log.id)
    } catch {
      setError('Could not undo the last change.')
    }
  }

  function selectTab(nextTab: Tab) {
    setSelected(null)
    setTab(nextTab)
    window.scrollTo(0, 0)
  }

  const entries = snapshot && snapshot.items.map((item) => ({
    item,
    prediction: predict(item, snapshot.logs, today),
  }))
  const selectedItem = entries?.find(({ item }) => item.id === selected)
  const showingDetail = tab === 'today' && selectedItem

  function openItem(item: Item) {
    setSelected(item.id)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <main className="mx-auto max-w-[488px] px-4 pt-5 pb-36 sm:pt-6">
        {error && <p role="alert" className="mb-4 rounded-card border border-border bg-surface p-3 text-sm text-overdue-text">{error}</p>}
        {tab === 'today' && !selectedItem && (
          <Today today={today} entries={entries} onOpen={openItem}
            onDone={markDone} onAdd={() => selectTab('add')} />
        )}
        {showingDetail && (
          <ItemDetail key={selectedItem.item.id} {...selectedItem} today={today}
            logs={snapshot?.logs.filter((log) => log.itemId === selectedItem.item.id) ?? []}
            onBack={() => { setSelected(null); window.scrollTo(0, 0) }}
            onLog={(date) => markDone(selectedItem.item, date)} onDeleteLog={deleteLog} />
        )}
        {tab === 'add' && <Add today={today} items={snapshot?.items ?? null} onCustomAdded={() => selectTab('today')} />}
        {tab === 'settings' && <h1 className="text-2xl font-extrabold">Settings</h1>}
      </main>
      <div className={`pointer-events-none fixed inset-x-0 z-20 mx-auto max-w-[488px] px-4 ${showingDetail
        ? 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'
        : 'bottom-[calc(5rem+env(safe-area-inset-bottom))]'}`}>
        {notice && (
          <div className="pointer-events-auto flex min-h-action items-center justify-between gap-3 rounded-button-large bg-ink py-1 pr-2 pl-4 text-surface">
            <p role="status" className="min-w-0 text-sm font-medium wrap-break-word">{notice.message}</p>
            <button type="button" onClick={undoDone}
              className="min-h-touch rounded-full px-3 text-sm font-bold text-mint focus-visible:outline-mint">
              Undo
            </button>
          </div>
        )}
      </div>
      {!showingDetail && <BottomNav active={tab} onSelect={selectTab} />}
    </>
  )
}
