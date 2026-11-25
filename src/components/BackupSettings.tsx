import { useRef, useState, type ChangeEvent } from 'react'
import { parseBackup, readBackup, replaceFromBackup } from '../data/backup'
import { dateKey } from '../data/dates'
import { db } from '../data/db'
import { Modal } from './Modal'

export function BackupSettings({ onRestored }: { onRestored: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ReturnType<typeof parseBackup> | null>(null)
  const [working, setWorking] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function exportBackup() {
    setError('')
    setStatus('')
    try {
      const backup = await readBackup(db)
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `huli-backup-${dateKey(new Date())}.json`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setStatus('Backup downloaded.')
    } catch {
      setError('Couldn’t export your backup. Try again.')
    }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setWorking(true)
    setError('')
    setStatus('')
    try {
      setPending(parseBackup(await file.text()))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Couldn’t read this backup.')
    } finally {
      setWorking(false)
    }
  }

  async function confirmRestore() {
    if (!pending) return
    setWorking(true)
    setError('')
    try {
      await replaceFromBackup(db, pending)
      onRestored()
      setStatus('Backup restored.')
    } catch {
      setError('Couldn’t restore your backup. Try again.')
    } finally {
      setPending(null)
      setWorking(false)
    }
  }

  return (
    <section aria-labelledby="data-settings" className="mt-5">
      <h2 id="data-settings" className="mb-2 px-1 text-xs font-extrabold tracking-[0.14em] text-muted uppercase">Your data</h2>
      <div className="divide-y divide-border rounded-card border border-border bg-surface px-4">
        <button type="button" onClick={exportBackup} disabled={working}
          className="block min-h-action w-full py-2.5 text-left font-extrabold disabled:opacity-60">
          Export backup
          <span className="block text-sm font-normal text-muted">Saves your items, history, and reminder settings</span>
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={working}
          className="block min-h-action w-full py-2.5 text-left font-extrabold disabled:opacity-60">
          Restore from backup
        </button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={selectFile} />
      </div>
      {status && <p role="status" className="mt-2 px-1 text-sm text-teal">{status}</p>}
      {error && <p role="alert" className="mt-2 px-1 text-sm text-overdue-text">{error}</p>}
      <p className="mt-2 px-1 text-sm text-muted">Everything stays on this device. Export a backup before changing phones.</p>
      {pending && (
        <Modal title="Restore this backup?" onClose={() => { if (!working) setPending(null) }}>
          <p className="text-sm text-muted">Replace your current items, completion history, and reminder settings with this backup?</p>
          <div className="mt-4 grid gap-2">
            <button type="button" onClick={confirmRestore} disabled={working}
              className="min-h-touch rounded-full bg-teal px-4 font-bold text-surface disabled:opacity-60">
              Replace and restore
            </button>
            <button type="button" onClick={() => setPending(null)} disabled={working}
              className="min-h-touch rounded-full border border-border px-4 font-bold disabled:opacity-60">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
