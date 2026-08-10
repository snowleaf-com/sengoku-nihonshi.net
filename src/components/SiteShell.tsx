import type { Child } from 'hono/jsx'

type SiteShellProps = {
  title?: string
  children?: Child
}

export function SiteShell({ title = '戦国日本史.net', children }: SiteShellProps) {
  return (
    <div class="site">
      <header class="site-header">
        <a class="brand" href="/">
          戦国日本史.net
        </a>
      </header>
      <main class="site-main">{children}</main>
      <footer class="site-footer">
        <span>{title}</span>
      </footer>
    </div>
  )
}
