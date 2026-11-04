import { useEffect, useMemo, useRef } from 'react'
import { usePlayer } from '@/lib/player/player-context'
import { episodeToTrack } from '@/lib/episode'
import { PlayEpisodeButton } from '@/components/PlayEpisodeButton'
import type { TEpisode } from '@/types/strapi'
import styles from './SoundCloudEmbed.module.css'
import { m } from '#/paraglide/messages'

/**
 * The episode's SoundCloud player, linked to the docked player.
 *
 * This is only a slot: the app-wide widget iframe (in `PlayerProvider`) is
 * positioned over it, so playing here or from the dock drives the same
 * instance and playback survives navigation. While another replay is
 * playing, the slot keeps it untouched and offers to switch instead.
 */
export function SoundCloudEmbed({ episode }: { episode: TEpisode }) {
  const { attachEmbedSlot, widgetTrackId } = usePlayer()
  const slotRef = useRef<HTMLDivElement>(null)
  const track = useMemo(() => episodeToTrack(episode), [episode])

  useEffect(() => {
    if (!slotRef.current || !track) return
    return attachEmbedSlot(slotRef.current, track)
  }, [attachEmbedSlot, track])

  if (!track) return null
  // Another replay holds the widget (it was playing when this page opened).
  const showsOther = widgetTrackId !== null && widgetTrackId !== track.id

  return (
    <div ref={slotRef} className={styles.slot}>
      {showsOther && (
        <div className={styles.fallback}>
          <p className="m-0 text-sm text-[var(--fg-soft)]">
            {m.episode_other_playing()}
          </p>
          <PlayEpisodeButton episode={episode} variant="full" />
        </div>
      )}
    </div>
  )
}
