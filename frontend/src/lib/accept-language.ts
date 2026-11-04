/** True when the browser's top language is French (fr, fr-FR, fr-CA…). */
export function prefersFrench(header: string | null): boolean {
  if (!header) return false
  const top = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 }
    })
    .filter((l) => l.tag && l.tag !== '*' && l.q > 0)
    .sort((a, b) => b.q - a.q)[0]
  return top?.tag === 'fr' || top?.tag.startsWith('fr-') === true
}
