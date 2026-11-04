import { Loader2, Pause, Play } from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { usePlayer } from '@/lib/player/player-context'
import { LIVE_TRACK } from '@/lib/player/radio-config'
import styles from './LiveHero.module.css'
import { m } from '#/paraglide/messages'

/** Home hero: the wordmark and the button that tunes in to the live stream. */
export function LiveHero() {
  const player = usePlayer()
  const liveActive = player.isLive && player.isPlaying
  const isLoading = player.isLive && player.status === 'loading'

  return (
    <section className={`page-wrap ${styles.hero}`}>
      <Wordmark />
      <button
        type="button"
        onClick={() =>
          player.isLive ? player.toggle() : player.play(LIVE_TRACK)
        }
        className={styles.tuneIn}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : liveActive ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
        {liveActive ? m.stop_live() : m.listen_live()}
      </button>
    </section>
  )
}
