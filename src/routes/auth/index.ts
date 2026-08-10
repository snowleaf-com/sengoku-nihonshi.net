import { Hono } from 'hono'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server'
import {
  AuthError,
  beginAuthentication,
  beginRegistration,
  finishAuthentication,
  finishRegistration,
} from '../../auth/passkey'
import { createSession, destroySession } from '../../auth/session'
import type { AppEnv } from '../../types'

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/register/options', async (c) => {
  if (c.get('user')) {
    return c.json({ error: 'already_authenticated' }, 400)
  }

  try {
    const result = await beginRegistration(c.env)
    return c.json(result)
  } catch (error) {
    return authErrorResponse(c, error)
  }
})

authRoutes.post('/register/verify', async (c) => {
  if (c.get('user')) {
    return c.json({ error: 'already_authenticated' }, 400)
  }

  try {
    const body = await c.req.json<{
      challengeId: string
      response: RegistrationResponseJSON
    }>()

    if (!body.challengeId || !body.response) {
      return c.json({ error: 'invalid_body' }, 400)
    }

    const { user } = await finishRegistration(c.env, body)
    await createSession(c, user.id)

    return c.json({ ok: true, redirectTo: '/game' })
  } catch (error) {
    return authErrorResponse(c, error)
  }
})

authRoutes.post('/login/options', async (c) => {
  if (c.get('user')) {
    return c.json({ error: 'already_authenticated' }, 400)
  }

  try {
    const result = await beginAuthentication(c.env)
    return c.json(result)
  } catch (error) {
    return authErrorResponse(c, error)
  }
})

authRoutes.post('/login/verify', async (c) => {
  if (c.get('user')) {
    return c.json({ error: 'already_authenticated' }, 400)
  }

  try {
    const body = await c.req.json<{
      challengeId: string
      response: AuthenticationResponseJSON
    }>()

    if (!body.challengeId || !body.response) {
      return c.json({ error: 'invalid_body' }, 400)
    }

    const { user } = await finishAuthentication(c.env, body)
    await createSession(c, user.id)

    return c.json({ ok: true, redirectTo: '/game' })
  } catch (error) {
    return authErrorResponse(c, error)
  }
})

authRoutes.post('/logout', async (c) => {
  await destroySession(c)
  return c.redirect('/')
})

function authErrorResponse(c: { json: (body: unknown, status?: number) => Response }, error: unknown) {
  if (error instanceof AuthError) {
    return c.json({ error: error.message }, 400)
  }
  console.error(error)
  return c.json({ error: 'internal_error' }, 500)
}
