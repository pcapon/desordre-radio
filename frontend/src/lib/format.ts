/**
 * Air dates are shown and searched in the station's time zone, not the
 * visitor's: "diffusé à 22h" means 22h in Paris, and SSR (UTC container) and
 * the browser render the same string, so there is no hydration mismatch.
 */
export const STATION_TIME_ZONE = 'Europe/Paris'

/** "1 h 20" / "45 min" from a duration in seconds. */
export function formatDuration(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h} h ${m}` : `${h} h`
  return `${m} min`
}

/** Localised long date (French, station time zone) from an ISO string. */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: STATION_TIME_ZONE,
  })
}

/** "22h15" (station time zone) from an ISO air date. */
export function formatAiredTime(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d
    .toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: STATION_TIME_ZONE,
    })
    .replace(':', 'h')
}

/** "jeudi 5 novembre" from an ISO string, in the visitor's time zone. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** "20:00" from an ISO string, in the visitor's time zone. */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Offset (ms) of `timeZone` from UTC at the instant `utcMs`. */
function zoneOffset(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value)
  const wall = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return wall - Math.floor(utcMs / 1000) * 1000
}

/**
 * The UTC instant of a wall-clock time in the station time zone.
 * `date` is "YYYY-MM-DD", `time` "HH:MM" (defaults to midnight).
 */
export function stationTimeToDate(date: string, time = '00:00'): Date {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  // Two passes settle the offset across DST changes.
  let utc = wall - zoneOffset(wall, STATION_TIME_ZONE)
  utc = wall - zoneOffset(utc, STATION_TIME_ZONE)
  return new Date(utc)
}

/** Next calendar day of a "YYYY-MM-DD" string. */
export function nextDay(date: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10)
}
