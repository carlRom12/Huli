import { useId, useState } from 'react'
import type { ReminderSettings } from '../data/reminderSettings'
import type { useInstall } from '../hooks/useInstall'
import { BackupSettings } from './BackupSettings'
import { Modal } from './Modal'

const heading = 'mb-2 px-1 text-xs font-extrabold tracking-[0.14em] text-muted uppercase'
const card = 'rounded-card border border-border bg-surface px-4'

function SettingSwitch({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <p id={id} className="font-extrabold">{label}</p>
        <p id={`${id}-hint`} className="text-sm text-muted">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={id} aria-describedby={`${id}-hint`}
        onClick={() => onChange(!checked)} className="grid min-h-touch shrink-0 place-items-center rounded-full">
        <span className={`flex h-8 w-13 items-center rounded-full p-1 ${checked ? 'justify-end bg-teal' : 'bg-border'}`}>
          <span className="size-6 rounded-full bg-surface" />
        </span>
      </button>
    </div>
  )
}

function isAppleMobile() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export type ReminderPermission = NotificationPermission | 'unavailable'

export function Settings({ reminders, onChange, permission, onPermissionRequest, install, onRestored }: {
  reminders: ReminderSettings
  onChange: (changes: Partial<ReminderSettings>) => void
  permission: ReminderPermission
  onPermissionRequest: () => void
  install: ReturnType<typeof useInstall>
  onRestored: () => void
}) {
  const [showInstall, setShowInstall] = useState(false)

  return (
    <>
      <h1 className="mb-5 px-1 text-[clamp(1.75rem,8vw,2.25rem)] leading-tight font-extrabold tracking-tight">Settings</h1>
      <section aria-labelledby="reminder-settings">
        <h2 id="reminder-settings" className={heading}>Reminders</h2>
        <div className={`${card} divide-y divide-border`}>
          <SettingSwitch label="Daily nudge" description="At most one notification per day when something needs you"
            checked={reminders.dailyNudge} onChange={(dailyNudge) => onChange({ dailyNudge })} />
          <label className="flex min-h-action items-center justify-between gap-2 py-1 font-extrabold">
            Time
            <input type="time" value={reminders.time} onChange={(event) => {
              if (event.target.value) onChange({ time: event.target.value })
            }} className="min-h-touch min-w-0 rounded-full px-2 text-sm font-bold text-teal" />
          </label>
          <SettingSwitch label="Heads up before due" description="Also remind me when an item moves to Coming up"
            checked={reminders.headsUp} onChange={(headsUp) => onChange({ headsUp })} />
        </div>
        <p className="mt-2 px-1 text-sm text-muted">Huli checks reminders while the app is open, at or after the time you choose.</p>
        {reminders.dailyNudge && permission === 'default' && (
          <button type="button" onClick={onPermissionRequest}
            className="mt-2 min-h-touch rounded-full border border-teal px-4 text-sm font-bold text-teal">
            Enable notifications
          </button>
        )}
        {reminders.dailyNudge && permission === 'denied' && (
          <p className="mt-2 px-1 text-sm text-muted">Allow notifications in your browser or device settings.</p>
        )}
        {reminders.dailyNudge && permission === 'unavailable' && (
          <p className="mt-2 px-1 text-sm text-muted">
            {isAppleMobile() ? 'Add Huli to your home screen and open it there to enable notifications.' : 'Notifications are unavailable in this browser session.'}
          </p>
        )}
      </section>

      <BackupSettings onRestored={onRestored} />

      <section aria-labelledby="app-settings" className="mt-5">
        <h2 id="app-settings" className={heading}>Get the app</h2>
        <div className={card}>
          {install.installed ? <p className="py-3 font-bold text-teal">Huli is installed</p> : (
            <button type="button" onClick={async () => { if (!(await install.install())) setShowInstall(true) }}
              className="block min-h-action w-full py-2.5 text-left font-extrabold">
              Add Huli to home screen
              <span className="block text-sm font-normal text-muted">Open Huli from your home screen</span>
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="later-settings" className="mt-5">
        <h2 id="later-settings" className={heading}>Coming later</h2>
        <button type="button" disabled className={`${card} min-h-action w-full py-2.5 text-left font-bold text-muted`}>
          Share with household
        </button>
      </section>

      {showInstall && (
        <Modal title="Add Huli to home screen" onClose={() => setShowInstall(false)}>
          {isAppleMobile() ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>Open Huli in Safari and tap Share.</li>
              <li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li>
            </ol>
          ) : (
            <p className="text-sm text-muted">Open your browser menu and choose <strong>Install app</strong> or <strong>Add to home screen</strong> if offered.</p>
          )}
        </Modal>
      )}
    </>
  )
}
