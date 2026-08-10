import { Hono } from 'hono'
import { requireAuth, redirectIfAuthenticated, sessionMiddleware } from './middleware/auth'
import { authRoutes } from './routes/auth'
import { gameActionRoutes } from './routes/actions/game'
import { CharacterCreatePage } from './routes/pages/character-create'
import { GameHubPage } from './routes/pages/game-hub'
import { HomePage } from './routes/pages/home'
import { LoginPage } from './routes/pages/login'
import { CharacterRepository } from './repositories/characters'
import { HouseRepository } from './repositories/houses'
import { ProvinceRepository } from './repositories/provinces'
import { renderer } from './renderer'
import { nextHouseColor } from './config/game'
import { ensureProvincesSeeded } from './services/world'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.use('*', sessionMiddleware)
app.use('*', renderer)

app.route('/auth', authRoutes)
app.route('/actions', gameActionRoutes)

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

  await ensureProvincesSeeded(c.env.DB)

  const error = c.req.query('error') ?? null
  const characters = new CharacterRepository(c.env.DB)
  const character = await characters.findByUserId(user.id)

  const provincesRepo = new ProvinceRepository(c.env.DB)
  const housesRepo = new HouseRepository(c.env.DB)

  if (!character) {
    const [provinces, houses] = await Promise.all([
      provincesRepo.listAll(),
      housesRepo.listActive(),
    ])
    const hasNeutral = provinces.some((p) => !p.houseId)
    return c.render(
      <CharacterCreatePage
        error={error}
        provinces={provinces}
        houses={houses}
        previewColor={nextHouseColor(houses.length)}
        hasNeutral={hasNeutral}
      />,
    )
  }

  const [province, provinces, houses] = await Promise.all([
    provincesRepo.findById(character.provinceId),
    provincesRepo.listAll(),
    housesRepo.listActive(),
  ])

  if (!province) {
    const hasNeutral = provinces.some((p) => !p.houseId)
    return c.render(
      <CharacterCreatePage
        error="所在国データが壊れています。管理者に連絡してください。"
        provinces={provinces}
        houses={houses}
        previewColor={nextHouseColor(houses.length)}
        hasNeutral={hasNeutral}
      />,
    )
  }

  const house = character.houseId ? await housesRepo.findById(character.houseId) : null

  return c.render(
    <GameHubPage
      character={character}
      province={province}
      house={house}
      provinces={provinces}
      houses={houses}
      error={error}
    />,
  )
})

export default app
