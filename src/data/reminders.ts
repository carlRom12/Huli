import { format } from 'date-fns'
import { dateKey } from './dates'
import { db } from './db'
import { defaultReminderSettings, type ReminderDelivery } from './reminderSettings'

type DueItems = { overdue: string[]; soon: string[] }

export async function checkNudge({ overdue, soon }: DueItems, now = new Date()): Promise<void> {
  if (document.visibilityState === 'hidden' || !('serviceWorker' in navigator)) return
  const stored = await db.settings.get('reminders')
  const preferences = stored?.id === 'reminders' ? stored.value : defaultReminderSettings
  const badgeCount = overdue.length + (preferences.headsUp ? soon.length : 0)
  try {
    if (badgeCount) await navigator.setAppBadge?.(badgeCount)
    else await navigator.clearAppBadge?.()
  } catch {
    // The browser or OS can disable app badges independently of notifications.
  }

  const today = dateKey(now)
  const time = format(now, 'HH:mm')
  const canNotify = preferences.dailyNudge && time >= preferences.time &&
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  const registration = canNotify ? await navigator.serviceWorker.getRegistration() : undefined

  const claim = await db.transaction('rw', db.settings, async () => {
    // Read the settings again in case they changed while finding the worker.
    const [settings, delivery] = await Promise.all([
      db.settings.get('reminders'),
      db.settings.get('delivery'),
    ])
    const current = settings?.id === 'reminders' ? settings.value : defaultReminderSettings
    const previous: ReminderDelivery = delivery?.id === 'delivery' ? delivery.value : { seenSoonIds: [] }
    const stillSoon = previous.seenSoonIds.filter((id) => soon.includes(id))
    const newlySoon = current.headsUp ? soon.filter((id) => !stillSoon.includes(id)) : []
    if (!registration?.active || !current.dailyNudge || time < current.time ||
        previous.lastSentOn === today || (!overdue.length && !newlySoon.length)) {
      if (stillSoon.length !== previous.seenSoonIds.length) {
        await db.settings.put({ id: 'delivery', value: { ...previous, seenSoonIds: stillSoon } })
      }
      return null
    }

    const next = { lastSentOn: today, seenSoonIds: [...stillSoon, ...newlySoon] }
    await db.settings.put({ id: 'delivery', value: next })
    return { previous: { ...previous, seenSoonIds: stillSoon }, newlySoon: newlySoon.length }
  })

  if (!claim || !registration) return
  const counts = [
    overdue.length ? `${overdue.length} overdue` : '',
    claim.newlySoon ? `${claim.newlySoon} coming up` : '',
  ].filter(Boolean)
  try {
    await registration.showNotification('Huli daily nudge', {
      body: counts.join(' · '),
      tag: 'huli-daily-nudge',
    })
  } catch {
    // Allow a later foreground check to retry delivery.
    await db.transaction('rw', db.settings, async () => {
      const delivery = await db.settings.get('delivery')
      if (delivery?.id === 'delivery' && delivery.value.lastSentOn === today) {
        await db.settings.put({ id: 'delivery', value: claim.previous })
      }
    })
  }
}
