import { Hono } from 'hono'
import { redirectIfAuthenticated, requireAuth, sessionMiddleware } from './middleware/auth'
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

app.get('/game', requireAuth, (c) => {
  const user = c.get('user')
  if (!user) {
    return c.redirect('/')
  }
  return c.render(<GamePage user={user} />)
})

export default app
