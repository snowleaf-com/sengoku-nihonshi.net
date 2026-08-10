declare module 'cloudflare:test' {
  // Cloudflare vitest 用。D1Migration 配列を bindings 経由で渡す。
}

declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
