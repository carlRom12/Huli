import { addDays, differenceInCalendarDays } from 'date-fns'
import { dateKey, parseDateKey } from './dates'
import type { Item, Log } from './types'

export type Status = 'ok' | 'soon' | 'overdue'

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

export function predict(item: Item, logs: readonly Log[], today: string) {
  const todayDate = parseDateKey(today)
  const doneDates = [...new Set(logs.filter((log) => log.itemId === item.id).map((log) => log.doneOn))].sort()
  const dates = doneDates.slice(-6).map(parseDateKey)
  const recentGaps = dates.slice(1).map((date, index) =>
    differenceInCalendarDays(date, dates[index]),
  )

  const cutoff = recentGaps.length ? median(recentGaps) * 3 : 0
  const predictionGaps = recentGaps.filter((gap) => gap <= cutoff)
  const usesStartingGuess = predictionGaps.length < 2
  const typicalInterval = usesStartingGuess
    ? item.defaultIntervalDays
    : median(predictionGaps)

  const lastDone = doneDates.at(-1) ?? dateKey(new Date(item.createdAt))
  const lastDoneDate = parseDateKey(lastDone)
  const daysSince = differenceInCalendarDays(todayDate, lastDoneDate)
  const ratio = daysSince / typicalInterval
  const status: Status = ratio < 0.75 ? 'ok' : ratio <= 1 ? 'soon' : 'overdue'

  return {
    lastDone,
    typicalInterval,
    daysSince,
    ratio,
    status,
    daysUntilDue: typicalInterval - daysSince,
    dueOn: dateKey(addDays(lastDoneDate, Math.ceil(typicalInterval))),
    recentGaps,
    predictionGaps,
    usesStartingGuess,
  }
}
