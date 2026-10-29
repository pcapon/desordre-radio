import { useRouter, useSearch } from '@tanstack/react-router'
import { useDebouncedCallback } from 'use-debounce'

interface SearchProps {
  readonly className?: string
  readonly placeholder?: string
}

export function Search({
  className = '',
  placeholder = 'Rechercher…',
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
      className={`demo-input ${className}`}
    />
  )
}
