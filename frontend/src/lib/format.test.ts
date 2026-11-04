import { describe, expect, it } from 'vitest'
import { formatAiredTime, nextDay, stationTimeToDate } from './format'

describe('stationTimeToDate', () => {
  it('converts Paris summer time (UTC+2)', () => {
    expect(stationTimeToDate('2026-07-14', '22:15').toISOString()).toBe(
      '2026-07-14T20:15:00.000Z',
    )
  })
  it('converts Paris winter time (UTC+1)', () => {
    expect(stationTimeToDate('2026-01-05').toISOString()).toBe(
      '2026-01-04T23:00:00.000Z',
    )
  })
  it('handles the DST change day', () => {
    expect(stationTimeToDate('2026-10-25', '12:00').toISOString()).toBe(
      '2026-10-25T11:00:00.000Z',
    )
  })
})

describe('formatAiredTime', () => {
  it('shows the station wall clock', () => {
    expect(formatAiredTime('2026-10-19T14:25:16.000Z')).toBe('16h25')
  })
})

describe('nextDay', () => {
  it('rolls over months', () => {
    expect(nextDay('2026-10-31')).toBe('2026-11-01')
  })
})
