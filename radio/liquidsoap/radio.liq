#!/usr/bin/env liquidsoap
# =============================================================================
# Désordre Radio — Liquidsoap audio engine
# =============================================================================
# Responsibilities (all the audio logic lives HERE, not in the worker):
#   - autoDJ      : pulls the next track URI from the Hono worker (/next)
#   - live        : input.harbor mount that an encoder (OBS, butt, …) connects to
#   - routing     : live overrides autoDJ; blank security under everything
#   - transitions : crossfade between tracks
#   - metadata    : on every track change, POST now-playing to the worker
#   - output      : a single MP3 stream pushed to Icecast (mount /stream)
#
# Scheduling is centralised in the worker: /next returns the scheduled
# playlist's tracks during a scheduled window and the default rotation
# otherwise. The worker can also force an immediate jump by sending the telnet
# command `autodj.skip` (see worker/src/liquidsoap.ts).
# =============================================================================

# ---- Settings ---------------------------------------------------------------
settings.log.level := 3
settings.server.telnet := true
settings.server.telnet.bind_addr := "0.0.0.0"
settings.server.telnet.port := 1234

# ---- Environment ------------------------------------------------------------
icecast_host     = environment.get(default="icecast", "ICECAST_HOST")
icecast_port     = int_of_string(default=8000, environment.get(default="8000", "ICECAST_PORT"))
icecast_password = environment.get(default="changeme_source", "ICECAST_SOURCE_PASSWORD")
icecast_mount    = environment.get(default="stream", "ICECAST_MOUNT")

worker_url       = environment.get(default="http://worker:3001", "WORKER_URL")
metadata_secret  = environment.get(default="", "METADATA_SECRET")

harbor_port      = int_of_string(default=8005, environment.get(default="8005", "HARBOR_PORT"))
live_password    = environment.get(default="changeme_live", "LIVE_SOURCE_PASSWORD")
live_mount       = environment.get(default="live", "LIVE_MOUNT")

# Tracks whether a live encoder is currently connected, so metadata reports the
# correct source. Updated by the harbor on_connect / on_disconnect hooks.
live_active = ref(false)

# =============================================================================
# AutoDJ — dynamic request source fed by the worker
# =============================================================================
# The worker returns one line: either an empty body (nothing to play) or a
# request URI, optionally annotated, e.g.
#   annotate:title="Track",artist="Artist",track_id="abc":https://cms/uploads/x.mp3
def autodj_next() =
  response = http.get("#{worker_url}/next", timeout=5.0)
  uri = string.trim("#{response}")
  if response.status_code == 200 and uri != "" then
    log(level=4, "autoDJ next: #{uri}")
    [request.create(uri)]
  else
    log(level=2, "autoDJ: worker returned no track (status #{response.status_code})")
    []
  end
end

autodj = request.dynamic.list(id="autodj", retry_delay=3.0, autodj_next)

# Smooth, beat-agnostic crossfades between autoDJ tracks.
autodj = crossfade(fade_in=1.0, fade_out=1.5, duration=4.0, autodj)

# =============================================================================
# Live input — encoder override (OBS / butt / Icecast source client)
# =============================================================================
live =
  input.harbor(
    live_mount,
    id="live",
    port=harbor_port,
    password=live_password,
    on_connect=fun (_) -> begin
      live_active := true
      log(level=3, "LIVE source connected — overriding autoDJ")
    end,
    on_disconnect=fun () -> begin
      live_active := false
      log(level=3, "LIVE source disconnected — back to autoDJ")
    end
  )

# =============================================================================
# Routing — live > autoDJ; mksafe adds blank security when neither is ready
# =============================================================================
# track_sensitive=false lets the live source cut in immediately rather than
# waiting for the current autoDJ track to end.
radio = fallback(track_sensitive=false, [live, autodj])
radio = mksafe(radio)

# =============================================================================
# Now-playing metadata → worker
# =============================================================================
def on_meta(m) =
  title  = m["title"]
  artist = m["artist"]
  track_id = m["track_id"]
  source = if live_active() then "live" else "autodj" end
  payload =
    json.stringify(
      {
        title = title,
        artist = artist,
        trackDocumentId = track_id,
        source = source
      }
    )
  log(level=3, "now-playing → #{source}: #{artist} - #{title}")
  headers =
    if metadata_secret == "" then
      [("Content-Type", "application/json")]
    else
      [("Content-Type", "application/json"), ("x-metadata-secret", metadata_secret)]
    end
  # Fire-and-forget; never let metadata reporting break the stream.
  try
    ignore(
      http.post(
        "#{worker_url}/metadata",
        headers=headers,
        data=payload,
        timeout=5.0
      )
    )
  catch err do
    log(level=2, "metadata POST failed: #{err}")
  end
end

radio = source.on_metadata(radio, on_meta)

# =============================================================================
# Output — single MP3 stream to Icecast
# =============================================================================
output.icecast(
  %mp3(bitrate=128, samplerate=44100, stereo=true),
  id="icecast_out",
  host=icecast_host,
  port=icecast_port,
  password=icecast_password,
  mount=icecast_mount,
  name="Désordre Radio",
  description="Webradio 24/7 — autoDJ, live & replay",
  genre="Various",
  url="https://desordre.radio",
  # Auto-reconnect if Icecast restarts: wait 3s, then retry.
  on_error=fun (_) -> 3.0,
  radio
)

log(level=3, "Désordre Radio engine started — streaming to icecast://#{icecast_host}:#{icecast_port}/#{icecast_mount}")
