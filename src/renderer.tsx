import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>戦国日本史.net</title>
        <ViteClient />
        <Link href="/src/style.css" rel="stylesheet" />
        <script src="/htmx.js" defer></script>
        <Script src="/src/client/passkey.ts" />
        <Script src="/src/client/stat-adjust.ts" />
        <Script src="/src/client/command-queue.ts" />
        <Script src="/src/client/turn-countdown.ts" />
        <Script src="/src/client/command-sheet.ts" />
        <Script src="/src/client/ranking-filter.ts" />
        <Script src="/src/client/feed-seen.ts" />
      </head>
      <body>{children}</body>
    </html>
  )
})
