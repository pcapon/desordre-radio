# Strapi 5 production image
FROM node:22-slim AS build
WORKDIR /app

# Native deps for better-sqlite3 / sharp builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips && rm -rf /var/lib/apt/lists/*

COPY --from=build /app ./

EXPOSE 1337
CMD ["npm", "run", "start"]
