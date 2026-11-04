import { useRouter } from '@tanstack/react-router'
import styles from './ReplayFilters.module.css'

/**
 * Air date + time filters for /replay. The time narrows to what was on air
 * at that moment, so it only applies once a day is picked.
 */
export function ReplayFilters({ date, time }: { date?: string; time?: string }) {
  const router = useRouter()

  const update = (next: { date?: string; time?: string }) => {
    router.navigate({
      to: '.',
      search: (prev) => ({ ...prev, page: undefined, ...next }),
      replace: true,
    })
  }

  return (
    <fieldset className={styles.filters}>
      <legend className={styles.legend}>Diffusé le</legend>
      <label className={styles.field}>
        <span className="sr-only">Date de diffusion</span>
        <input
          type="date"
          value={date ?? ''}
          onChange={(e) =>
            update({
              date: e.target.value || undefined,
              time: e.target.value ? time : undefined,
            })
          }
          className={styles.input}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.at}>vers</span>
        <input
          type="time"
          value={time ?? ''}
          disabled={!date}
          title={date ? undefined : 'Choisissez d’abord un jour'}
          onChange={(e) => update({ time: e.target.value || undefined })}
          className={styles.input}
          aria-label="Heure de diffusion"
        />
      </label>
      {(date || time) && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => update({ date: undefined, time: undefined })}
        >
          Effacer
        </button>
      )}
    </fieldset>
  )
}
