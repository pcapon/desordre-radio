import { afterEach, describe, expect, it } from 'vitest'
import { baseLocale, overwriteGetLocale } from '#/paraglide/runtime'
import { formatAiredTime, formatDate, nextDay, stationTimeToDate } from './format'
import { prefersFrench } from './accept-language'

afterEach(() => overwriteGetLocale(() => baseLocale))

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
  it('uses a colon in English', () => {
    overwriteGetLocale(() => 'en')
    expect(formatAiredTime('2026-10-19T14:25:16.000Z')).toBe('16:25')
  })
})

describe('formatDate', () => {
  it('follows the locale', () => {
    expect(formatDate('2026-11-05T12:00:00.000Z')).toBe('5 novembre 2026')
    overwriteGetLocale(() => 'en')
    expect(formatDate('2026-11-05T12:00:00.000Z')).toBe('5 November 2026')
  })
})

describe('prefersFrench', () => {
  it('reads the top-ranked language', () => {
    expect(prefersFrench('fr-FR,fr;q=0.9,en;q=0.8')).toBe(true)
    expect(prefersFrench('fr')).toBe(true)
    expect(prefersFrench('en-US,en;q=0.9,fr;q=0.8')).toBe(false)
    expect(prefersFrench('de-DE;q=0.5, fr-CA;q=0.9')).toBe(true)
    expect(prefersFrench('fry')).toBe(false)
    expect(prefersFrench(null)).toBe(false)
  })
})

describe('nextDay', () => {
  it('rolls over months', () => {
    expect(nextDay('2026-10-31')).toBe('2026-11-01')
  })
})
