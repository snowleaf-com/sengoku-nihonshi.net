import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(root, 'migrations'))

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            WEBAUTHN_RP_ID: 'localhost',
            WEBAUTHN_ORIGIN: 'http://localhost:5173',
            WEBAUTHN_RP_NAME: '戦国日本史.net',
            SESSION_TTL_SECONDS: '15552000',
            TURN_INTERVAL_SECONDS: '60',
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
    },
  }
})
