import { Hono } from 'hono'
import { isCharacterIconId } from './config/icons'
import { normalizeCharacterName } from './lib/character-name'
import { createId, nowSeconds } from './lib/id'
import { redirectIfAuthenticated, requireAuth, sessionMiddleware } from './middleware/auth'
import { CharacterRepository } from './repositories/characters'
import { authRoutes } from './routes/auth'
import { GamePage } from './routes/pages/game'
import { HomePage } from './routes/pages/home'
import { LoginPage } from './routes/pages/login'
import { renderer } from './renderer'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.use('*', sessionMiddleware)
app.use('*', renderer)

app.route('/auth', authRoutes)

app.get('/', redirectIfAuthenticated, (c) => {
  return c.render(<HomePage />)
})

app.get('/login', redirectIfAuthenticated, (c) => {
  return c.render(<LoginPage />)
})

app.get('/game', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.redirect('/')
  }

  const character = await new CharacterRepository(c.env.DB).findByUserId(user.id)
  const error = c.req.query('error') ?? null
  return c.render(<GamePage user={user} character={character} error={error} />)
})

app.post('/game/character', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.redirect('/')
  }

  const characters = new CharacterRepository(c.env.DB)
  const existing = await characters.findByUserId(user.id)
  if (existing) {
    return c.redirect('/game?error=already_exists')
  }

  const body = await c.req.parseBody()
  const rawName = typeof body.name === 'string' ? body.name : ''
  const rawIconId = typeof body.iconId === 'string' ? body.iconId : ''

  const name = normalizeCharacterName(rawName)
  if (!name) {
    return c.redirect('/game?error=invalid_name')
  }
  if (!isCharacterIconId(rawIconId)) {
    return c.redirect('/game?error=invalid_icon')
  }

  await characters.create({
    id: createId(),
    userId: user.id,
    name,
    iconId: rawIconId,
    createdAt: nowSeconds(),
  })

  return c.redirect('/game')
})

export default app
