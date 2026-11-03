'use strict';

/**
 * Seed Strapi with demo content: shows, SoundCloud replay episodes, authors,
 * categories and articles (see seed-data.json). Covers are downloaded and
 * pushed through the upload plugin, so they live in public/uploads like any
 * editor-uploaded image.
 *
 * Idempotent: entries whose slug (or name) already exists are skipped, so it
 * is safe to run again. Never runs automatically; run it on demand:
 *
 *   docker compose -f docker-compose.yml -f docker-compose.dev.yml exec strapi npm run seed
 *   # or, with Strapi installed locally: cd backend && npm run seed
 *
 * It loads the already compiled app from ./dist (written by `strapi develop`
 * or `strapi build`) and compiles it first only if ./dist is missing.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStrapi, compileStrapi } = require('@strapi/strapi');

const data = require('./seed-data.json');

const SHOW = 'api::show.show';
const EPISODE = 'api::episode.episode';
const AUTHOR = 'api::author.author';
const CATEGORY = 'api::category.category';
const ARTICLE = 'api::article.article';

let created = 0;
let skipped = 0;

async function uploadImage(strapi, url, name) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimetype = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const ext = mimetype === 'image/png' ? 'png' : mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${name}.${ext}`;
  const filepath = path.join(os.tmpdir(), `seed-${Date.now()}-${filename}`);
  fs.writeFileSync(filepath, buffer);

  try {
    const [file] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: { fileInfo: { name: filename, alternativeText: name } },
        files: { filepath, originalFilename: filename, mimetype, size: buffer.length },
      });
    return file.id;
  } finally {
    fs.rmSync(filepath, { force: true });
  }
}

/** Create a published entry unless one matching `where` exists; returns its documentId. */
async function upsert(strapi, uid, where, build) {
  const existing = await strapi.documents(uid).findFirst({ filters: where });
  if (existing) {
    skipped++;
    return existing.documentId;
  }
  const entry = await strapi.documents(uid).create({ data: await build(), status: 'published' });
  created++;
  console.log(`seed: created ${uid} ${JSON.stringify(where)}`);
  return entry.documentId;
}

const richText = (body) => (body ? [{ __component: 'shared.rich-text', body }] : []);

async function seed(strapi) {
  const shows = {};
  for (const { cover, ...show } of data.shows) {
    shows[show.slug] = await upsert(strapi, SHOW, { slug: show.slug }, async () => ({
      ...show,
      cover: await uploadImage(strapi, cover, show.slug),
    }));
  }

  for (const { cover, show, body, ...episode } of data.episodes) {
    await upsert(strapi, EPISODE, { slug: episode.slug }, async () => ({
      ...episode,
      show: shows[show],
      blocks: richText(body),
      cover: await uploadImage(strapi, cover, episode.slug),
    }));
  }

  const authors = {};
  for (const author of data.authors) {
    authors[author.name] = await upsert(strapi, AUTHOR, { name: author.name }, async () => author);
  }

  const categories = {};
  for (const category of data.categories) {
    categories[category.slug] = await upsert(
      strapi,
      CATEGORY,
      { slug: category.slug },
      async () => category,
    );
  }

  for (const { cover, author, category, body, ...article } of data.articles) {
    await upsert(strapi, ARTICLE, { slug: article.slug }, async () => ({
      ...article,
      author: authors[author],
      category: categories[category],
      blocks: richText(body),
      cover: await uploadImage(strapi, cover, article.slug),
    }));
  }
}

async function main() {
  const appDir = path.resolve(__dirname, '..');
  const distDir = path.join(appDir, 'dist');
  const options = fs.existsSync(path.join(distDir, 'src'))
    ? { appDir, distDir }
    : await compileStrapi({ appDir });

  const strapi = await createStrapi(options).load();
  strapi.log.level = 'error';
  try {
    await seed(strapi);
    console.log(`seed: ${created} created, ${skipped} already present`);
  } finally {
    await strapi.destroy();
  }
}

main().catch((error) => {
  console.error('seed failed:', error);
  process.exit(1);
});
