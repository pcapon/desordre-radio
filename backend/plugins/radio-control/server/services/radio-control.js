'use strict';

const PLUGIN_ID = 'radio-control';
const ACTION_MODEL = `plugin::${PLUGIN_ID}.radio-control-action`;
const TRACK_MODEL = 'api::track.track';
const DEFAULT_HISTORY_LIMIT = 12;

class WorkerRequestError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'WorkerRequestError';
    this.status = status;
    this.payload = payload;
  }
}

function getActorName(user) {
  const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(' ').trim();
  return fullName || user?.username || user?.email || null;
}

function isPlayableTrack(track) {
  const hasMedia = Array.isArray(track?.audio)
    ? track.audio.length > 0
    : Boolean(track?.audio);
  return Boolean(track?.externalUrl || hasMedia);
}

module.exports = ({ strapi }) => ({
  getConfig() {
    return strapi.config.get(`plugin::${PLUGIN_ID}`) || {};
  },

  getWorkerUrl() {
    return this.getConfig().workerUrl || 'http://localhost:3001';
  },

  getOperatorSecret() {
    return this.getConfig().operatorSecret || '';
  },

  getHistoryLimit() {
    const rawLimit = Number(this.getConfig().historyLimit ?? DEFAULT_HISTORY_LIMIT);
    if (!Number.isFinite(rawLimit) || rawLimit <= 0) return DEFAULT_HISTORY_LIMIT;
    return Math.floor(rawLimit);
  },

  extractMessage(payload, fallback) {
    if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
      return payload.error;
    }
    return fallback;
  },

  async requestWorker(path, options = {}) {
    const { method = 'GET', body } = options;
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const secret = this.getOperatorSecret();
    if (secret) headers['x-play-now-secret'] = secret;

    const url = new URL(path, this.getWorkerUrl()).toString();

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new WorkerRequestError(
        error instanceof Error ? error.message : 'worker unavailable',
        502,
        { error: 'worker unavailable' },
      );
    }

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  },

  async getHealth() {
    const result = await this.requestWorker('/health');
    if (!result.ok) {
      throw new WorkerRequestError(
        this.extractMessage(result.payload, 'Unable to load worker health'),
        result.status,
        result.payload,
      );
    }
    return result.payload ?? {};
  },

  async getNowPlaying() {
    const result = await this.requestWorker('/now-playing');
    if (!result.ok) {
      throw new WorkerRequestError(
        this.extractMessage(result.payload, 'Unable to load now playing'),
        result.status,
        result.payload,
      );
    }
    return result.payload ?? {};
  },

  async listActions(limit = this.getHistoryLimit()) {
    return strapi.documents(ACTION_MODEL).findMany({
      fields: [
        'action',
        'outcome',
        'actorId',
        'actorEmail',
        'actorName',
        'currentSource',
        'targetTrackDocumentId',
        'targetTitle',
        'targetArtist',
        'workerStatus',
        'createdAt',
      ],
      sort: ['createdAt:desc'],
      page: 1,
      pageSize: limit,
    });
  },

  async getDashboardState() {
    const [health, nowPlaying, recentActions] = await Promise.all([
      this.getHealth(),
      this.getNowPlaying(),
      this.listActions(),
    ]);

    return {
      health,
      nowPlaying,
      recentActions,
    };
  },

  async searchTracks(query, limit = 24) {
    const term = query.trim();
    const filters = { enabled: true };

    if (term) {
      filters.$or = [
        { title: { $containsi: term } },
        { artist: { $containsi: term } },
        { album: { $containsi: term } },
      ];
    }

    const tracks = await strapi.documents(TRACK_MODEL).findMany({
      status: 'published',
      fields: ['documentId', 'title', 'artist', 'album', 'externalUrl'],
      populate: {
        audio: {
          fields: ['id'],
        },
      },
      filters,
      sort: ['artist:asc', 'title:asc'],
      page: 1,
      pageSize: Math.max(limit * 2, limit),
    });

    return tracks
      .filter(isPlayableTrack)
      .slice(0, limit)
      .map((track) => ({
        documentId: track.documentId,
        title: track.title,
        artist: track.artist,
        album: track.album,
      }));
  },

  async findTrackSnapshot(trackDocumentId) {
    const [track] = await strapi.documents(TRACK_MODEL).findMany({
      status: 'published',
      fields: ['documentId', 'title', 'artist'],
      filters: {
        documentId: { $eq: trackDocumentId },
      },
      page: 1,
      pageSize: 1,
    });

    return track ?? null;
  },

  async recordAction(entry) {
    return strapi.documents(ACTION_MODEL).create({ data: entry });
  },

  async playNow(trackDocumentId, user) {
    const [currentState, track] = await Promise.all([
      this.getNowPlaying().catch(() => null),
      this.findTrackSnapshot(trackDocumentId),
    ]);

    const result = await this.requestWorker('/play-now', {
      method: 'POST',
      body: { trackDocumentId },
    });

    await this.recordAction({
      action: 'play_now',
      outcome: result.ok ? 'success' : 'failed',
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      actorName: getActorName(user),
      currentSource: currentState?.source ?? null,
      targetTrackDocumentId: trackDocumentId,
      targetTitle: track?.title ?? null,
      targetArtist: track?.artist ?? null,
      workerStatus: result.status,
      workerResponse: result.payload,
      requestPayload: { trackDocumentId },
    });

    if (!result.ok) {
      throw new WorkerRequestError(
        this.extractMessage(result.payload, 'Play Now failed'),
        result.status,
        result.payload,
      );
    }

    return result.payload;
  },

  async skip(user) {
    const currentState = await this.getNowPlaying().catch(() => null);
    const result = await this.requestWorker('/skip', { method: 'POST' });
    const outcome = result.ok
      ? 'success'
      : result.status === 409
        ? 'rejected_live'
        : 'failed';

    await this.recordAction({
      action: 'skip',
      outcome,
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      actorName: getActorName(user),
      currentSource: currentState?.source ?? null,
      workerStatus: result.status,
      workerResponse: result.payload,
      requestPayload: null,
    });

    if (!result.ok) {
      throw new WorkerRequestError(
        this.extractMessage(result.payload, 'Skip failed'),
        result.status,
        result.payload,
      );
    }

    return result.payload;
  },
});