import { useRouter } from '@tanstack/react-router'
import styles from './ReplayFilters.module.css'
import { m } from '#/paraglide/messages'

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
      <legend className={styles.legend}>{m.replay_filters_legend()}</legend>
      <label className={styles.field}>
        <span className="sr-only">{m.replay_filters_date()}</span>
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
        <span className={styles.at}>{m.replay_filters_at()}</span>
        <input
          type="time"
          value={time ?? ''}
          disabled={!date}
          title={date ? undefined : m.replay_filters_pick_day()}
          onChange={(e) => update({ time: e.target.value || undefined })}
          className={styles.input}
          aria-label={m.replay_filters_time()}
        />
      </label>
      {(date || time) && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => update({ date: undefined, time: undefined })}
        >
          {m.replay_filters_clear()}
        </button>
      )}
    </fieldset>
  )
}
