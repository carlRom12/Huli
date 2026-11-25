export type ReminderSettings = {
  dailyNudge: boolean
  time: string
  headsUp: boolean
}

export type ReminderDelivery = {
  lastSentOn?: string
  seenSoonIds: string[]
}

export type SettingsRow =
  | { id: 'reminders'; value: ReminderSettings }
  | { id: 'delivery'; value: ReminderDelivery }

export const defaultReminderSettings: ReminderSettings = {
  dailyNudge: true,
  time: '08:00',
  headsUp: false,
}

export function isReminderTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}
