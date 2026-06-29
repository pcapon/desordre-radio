import type { PlayerTrack } from '@/lib/player/player-context'
import type { TArticle, TEpisode, TShow } from '@/types/strapi'

/**
 * Sample fallback content.
 *
 * The site is designed to run against a Strapi backend (see ../../backend),
 * but it stays fully browsable before the CMS is seeded: every route falls
 * back to this data when Strapi returns nothing or is unreachable. Replace it
 * by publishing real Shows / Episodes / Articles in Strapi.
 */

const img = (seed: string) => ({
  id: 0,
  documentId: `sample-${seed}`,
  alternativeText: null,
  url: `https://picsum.photos/seed/${seed}/800/600`,
})

// Public, license-free demo audio so the player produces sound out of the box.
const AUDIO = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
]

export const sampleShows: Array<TShow> = [
  {
    id: 1,
    documentId: 'show-grand-bain',
    title: 'Le Grand Bain',
    slug: 'le-grand-bain',
    description:
      'Deux heures de plongée dans les musiques qui débordent : électronique, jazz mutant et trouvailles de label.',
    host: 'Camille Roy',
    schedule: 'Jeudi · 20h',
    cover: img('grandbain'),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    documentId: 'show-onde-de-choc',
    title: 'Onde de Choc',
    slug: 'onde-de-choc',
    description:
      'Le talk culturel qui prend le contre-pied : débats, grands entretiens et coups de cœur de la rédaction.',
    host: 'Sofiane Bekkar',
    schedule: 'Mardi · 18h',
    cover: img('ondedechoc'),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    documentId: 'show-nuit-blanche',
    title: 'Nuit Blanche',
    slug: 'nuit-blanche',
    description:
      'La nocturne ambient et downtempo pour accompagner les insomnies douces.',
    host: 'Lena März',
    schedule: 'Samedi · 23h',
    cover: img('nuitblanche'),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
  },
]

export const sampleEpisodes: Array<TEpisode> = [
  {
    id: 1,
    documentId: 'ep-grand-bain-12',
    title: 'Le Grand Bain #12 — Basses fréquences',
    slug: 'le-grand-bain-12-basses-frequences',
    description:
      'Un set tout en gravité : dub techno, ambient bruitiste et une session live enregistrée à la Friche.',
    audioUrl: AUDIO[0],
    duration: 7200,
    airedAt: '2026-06-19T20:00:00.000Z',
    cover: img('ep12'),
    show: sampleShows[0],
    createdAt: '2026-06-19T20:00:00.000Z',
    updatedAt: '2026-06-19T20:00:00.000Z',
    publishedAt: '2026-06-19T20:00:00.000Z',
  },
  {
    id: 2,
    documentId: 'ep-onde-de-choc-30',
    title: 'Onde de Choc #30 — Le retour du vinyle',
    slug: 'onde-de-choc-30-retour-du-vinyle',
    description:
      'Grand entretien avec une disquaire indépendante sur la renaissance du disque et l’économie des labels.',
    audioUrl: AUDIO[1],
    duration: 3300,
    airedAt: '2026-06-17T18:00:00.000Z',
    cover: img('ep30'),
    show: sampleShows[1],
    createdAt: '2026-06-17T18:00:00.000Z',
    updatedAt: '2026-06-17T18:00:00.000Z',
    publishedAt: '2026-06-17T18:00:00.000Z',
  },
  {
    id: 3,
    documentId: 'ep-nuit-blanche-7',
    title: 'Nuit Blanche #7 — Dérive',
    slug: 'nuit-blanche-7-derive',
    description:
      'Quatre-vingt-dix minutes d’ambient cinématique pour flotter jusqu’au lever du jour.',
    audioUrl: AUDIO[2],
    duration: 5400,
    airedAt: '2026-06-14T23:00:00.000Z',
    cover: img('ep7'),
    show: sampleShows[2],
    createdAt: '2026-06-14T23:00:00.000Z',
    updatedAt: '2026-06-14T23:00:00.000Z',
    publishedAt: '2026-06-14T23:00:00.000Z',
  },
  {
    id: 4,
    documentId: 'ep-grand-bain-11',
    title: 'Le Grand Bain #11 — Carte blanche',
    slug: 'le-grand-bain-11-carte-blanche',
    description:
      'Carte blanche à un collectif marseillais : house solaire et percussions à gogo.',
    audioUrl: AUDIO[3],
    duration: 6900,
    airedAt: '2026-06-12T20:00:00.000Z',
    cover: img('ep11'),
    show: sampleShows[0],
    createdAt: '2026-06-12T20:00:00.000Z',
    updatedAt: '2026-06-12T20:00:00.000Z',
    publishedAt: '2026-06-12T20:00:00.000Z',
  },
]

export const sampleArticles: Array<TArticle> = [
  {
    id: 1,
    documentId: 'art-manifeste',
    title: 'Manifeste pour une radio en désordre',
    slug: 'manifeste-pour-une-radio-en-desordre',
    description:
      'Pourquoi nous avons décidé de faire une radio qui assume ses ruptures de ton, ses silences et ses embardées.',
    cover: img('manifeste'),
    author: {
      id: 1,
      documentId: 'author-redaction',
      name: 'La rédaction',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      publishedAt: '2026-06-01T00:00:00.000Z',
    },
    category: {
      id: 1,
      documentId: 'cat-edito',
      name: 'Édito',
      slug: 'edito',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      publishedAt: '2026-06-01T00:00:00.000Z',
    },
    blocks: [
      {
        __component: 'shared.rich-text',
        id: 1,
        body: `Une radio n'est pas une playlist. C'est une présence, une voix qui hésite, un fond sonore qui déraille parfois.\n\n## Le désordre comme méthode\n\nNous croyons aux programmes qui prennent le temps, aux transitions imparfaites, aux invités qu'on n'attendait pas. Le replay garde la trace de ces moments — vous pouvez les réécouter quand vous voulez, sans algorithme pour vous dire quoi aimer.\n\n> Faire de la radio, c'est accepter de ne pas tout contrôler.\n\n## Ce que vous trouverez ici\n\nLe direct, en haut de l'antenne. Les archives, dans le Replay. Et ce journal, pour prolonger l'écoute par la lecture.`,
      },
    ],
    createdAt: '2026-06-22T09:00:00.000Z',
    updatedAt: '2026-06-22T09:00:00.000Z',
    publishedAt: '2026-06-22T09:00:00.000Z',
  },
  {
    id: 2,
    documentId: 'art-portrait-camille',
    title: 'Portrait : Camille Roy, capitaine du Grand Bain',
    slug: 'portrait-camille-roy',
    description:
      'Rencontre avec la voix qui orchestre nos jeudis soir, entre crate digging obsessionnel et amour des fins de nuit.',
    cover: img('camille'),
    author: {
      id: 2,
      documentId: 'author-sofiane',
      name: 'Sofiane Bekkar',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      publishedAt: '2026-06-01T00:00:00.000Z',
    },
    category: {
      id: 2,
      documentId: 'cat-portrait',
      name: 'Portrait',
      slug: 'portrait',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      publishedAt: '2026-06-01T00:00:00.000Z',
    },
    blocks: [
      {
        __component: 'shared.rich-text',
        id: 2,
        body: `Camille Roy parle des disques comme d'autres parlent de gens : avec tendresse, et un peu de rancune.\n\n## Des caves aux ondes\n\nAvant Le Grand Bain, il y a eu dix ans de soirées dans des sous-sols humides. « Je cherchais juste un endroit où mettre le son trop fort », sourit-elle.\n\n## La fabrique d'une émission\n\nChaque jeudi, le rituel est le même : trois heures de sélection pour deux heures d'antenne, et toujours un morceau gardé secret jusqu'à la dernière minute.`,
      },
    ],
    createdAt: '2026-06-18T11:00:00.000Z',
    updatedAt: '2026-06-18T11:00:00.000Z',
    publishedAt: '2026-06-18T11:00:00.000Z',
  },
]

/** Resolve the best audio source for an episode (external URL wins). */
export function episodeAudioSrc(episode: TEpisode): string | undefined {
  return episode.audioUrl || episode.audio?.url
}

/** Build a player track from an episode. */
export function episodeToTrack(episode: TEpisode): PlayerTrack | null {
  const src = episodeAudioSrc(episode)
  if (!src) return null
  return {
    id: `episode:${episode.documentId}`,
    kind: 'episode',
    title: episode.title,
    subtitle: episode.show?.title ?? 'Replay',
    src,
    artworkUrl: episode.cover?.url ?? null,
    href: `/replay/${episode.slug}`,
  }
}
