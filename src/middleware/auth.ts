import { createMiddleware } from 'hono/factory'
import { loadSession } from '../auth/session'
import type { AppEnv } from '../types'

/** 全リクエストで Cookie → D1 session を解決し、c.set('user'|'session') する。 */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const loaded = await loadSession(c)
  c.set('user', loaded?.user ?? null)
  c.set('session', loaded?.session ?? null)
  await next()
})

/** 未ログインなら / へ。アカウント切替は提供しない。 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('user')) {
    return c.redirect('/')
  }
  await next()
})

/** ログイン済みなら /game へ（重複登録を面倒にするための誘導）。 */
export const redirectIfAuthenticated = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('user')) {
    return c.redirect('/game')
  }
  await next()
})
