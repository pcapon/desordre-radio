# TanStack Start (SSR) production image — Nitro node-server output
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Vite inlines VITE_* variables at BUILD time, so they arrive as build args.
ARG VITE_STRAPI_URL=http://localhost:1337
ARG VITE_RADIO_STREAM_URL=http://localhost:8000/stream
ARG VITE_NOW_PLAYING_URL=http://localhost:1337/api/now-playing
ARG VITE_NOW_PLAYING_SSE_URL=http://localhost:3001/now-playing/stream
ENV VITE_STRAPI_URL=$VITE_STRAPI_URL \
    VITE_RADIO_STREAM_URL=$VITE_RADIO_STREAM_URL \
    VITE_NOW_PLAYING_URL=$VITE_NOW_PLAYING_URL \
    VITE_NOW_PLAYING_SSE_URL=$VITE_NOW_PLAYING_SSE_URL

# pnpm-workspace.yaml carries the build-script approvals (esbuild/lightningcss).
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install

COPY . .
RUN pnpm build

# Nitro's node-server output under .output is self-contained.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
