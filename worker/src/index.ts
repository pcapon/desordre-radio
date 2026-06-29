import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { config } from './config.js'
import { skipAutoDj } from './liquidsoap.js'
import {
  appendNowPlayingHistory,
  writeNowPlaying,
  type NowPlayingPayload,
} from './strapi.js'
import { RadioState, annotateUri } from './state.js'

const state = new RadioState()
const app = new Hono()

// Connected SSE clients. Each entry pushes a JSON string to one browser.
const sseClients = new Set<(data: string) => void>()

function broadcastNowPlaying() {
  const data = JSON.stringify(state.nowPlaying)
  for (const send of sseClients) {
    try {
      send(data)
    } catch {
      /* a dead client is cleaned up by its own stream lifecycle */
    }
  }
}

/**
 * Apply a now-playing change: update cache, persist to Strapi (canonical +
 * history), and push to SSE clients. Delayed by STREAM_BUFFER_DELAY_MS so the
 * UI matches the buffered audio listeners actually hear.
 */
function applyNowPlaying(next: NowPlayingPayload) {
  state.nowPlaying = next
  broadcastNowPlaying()
  writeNowPlaying(next).catch((err) =>
    console.warn('[metadata] Strapi write failed:', err.message),
  )
  appendNowPlayingHistory(next).catch((err) =>
    console.warn('[metadata] history append failed:', err.message),
  )
}

app.get('/health', (c) =>
  c.json({
    ok: true,
    tracks: state.tracks.length,
    playlists: state.playlists.length,
    schedules: state.schedules.length,
    activeSchedule: state.activeScheduleId,
  }),
)

/**
 * Liquidsoap's request.dynamic source calls this to get the next track.
 * Returns a single plain-text annotate: URI, or an empty body when there is
 * nothing to play (Liquidsoap then retries after retry_delay).
 */
app.get('/next', (c) => {
  const pick = state.pickNext()
  if (!pick) {
    console.warn('[next] no playable track available')
    return c.text('', 200)
  }
  const uri = annotateUri(pick.track)
  if (!uri) return c.text('', 200)
  console.log(
    `[next] (${pick.source}) ${pick.track.artist ?? ''} - ${pick.track.title}`,
  )
  return c.text(uri, 200)
})

/**
 * Liquidsoap posts here on every track change (source.on_metadata).
 * The update is applied after STREAM_BUFFER_DELAY_MS so it lands in sync with
 * the audio listeners hear. Protected by a shared secret when configured.
 */
app.post('/metadata', async (c) => {
  if (
    config.metadataSecret &&
    c.req.header('x-metadata-secret') !== config.metadataSecret
  ) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  let body: Record<string, unknown> = {}
  try {
    body = await c.req.json()
  } catch {
    /* tolerate empty/invalid bodies */
  }

  const next: NowPlayingPayload = {
    title: typeof body.title === 'string' ? body.title : undefined,
    artist: typeof body.artist === 'string' ? body.artist : undefined,
    source: typeof body.source === 'string' ? body.source : 'autodj',
    trackDocumentId:
      typeof body.trackDocumentId === 'string'
        ? body.trackDocumentId
        : undefined,
    startedAt: new Date().toISOString(),
    raw: body,
  }

  // Delay so the UI flips when the track is actually audible, not when it is
  // queued at the source.
  setTimeout(() => applyNowPlaying(next), config.streamBufferDelayMs)

  return c.json({ ok: true, appliesInMs: config.streamBufferDelayMs })
})

/**
 * SSE live feed of now-playing. Sends the current track on connect, then pushes
 * every change. EventSource on the client auto-reconnects. A periodic ping
 * keeps intermediaries from closing an idle connection.
 */
app.get('/now-playing/stream', (c) =>
  streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: 'now-playing',
      data: JSON.stringify(state.nowPlaying),
    })

    const send = (data: string) => {
      void stream.writeSSE({ event: 'now-playing', data })
    }
    sseClients.add(send)
    stream.onAbort(() => {
      sseClients.delete(send)
    })

    while (!stream.aborted) {
      await stream.sleep(15_000)
      await stream.writeSSE({ event: 'ping', data: '1' })
    }
    sseClients.delete(send)
  }),
)

app.get('/now-playing', (c) => c.json(state.nowPlaying))

app.get('/schedule', (c) =>
  c.json(
    state.schedules.map((s) => ({
      name: s.name,
      daysOfWeek: s.daysOfWeek ?? null,
      startTime: s.startTime,
      endTime: s.endTime,
      priority: s.priority ?? 0,
      playlist: s.playlist?.name ?? null,
    })),
  ),
)

/** Bonus: a dynamic M3U of the current pool (alternative to request.dynamic). */
app.get('/playlist.m3u', (c) => {
  const { tracks } = state.currentPool()
  const lines = ['#EXTM3U']
  for (const t of tracks) {
    const uri = annotateUri(t)
    if (uri) {
      lines.push(`#EXTINF:${t.duration ?? -1},${t.artist ?? ''} - ${t.title}`)
      lines.push(uri)
    }
  }
  return c.text(lines.join('\n'), 200, { 'Content-Type': 'audio/x-mpegurl' })
})

/** Refresh caches from Strapi and jump immediately on schedule boundaries. */
async function tick() {
  try {
    await state.refresh()
    const active = state.activeSchedule()
    const activeId = active?.documentId ?? null
    if (activeId !== state.activeScheduleId) {
      console.log(
        `[scheduler] active schedule changed: ${state.activeScheduleId ?? 'rotation'} → ${active?.name ?? 'rotation'}`,
      )
      state.activeScheduleId = activeId
      // Force Liquidsoap to drop the current track so the new slot takes over.
      await skipAutoDj()
    }
  } catch (err) {
    console.warn('[scheduler] tick failed:', (err as Error).message)
  }
}

async function waitForStrapi(maxAttempts = 30) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await state.refresh()
      console.log(
        `[boot] connected to Strapi — ${state.tracks.length} tracks, ${state.schedules.length} schedules`,
      )
      return
    } catch (err) {
      console.log(
        `[boot] waiting for Strapi (${i}/${maxAttempts})… ${(err as Error).message}`,
      )
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  console.warn('[boot] giving up waiting for Strapi; will keep retrying in loop')
}

async function main() {
  // Start serving immediately so Liquidsoap's /next polls never hit a refused
  // connection, even while Strapi is still booting.
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`Désordre Radio worker listening on :${info.port}`)
  })

  await waitForStrapi()
  // Seed the active-schedule marker without forcing a skip on first boot.
  state.activeScheduleId = state.activeSchedule()?.documentId ?? null

  setInterval(tick, config.pollIntervalMs)
}

main().catch((err) => {
  console.error('worker crashed:', err)
  process.exit(1)
})
