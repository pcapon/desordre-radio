import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // nitro() emits a real self-listening Node server at .output/server/index.mjs
  // (default node-server preset) — the canonical TanStack Start production server.
  plugins: [
    devtools(),
    // Compiles messages/*.json into typed functions in src/paraglide (generated,
    // git-ignored). The URL decides the locale: /x is French, /en/x English.
    // The cookie only records the last choice (see src/server.ts).
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'cookie', 'baseLocale'],
      cookieSameSite: 'lax',
      emitTsDeclarations: true,
    }),
    tailwindcss(),
    tanstackStart(),
    // Nitro's dev environment crashes under Vitest; tests don't need a server.
    ...(process.env.VITEST ? [] : [nitro()]),
    viteReact(),
  ],
})

export default config
