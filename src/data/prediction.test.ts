import { describe, expect, it } from 'vitest'
import { predict } from './prediction'
import type { Item, Log } from './types'

const item: Item = {
  id: 'lpg',
  name: 'LPG tank',
  icon: 'flame',
  defaultIntervalDays: 35,
  createdAt: new Date(2026, 9, 13, 12).getTime(),
}

function logs(...dates: string[]): Log[] {
  return dates.map((doneOn, index) => ({
    id: String(index),
    itemId: item.id,
    doneOn,
    createdAt: item.createdAt + index,
  }))
}

describe('predict', () => {
  it('uses the local creation date without logs', () => {
    expect(predict(item, [], '2026-11-17')).toMatchObject({
      lastDone: '2026-10-13',
      typicalInterval: 35,
      daysSince: 35,
      status: 'soon',
      dueOn: '2026-11-17',
      usesStartingGuess: true,
    })
  })

  it('uses the only completion date with one log', () => {
    expect(predict(item, logs('2026-11-03'), '2026-11-04')).toMatchObject({
      lastDone: '2026-11-03',
      typicalInterval: 35,
      daysSince: 1,
      recentGaps: [],
    })
  })

  it('keeps the starting guess with only one gap', () => {
    expect(predict(item, logs('2026-10-13', '2026-10-27'), '2026-11-03')).toMatchObject({
      typicalInterval: 35,
      recentGaps: [14],
      usesStartingGuess: true,
    })
  })

  it.each([
    ['2026-01-03', 0.5, 'ok'],
    ['2026-01-04', 0.75, 'soon'],
    ['2026-01-05', 1, 'soon'],
    ['2026-01-06', 1.25, 'overdue'],
  ])('assigns the correct status on %s', (today, ratio, status) => {
    expect(predict({ ...item, defaultIntervalDays: 4 }, logs('2026-01-01'), today))
      .toMatchObject({ ratio, status })
  })

  it('matches the LPG worked example', () => {
    const history = logs('2026-05-14', '2026-06-20', '2026-07-28', '2026-09-05', '2026-10-13')
    expect(predict(item, history, '2026-11-24')).toMatchObject({
      lastDone: '2026-10-13',
      typicalInterval: 38,
      daysSince: 42,
      ratio: 42 / 38,
      status: 'overdue',
      daysUntilDue: -4,
      dueOn: '2026-11-20',
      predictionGaps: [37, 38, 39, 38],
      usesStartingGuess: false,
    })
  })

  it('uses the last five gaps and excludes gaps above three times their median', () => {
    const history = logs(
      '2026-01-01', '2026-01-08', '2026-02-10', '2026-02-20',
      '2026-03-02', '2026-04-01', '2026-04-11', '2026-05-22',
    )
    expect(predict(item, history, '2026-05-23')).toMatchObject({
      recentGaps: [10, 10, 30, 10, 41],
      predictionGaps: [10, 10, 30, 10],
      typicalInterval: 10,
    })
  })

  it('sorts backdated logs, ignores same-day duplicates and retains fractional medians', () => {
    const history = logs('2026-11-08', '2026-10-28', '2026-11-08', '2026-11-02')
    history.push({ ...history[0], id: 'other', itemId: 'water', doneOn: '2026-11-12' })
    expect(predict(item, history, '2026-11-12')).toMatchObject({
      lastDone: '2026-11-08',
      recentGaps: [5, 6],
      typicalInterval: 5.5,
      dueOn: '2026-11-14',
    })
  })
})
