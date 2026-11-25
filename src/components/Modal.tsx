import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose() }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md rounded-card border border-border bg-surface p-5 text-ink backdrop:bg-ink/45">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-xl font-extrabold">{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={onClose}
          className="grid size-touch shrink-0 place-items-center rounded-full">
          <Icon name="close" className="size-5" />
        </button>
      </header>
      {children}
    </dialog>
  )
}
