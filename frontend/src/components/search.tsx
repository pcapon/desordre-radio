import { useRouter, useSearch } from '@tanstack/react-router'
import { useDebouncedCallback } from 'use-debounce'
import styles from './search.module.css'
import { m } from '#/paraglide/messages'

interface SearchProps {
  readonly className?: string
  readonly placeholder?: string
}

export function Search({
  className = '',
  placeholder = m.search_placeholder(),
}: SearchProps) {
  const search = useSearch({ strict: false })
  const router = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    router.navigate({
      to: '.',
      search: (prev) => ({
        ...prev,
        page: 1,
        query: term || undefined,
      }),
      replace: true,
    })
  }, 300)

  return (
    <input
      type="search"
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        handleSearch(e.target.value)
      }
      defaultValue={(search as any)?.query || ''}
      className={`${styles.input} ${className}`}
    />
  )
}
