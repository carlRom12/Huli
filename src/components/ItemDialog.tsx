import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { db } from '../data/db'
import { itemIcons, type Item, type ItemIcon } from '../data/types'
import { Icon } from './Icon'

const field = 'block min-h-touch w-full rounded-xl border border-border bg-bg px-3'
const primary = 'min-h-touch rounded-full bg-teal px-4 font-bold text-surface disabled:opacity-60'

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog ref={ref} aria-labelledby="item-dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md rounded-card border border-border bg-surface p-5 text-ink backdrop:bg-ink/45">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id="item-dialog-title" className="text-xl font-extrabold">{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={onClose}
          className="grid size-touch shrink-0 place-items-center rounded-full">
          <Icon name="close" className="size-5" />
        </button>
      </header>
      {children}
    </dialog>
  )
}

export function DateDialog({ today, onSave, onClose }: {
  today: string
  onSave: (date: string) => Promise<boolean>
  onClose: () => void
}) {
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFailed(false)
    if (await onSave(date)) onClose()
    else {
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <Modal title="Other date" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-sm font-bold">
          Date completed
          <input type="date" className={field} required max={today} value={date}
            onChange={(event) => setDate(event.target.value)} />
        </label>
        {failed && <p role="alert" className="text-sm text-overdue-text">Couldn’t save this date. Choose today or an earlier date and try again.</p>}
        <button type="submit" disabled={saving} className={primary}>Log completion</button>
      </form>
    </Modal>
  )
}

export function EditItemDialog({ item, onClose, onDeleted }: {
  item: Item
  onClose: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(item.name)
  const [icon, setIcon] = useState(item.icon)
  const [interval, setInterval] = useState(String(item.defaultIntervalDays))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await db.updateItem(item.id, { name, icon, defaultIntervalDays: Number(interval) })
      onClose()
    } catch (cause) {
      setError(cause instanceof RangeError ? cause.message : 'Couldn’t save these changes. Try again.')
      setWorking(false)
    }
  }

  async function deleteItem() {
    setWorking(true)
    setError('')
    try {
      await db.deleteItem(item.id)
      onDeleted()
    } catch {
      setError('Couldn’t delete this item. Try again.')
      setWorking(false)
    }
  }

  return (
    <Modal title={confirmDelete ? 'Delete item?' : 'Edit item'} onClose={onClose}>
      {confirmDelete ? (
        <div className="grid gap-3">
          <p className="wrap-break-word">Remove {item.name} and all of its completion history?</p>
          <button type="button" disabled={working} className="min-h-touch rounded-full bg-overdue-text px-4 font-bold text-surface disabled:opacity-60"
            onClick={deleteItem}>Delete item and history</button>
          <button type="button" disabled={working} className="min-h-touch rounded-full border border-border px-4 font-bold"
            onClick={() => { setError(''); setConfirmDelete(false) }}>Cancel</button>
        </div>
      ) : (
        <form onSubmit={save} className="grid gap-3">
          <label className="grid gap-1 text-sm font-bold">
            Name
            <input className={field} required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Icon
            <select className={`${field} capitalize`} value={icon} onChange={(event) => setIcon(event.target.value as ItemIcon)}>
              {itemIcons.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Starting interval (days)
            <input type="number" className={field} required min={1} step={1} value={interval}
              onChange={(event) => setInterval(event.target.value)} />
          </label>
          <button type="submit" disabled={working} className={primary}>Save changes</button>
          <button type="button" disabled={working} className="min-h-touch rounded-full px-4 font-bold text-overdue-text"
            onClick={() => { setError(''); setConfirmDelete(true) }}>Delete item</button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-overdue-text">{error}</p>}
    </Modal>
  )
}
