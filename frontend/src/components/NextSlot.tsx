import { Play } from 'lucide-react'
import { usePlayer } from '@/lib/player/player-context'
import { LIVE_TRACK } from '@/lib/player/radio-config'
import { useNextSlot } from '@/lib/use-next-slot'
import { formatClock, formatDay } from '@/lib/format'
import type { TShow } from '@/types/strapi'
import styles from './NextSlot.module.css'

/**
 * A show's current or next AzuraCast slot. Client-fetched (the schedule is
 * not part of SSR), so it renders nothing until the schedule arrives, and
 * nothing at all when the show has no upcoming slot.
 *
 * - `compact`: one line for cards ("● À l'antenne" / "Prochaine : …").
 * - `full`: the show page block, with a button to join the live stream.
 */
export function NextSlot({
  show,
  variant = 'compact',
}: {
  show: Pick<TShow, 'azuracastPlaylist'>
  variant?: 'compact' | 'full'
}) {
  const { slot } = useNextSlot(show)
  const player = usePlayer()
  if (!slot) return null

  const day = formatDay(slot.start)
  const start = formatClock(slot.start)
  const end = formatClock(slot.end)

  if (variant === 'compact') {
    return (
      <p className={styles.compact} data-live={slot.isNow}>
        {slot.isNow ? (
          <>À l’antenne · jusqu’à {end}</>
        ) : (
          <>
            Prochaine · {day}, {start}
          </>
        )}
      </p>
    )
  }

  const listening = player.isLive && player.isPlaying

  return (
    <div className={styles.full} data-live={slot.isNow}>
      <p className="eyebrow m-0">
        {slot.isNow ? 'À l’antenne maintenant' : 'Prochaine diffusion'}
      </p>
      <p className={styles.day}>{slot.isNow ? 'En direct' : day}</p>
      <p className={styles.time}>
        {start} – {end}
      </p>
      {slot.isNow && !listening && (
        <button
          type="button"
          className="demo-button mt-4"
          onClick={() => player.play(LIVE_TRACK)}
        >
          <Play className="h-5 w-5" /> Écouter le direct
        </button>
      )}
    </div>
  )
}
