import * as React from 'react';

import {
  Layouts,
  Page,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useRBAC,
} from '@strapi/strapi/admin';
import {
  Box,
  Button,
  Flex,
  Loader,
  Table,
  Tbody,
  Td,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';

type Permission = { action: string; subject: null };

type TrackSummary = {
  documentId: string;
  title: string;
  artist?: string | null;
  album?: string | null;
};

type AuditEntry = {
  id?: number;
  documentId?: string;
  createdAt?: string;
  action: 'skip' | 'play_now';
  outcome: 'success' | 'rejected_live' | 'failed';
  actorName?: string | null;
  actorEmail?: string | null;
  currentSource?: string | null;
  targetTitle?: string | null;
  targetArtist?: string | null;
};

type ControlState = {
  health?: {
    activeSchedule?: string | null;
    forcedQueue?: number;
    playlists?: number;
    schedules?: number;
    tracks?: number;
  };
  nowPlaying?: {
    artist?: string | null;
    source?: string | null;
    title?: string | null;
  };
  recentActions: AuditEntry[];
};

const PERMISSIONS: Record<'read' | 'update', Permission[]> = {
  read: [{ action: 'plugin::radio-control.read', subject: null }],
  update: [{ action: 'plugin::radio-control.update', subject: null }],
};

const formatTrack = (track: Pick<TrackSummary, 'title' | 'artist'>) => {
  if (track.artist) return `${track.artist} - ${track.title}`;
  return track.title;
};

const formatTimestamp = (value?: string) => {
  if (!value) return 'Now';
  return new Date(value).toLocaleString();
};

const RadioControlPage = () => {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();

  const [controlState, setControlState] = React.useState<ControlState | null>(null);
  const [tracks, setTracks] = React.useState<TrackSummary[]>([]);
  const [query, setQuery] = React.useState('');
  const [isLoadingState, setIsLoadingState] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);

  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.update);

  const loadState = React.useCallback(async () => {
    setIsLoadingState(true);

    try {
      const response = await get('/radio-control/state');
      setControlState(response.data.data as ControlState);
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    } finally {
      setIsLoadingState(false);
    }
  }, [formatAPIError, get, toggleNotification]);

  const loadTracks = React.useCallback(
    async (nextQuery: string) => {
      setIsSearching(true);

      try {
        const suffix = nextQuery.trim()
          ? `?q=${encodeURIComponent(nextQuery.trim())}`
          : '';
        const response = await get(`/radio-control/tracks${suffix}`);
        setTracks((response.data.data ?? []) as TrackSummary[]);
      } catch (error) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(error),
        });
      } finally {
        setIsSearching(false);
      }
    },
    [formatAPIError, get, toggleNotification],
  );

  React.useEffect(() => {
    void loadState();
    void loadTracks('');
  }, [loadState, loadTracks]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadTracks(query);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [loadTracks, query]);

  const runAction = React.useCallback(
    async (actionKey: string, request: () => Promise<unknown>, successMessage: string) => {
      setPendingAction(actionKey);

      try {
        await request();
        toggleNotification({
          type: 'success',
          message: successMessage,
        });
        await loadState();
      } catch (error) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(error),
        });
      } finally {
        setPendingAction(null);
      }
    },
    [formatAPIError, loadState, toggleNotification],
  );

  const isLive = controlState?.nowPlaying?.source === 'live';

  if (isLoadingState || isLoadingPermissions) {
    return <Page.Loading />;
  }

  if (!controlState) {
    return <Page.Error />;
  }

  return (
    <Page.Main>
      <Page.Title>Radio Control</Page.Title>
      <Layouts.Content>
        <Flex direction="column" gap={6} alignItems="stretch">
          <Box background="neutral0" hasRadius padding={6} shadow="filterShadow">
            <Flex direction="column" gap={4}>
              <Typography variant="alpha">On Air</Typography>
              <Typography>
                {formatTrack({
                  title: controlState.nowPlaying?.title ?? 'Nothing reported',
                  artist: controlState.nowPlaying?.artist ?? undefined,
                })}
              </Typography>
              <Typography textColor="neutral600">
                Source: {controlState.nowPlaying?.source ?? 'unknown'}
              </Typography>
              <Typography textColor="neutral600">
                Forced queue: {controlState.health?.forcedQueue ?? 0}
              </Typography>
              <Typography textColor="neutral600">
                Active schedule: {controlState.health?.activeSchedule ?? 'rotation'}
              </Typography>
              <Flex gap={3}>
                <Button
                  disabled={!canUpdate || isLive || pendingAction !== null}
                  loading={pendingAction === 'skip'}
                  onClick={() =>
                    void runAction(
                      'skip',
                      () => post('/radio-control/skip'),
                      'Skipped current non-live item.',
                    )
                  }
                >
                  Skip
                </Button>
                {isLive ? (
                  <Typography textColor="danger600">
                    Live input is on-air. Skip is disabled.
                  </Typography>
                ) : null}
              </Flex>
            </Flex>
          </Box>

          <Box background="neutral0" hasRadius padding={6} shadow="filterShadow">
            <Flex direction="column" gap={4}>
              <Typography variant="alpha">Play Now</Typography>
              <TextInput
                label="Search tracks"
                name="track-search"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setQuery(event.currentTarget.value)
                }
                placeholder="Search by title, artist, or album"
                value={query}
              />
              {isSearching ? <Loader small>Loading tracks</Loader> : null}
              <Table colCount={4} rowCount={Math.max(tracks.length, 1)}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">Title</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Artist</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Album</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Action</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tracks.length === 0 ? (
                    <Tr>
                      <Td colSpan={4}>
                        <Typography textColor="neutral600">
                          No playable published tracks matched this search.
                        </Typography>
                      </Td>
                    </Tr>
                  ) : (
                    tracks.map((track) => (
                      <Tr key={track.documentId}>
                        <Td>
                          <Typography>{track.title}</Typography>
                        </Td>
                        <Td>
                          <Typography textColor="neutral600">
                            {track.artist ?? '-'}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography textColor="neutral600">
                            {track.album ?? '-'}
                          </Typography>
                        </Td>
                        <Td>
                          <Button
                            disabled={!canUpdate || pendingAction !== null}
                            loading={pendingAction === track.documentId}
                            onClick={() =>
                              void runAction(
                                track.documentId,
                                () =>
                                  post('/radio-control/play-now', {
                                    trackDocumentId: track.documentId,
                                  }),
                                `Queued ${formatTrack(track)} to play next.`,
                              )
                            }
                            size="S"
                          >
                            Play Now
                          </Button>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Flex>
          </Box>

          <Box background="neutral0" hasRadius padding={6} shadow="filterShadow">
            <Flex direction="column" gap={4}>
              <Typography variant="alpha">Recent Operator Actions</Typography>
              <Table colCount={5} rowCount={Math.max(controlState.recentActions.length, 1)}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">When</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Action</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Outcome</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Actor</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Track / Source</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {controlState.recentActions.length === 0 ? (
                    <Tr>
                      <Td colSpan={5}>
                        <Typography textColor="neutral600">
                          No operator actions recorded yet.
                        </Typography>
                      </Td>
                    </Tr>
                  ) : (
                    controlState.recentActions.map((entry, index) => (
                      <Tr key={entry.documentId ?? `${entry.action}-${index}`}>
                        <Td>
                          <Typography textColor="neutral600">
                            {formatTimestamp(entry.createdAt)}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography>
                            {entry.action === 'play_now' ? 'Play Now' : 'Skip'}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography
                            textColor={
                              entry.outcome === 'success' ? 'success600' : 'danger600'
                            }
                          >
                            {entry.outcome}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography textColor="neutral600">
                            {entry.actorName ?? entry.actorEmail ?? 'Unknown admin'}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography textColor="neutral600">
                            {entry.targetTitle
                              ? formatTrack({
                                  title: entry.targetTitle,
                                  artist: entry.targetArtist ?? undefined,
                                })
                              : entry.currentSource ?? '-'}
                          </Typography>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Flex>
          </Box>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
};

const ProtectedRadioControlPage = () => (
  <Page.Protect permissions={PERMISSIONS.read}>
    <RadioControlPage />
  </Page.Protect>
);

export { ProtectedRadioControlPage };