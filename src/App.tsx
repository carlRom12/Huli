import { liveQuery } from 'dexie'
import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Add } from './components/Add'
import { ItemDetail } from './components/ItemDetail'
import { Navigation, type Tab } from './components/Navigation'
import { Settings, type ReminderPermission } from './components/Settings'
import { Today } from './components/Today'
import { dateKey, parseDateKey } from './data/dates'
import { db } from './data/db'
import { predict } from './data/prediction'
import { defaultReminderSettings, isReminderTime, type ReminderSettings } from './data/reminderSettings'
import { checkNudge } from './data/reminders'
import type { Item, Log } from './data/types'
import { useInstall } from './hooks/useInstall'

type Snapshot = { items: Item[]; logs: Log[] }
type Notice = { action: 'record' | 'delete'; message: string; log: Log; expiresAt: number }

function currentPermission(): ReminderPermission {
  return typeof Notification === 'undefined' || !('serviceWorker' in navigator)
    ? 'unavailable'
    : Notification.permission
}

export function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [selected, setSelected] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [today, setToday] = useState(() => dateKey(new Date()))
  const [notice, setNotice] = useState<Notice | null>(null)
  const [error, setError] = useState('')
  const [reminders, setReminders] = useState(defaultReminderSettings)
  const [permission, setPermission] = useState(currentPermission)
  const install = useInstall()

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
    const subscription = liveQuery(() => db.settings.get('reminders')).subscribe({
      next: (row) => setReminders(row?.id === 'reminders' ? row.value : defaultReminderSettings),
      error: () => setError('Huli couldn’t load your reminder settings. Refresh to try again.'),
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const refresh = () => setToday(dateKey(new Date()))
    const refreshPermission = () => setPermission(currentPermission())
    const timer = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refreshPermission)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refreshPermission)
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

  async function updateReminders(changes: Partial<ReminderSettings>) {
    if (changes.time !== undefined && !isReminderTime(changes.time)) return
    setError('')
    try {
      await db.transaction('rw', db.settings, async () => {
        const stored = await db.settings.get('reminders')
        const current = stored?.id === 'reminders' ? stored.value : defaultReminderSettings
        await db.settings.put({ id: 'reminders', value: { ...current, ...changes } })
      })
    } catch {
      setError('Couldn’t save your reminder settings. Try again.')
    }
  }

  async function requestPermission() {
    setError('')
    try {
      if (currentPermission() === 'default') setPermission(await Notification.requestPermission())
    } catch {
      setError('Couldn’t request notification permission in this session.')
    }
  }

  const entries = useMemo(() => snapshot && snapshot.items.map((item) => ({
    item,
    prediction: predict(item, snapshot.logs, today),
  })), [snapshot, today])

  useEffect(() => {
    if (!entries) return
    const due = {
      overdue: entries.filter(({ prediction }) => prediction.status === 'overdue').map(({ item }) => item.id),
      soon: entries.filter(({ prediction }) => prediction.status === 'soon').map(({ item }) => item.id),
    }
    const check = () => {
      if (dateKey(new Date()) === today) void checkNudge(due).catch(() => {
        // A later foreground check can retry an unavailable database or service worker.
      })
    }
    check()
    const timer = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    navigator.serviceWorker?.addEventListener('controllerchange', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
      navigator.serviceWorker?.removeEventListener('controllerchange', check)
    }
  }, [entries, permission, reminders, today])
  const selectedItem = entries?.find(({ item }) => item.id === selected)
  const showingDetail = tab === 'today' && selectedItem !== undefined

  function openItem(item: Item) {
    setSelected(item.id)
    window.scrollTo(0, 0)
  }

  return (
    <div className="lg:grid lg:h-dvh lg:grid-cols-[200px_minmax(0,1fr)] lg:overflow-hidden">
      <Navigation active={tab} onSelect={selectTab} hideOnPhone={showingDetail} />
      <main className="mx-auto max-w-[488px] px-4 pt-5 pb-36 sm:pt-6 lg:mx-0 lg:flex lg:min-h-0 lg:min-w-0 lg:max-w-none lg:flex-col lg:p-0">
        {error && <p role="alert" className="mb-4 rounded-card border border-border bg-surface p-3 text-sm text-overdue-text lg:mx-4 lg:mt-4">{error}</p>}
        <div key={tab} className="lg:flex lg:min-h-0 lg:flex-1">
          <div className={`lg:block lg:w-[460px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border lg:px-6 lg:pt-7 lg:pb-16 ${showingDetail ? 'hidden' : ''}`}>
            {tab === 'today' && (
              <Today today={today} entries={entries} selectedId={selected} onOpen={openItem}
                onDone={markDone} onAdd={() => selectTab('add')} />
            )}
            {tab === 'add' && <Add today={today} items={snapshot?.items ?? null} onCustomAdded={() => selectTab('today')} />}
            {tab === 'settings' && (
              <Settings reminders={reminders} onChange={updateReminders} permission={permission}
                onPermissionRequest={requestPermission} install={install}
                onRestored={() => { setNotice(null); setError('') }} />
            )}
          </div>

          {tab === 'today' && (
            <section aria-label="Item detail" key={selectedItem?.item.id}
              className={`lg:block lg:min-w-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:pt-7 lg:pb-16 xl:px-12 ${selectedItem ? '' : 'hidden'}`}>
              <div className="lg:mx-auto lg:max-w-[520px]">
                {selectedItem ? (
                  <ItemDetail {...selectedItem} today={today}
                    logs={snapshot?.logs.filter((log) => log.itemId === selectedItem.item.id) ?? []}
                    onBack={() => { setSelected(null); window.scrollTo(0, 0) }}
                    onLog={(date) => markDone(selectedItem.item, date)} onDeleteLog={deleteLog} />
                ) : entries && entries.length > 0 && (
                  <p className="text-sm text-muted">Select an item to see its history.</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      <div className={`pointer-events-none fixed inset-x-0 z-20 mx-auto max-w-[488px] px-4 lg:bottom-4 ${showingDetail
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
    </div>
  )
}
