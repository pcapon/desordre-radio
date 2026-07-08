import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
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

// Allow the frontend (a different origin in dev; same-origin via Caddy in prod)
// to read now-playing and subscribe to the SSE stream from the browser.
app.use('*', cors())

// Connected SSE clients. Each entry pushes a JSON string to one browser.
const sseClients = new Set<(data: string) => void>()

function operatorAuthorized(secretHeader: string | undefined): boolean {
  return !config.playNowSecret || secretHeader === config.playNowSecret
}

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
    rotation: state.currentPool().tracks.length,
    scheduled: state.scheduledTracks().length,
    forcedQueue: state.forcedQueueLength(),
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
  // Attach liq_source for forced/scheduled picks so Liquidsoap reports the
  // right now-playing source; plain rotation picks stay "autodj".
  const uri = annotateUri(
    pick.track,
    pick.source === 'autodj' ? undefined : pick.source,
  )
  if (!uri) return c.text('', 200)
  console.log(
    `[next] (${pick.source}) ${pick.track.artist ?? ''} - ${pick.track.title}`,
  )
  return c.text(uri, 200)
})

/**
 * Queue a specific track to play before the normal rotation, then ask
 * Liquidsoap to skip the current autoDJ track so it pulls again immediately.
 */
app.post('/play-now', async (c) => {
  if (!operatorAuthorized(c.req.header('x-play-now-secret'))) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  let body: Record<string, unknown> = {}
  try {
    body = await c.req.json()
  } catch {
    /* tolerate empty/invalid bodies */
  }

  const trackDocumentId =
    typeof body.trackDocumentId === 'string'
      ? body.trackDocumentId
      : typeof body.documentId === 'string'
        ? body.documentId
        : null

  if (!trackDocumentId) {
    return c.json({ error: 'trackDocumentId is required' }, 400)
  }

  let track = state.findTrackByDocumentId(trackDocumentId)
  if (!track) {
    try {
      await state.refresh()
      track = state.findTrackByDocumentId(trackDocumentId)
    } catch (err) {
      console.warn('[play-now] refresh failed:', (err as Error).message)
    }
  }

  if (!track) {
    return c.json({ error: 'track not found' }, 404)
  }

  if (!annotateUri(track)) {
    return c.json({ error: 'track is not playable' }, 409)
  }

  const queuePosition = state.queueTrack(track, 'forced')
  await skipAutoDj()

  console.log(`[play-now] queued ${track.documentId} (${track.artist ?? ''} - ${track.title})`)

  return c.json({
    ok: true,
    queued: track.documentId,
    title: track.title,
    artist: track.artist,
    source: 'forced',
    queuePosition,
    skippedCurrent: true,
  })
})

/**
 * Skip the current non-live item so Liquidsoap pulls the next choice
 * immediately. Live harbor input is never interrupted from this route.
 */
app.post('/skip', async (c) => {
  if (!operatorAuthorized(c.req.header('x-play-now-secret'))) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  if (state.nowPlaying.source === 'live') {
    return c.json(
      {
        error: 'live playback cannot be skipped',
        source: state.nowPlaying.source,
        skippedCurrent: false,
      },
      409,
    )
  }

  await skipAutoDj()

  console.log(`[skip] skipped current ${state.nowPlaying.source ?? 'autodj'} item`)

  return c.json({
    ok: true,
    source: state.nowPlaying.source ?? 'autodj',
    skippedCurrent: true,
  })
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
    show:
      typeof body.show === 'string' && body.show !== ''
        ? body.show
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

/** Upcoming (and recently fired) time-pinned tracks. */
app.get('/schedule', (c) =>
  c.json(
    state
      .scheduledTracks()
      .slice()
      .sort(
        (a, b) =>
          new Date(a.scheduledAt ?? 0).getTime() -
          new Date(b.scheduledAt ?? 0).getTime(),
      )
      .map((t) => ({
        documentId: t.documentId,
        title: t.title,
        artist: t.artist ?? null,
        show: t.show?.title ?? null,
        scheduledAt: t.scheduledAt ?? null,
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

/** Refresh the track cache from Strapi. */
async function tick() {
  try {
    await state.refresh()
  } catch (err) {
    console.warn('[scheduler] tick failed:', (err as Error).message)
  }
}

/**
 * Fire any time-pinned track whose scheduledAt has arrived: queue it ahead of
 * the rotation and skip the current item so it cuts in immediately. Runs on a
 * tighter interval than the Strapi poll for close-to-the-clock accuracy.
 */
async function scheduleCheck() {
  const due = state.dueScheduled()
  if (due.length === 0) return

  for (const track of due) {
    state.queueTrack(track, 'scheduled')
    console.log(
      `[scheduled] firing ${track.documentId} (${track.artist ?? ''} - ${track.title}) @ ${track.scheduledAt}`,
    )
  }
  // One skip is enough: Liquidsoap re-pulls /next and drains the queue in order.
  await skipAutoDj()
}

async function waitForStrapi(maxAttempts = 30) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await state.refresh()
      console.log(
        `[boot] connected to Strapi — ${state.currentPool().tracks.length} rotation, ${state.scheduledTracks().length} scheduled`,
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

  setInterval(tick, config.pollIntervalMs)
  setInterval(() => {
    scheduleCheck().catch((err) =>
      console.warn('[scheduled] check failed:', (err as Error).message),
    )
  }, config.scheduleCheckMs)
}

main().catch((err) => {
  console.error('worker crashed:', err)
  process.exit(1)
})
