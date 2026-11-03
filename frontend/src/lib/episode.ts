import type { PlayerTrack } from '@/lib/player/player-context'
import type { TEpisode } from '@/types/strapi'

/** Build a player track from an episode (played through SoundCloud). */
export function episodeToTrack(episode: TEpisode): PlayerTrack | null {
  if (!episode.soundcloudUrl) return null
  return {
    id: `episode:${episode.documentId}`,
    kind: 'episode',
    title: episode.title,
    subtitle: episode.show?.title ?? 'Replay',
    src: episode.soundcloudUrl,
    artworkUrl: episode.cover?.url ?? null,
    href: `/replay/${episode.slug}`,
  }
}
