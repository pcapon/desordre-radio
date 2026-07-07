'use strict';

class WorkerRequestError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'WorkerRequestError';
    this.status = status;
    this.payload = payload;
  }
}

const getService = () => strapi.plugin('radio-control').service('radio-control');

function toMessage(error, fallback) {
  if (error?.payload?.error && typeof error.payload.error === 'string') {
    return error.payload.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function withWorkerErrors(ctx, task, fallbackMessage) {
  try {
    ctx.body = { data: await task() };
  } catch (error) {
    if (error instanceof WorkerRequestError) {
      ctx.status = error.status;
      ctx.body = {
        error: toMessage(error, fallbackMessage),
        data: error.payload ?? null,
      };
      return;
    }

    throw error;
  }
}

module.exports = {
  async state(ctx) {
    await withWorkerErrors(
      ctx,
      async () => getService().getDashboardState(),
      'Unable to load radio state',
    );
  },

  async tracks(ctx) {
    const query = typeof ctx.query.q === 'string' ? ctx.query.q : '';
    ctx.body = { data: await getService().searchTracks(query, 24) };
  },

  async playNow(ctx) {
    const trackDocumentId = ctx.request.body?.trackDocumentId;
    if (typeof trackDocumentId !== 'string' || trackDocumentId.trim() === '') {
      return ctx.badRequest('trackDocumentId is required');
    }

    await withWorkerErrors(
      ctx,
      async () =>
        getService().playNow(trackDocumentId.trim(), ctx.state.user ?? null),
      'Play Now failed',
    );
  },

  async skip(ctx) {
    await withWorkerErrors(
      ctx,
      async () => getService().skip(ctx.state.user ?? null),
      'Skip failed',
    );
  },
};