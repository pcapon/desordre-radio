FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# Install deps (cached layer)
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --prod=false

# App source
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3001

# tsx runs the TypeScript directly — no build step needed for this small service.
CMD ["pnpm", "start"]
