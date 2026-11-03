/** "1 h 20" / "45 min" from a duration in seconds. */
export function formatDuration(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h} h ${m}` : `${h} h`
  return `${m} min`
}

/** Localised long date (French) from an ISO string. */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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
