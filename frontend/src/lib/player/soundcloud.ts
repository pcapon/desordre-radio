/**
 * Minimal binding to the SoundCloud Widget API
 * (https://developers.soundcloud.com/docs/api/html5-widget).
 *
 * Replays are SoundCloud tracks. They play through one persistent widget
 * iframe owned by `PlayerProvider`, driven by the docked player.
 */

export type SCWidgetEvent =
  | 'ready'
  | 'play'
  | 'pause'
  | 'finish'
  | 'playProgress'
  | 'error'

export type SCProgress = {
  currentPosition: number
  relativePosition: number
  loadedProgress: number
}

export type SCLoadOptions = {
  callback?: () => void
  [option: string]: string | boolean | (() => void) | undefined
}

export interface SCWidget {
  bind: (event: SCWidgetEvent, listener: (e?: SCProgress) => void) => void
  load: (url: string, options?: SCLoadOptions) => void
  play: () => void
  pause: () => void
  /** Milliseconds. */
  seekTo: (ms: number) => void
  /** 0–100. */
  setVolume: (volume: number) => void
  getDuration: (cb: (ms: number) => void) => void
}

declare global {
  interface Window {
    SC?: { Widget: (iframe: HTMLIFrameElement) => SCWidget }
  }
}

const API_SRC = 'https://w.soundcloud.com/player/api.js'

let apiPromise: Promise<NonNullable<Window['SC']>> | null = null

/** Load the widget API script once. */
export function loadSoundCloudApi(): Promise<NonNullable<Window['SC']>> {
  if (window.SC) return Promise.resolve(window.SC)
  apiPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = API_SRC
    script.async = true
    script.onload = () =>
      window.SC ? resolve(window.SC) : reject(new Error('SC missing'))
    script.onerror = () => {
      apiPromise = null
      reject(new Error('Could not load the SoundCloud widget API'))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}

/** Widget display options, shared by the iframe src and `widget.load`. */
export const WIDGET_OPTIONS = {
  visual: false,
  show_artwork: true,
  show_comments: false,
  show_reposts: false,
  show_teaser: false,
  hide_related: true,
  buying: false,
  sharing: false,
  download: false,
  color: '#f9461c',
} as const

export function widgetSrc(trackUrl: string, autoPlay: boolean): string {
  const params = new URLSearchParams({ url: trackUrl, auto_play: String(autoPlay) })
  for (const [key, value] of Object.entries(WIDGET_OPTIONS)) {
    params.set(key, String(value))
  }
  return `https://w.soundcloud.com/player/?${params.toString()}`
}

/** Height of the classic (non-visual) widget. */
export const WIDGET_HEIGHT = 166
