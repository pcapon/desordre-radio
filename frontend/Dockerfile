# TanStack Start (SSR) production image — Nitro node-server output
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Vite inlines VITE_* variables at BUILD time, so they arrive as build args.
ARG VITE_STRAPI_URL=http://localhost:1337
ARG VITE_AZURACAST_URL=
ARG VITE_AZURACAST_STATION=desordre_radio
ENV VITE_STRAPI_URL=$VITE_STRAPI_URL \
    VITE_AZURACAST_URL=$VITE_AZURACAST_URL \
    VITE_AZURACAST_STATION=$VITE_AZURACAST_STATION

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
