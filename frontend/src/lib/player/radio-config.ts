import type { PlayerTrack } from './player-context'

/**
 * The live stream URL. Override via VITE_RADIO_STREAM_URL.
 *
 * The default is a public SomaFM stream so the player produces real audio in
 * development / demos. Replace it with your station's stream (Icecast/Shoutcast
 * manifest or an HLS .m3u8) for production.
 */
export const LIVE_STREAM_URL: string =
  import.meta.env.VITE_RADIO_STREAM_URL ??
  'https://ice1.somafm.com/groovesalad-128-mp3'

export const STATION_NAME = 'Désordre Radio'

/** The canonical "live" track handed to the player. */
export const LIVE_TRACK: PlayerTrack = {
  id: 'live',
  kind: 'live',
  title: 'Direct',
  subtitle: STATION_NAME,
  src: LIVE_STREAM_URL,
}

/** mm:ss / h:mm:ss formatter that tolerates NaN / Infinity (live streams). */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
