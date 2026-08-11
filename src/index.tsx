import { Hono } from 'hono'
import { requireAuth, redirectIfAuthenticated, sessionMiddleware } from './middleware/auth'
import { authRoutes } from './routes/auth'
import { gameActionRoutes } from './routes/actions/game'
import { EnterPathPanel } from './components/EnterPathPanel'
import { StatAdjustPanel } from './components/StatAdjustPanel'
import { CharacterCreatePage } from './routes/pages/character-create'
import { GameHubPage } from './routes/pages/game-hub'
import { HomePage } from './routes/pages/home'
import { LoginPage } from './routes/pages/login'
import { CharacterRepository } from './repositories/characters'
import { HouseRepository } from './repositories/houses'
import { ProvinceRepository } from './repositories/provinces'
import { renderer } from './renderer'
import {
  defaultStatsForArchetype,
  isArchetypeId,
} from './config/archetypes'
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

app.get('/game/fragments/enter-path', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) return c.body('Unauthorized', 401)

  await ensureProvincesSeeded(c.env.DB)
  const provinceId = c.req.query('provinceId') ?? ''
  if (!provinceId) {
    return c.html(<EnterPathPanel mode="idle" />)
  }

  const province = await new ProvinceRepository(c.env.DB).findById(provinceId)
  if (!province) {
    return c.html(<p class="hero-error">選択した国が見つかりません</p>)
  }

  if (!province.houseId) {
    return c.html(<EnterPathPanel mode="found" provinceName={province.name} />)
  }

  const house = await new HouseRepository(c.env.DB).findById(province.houseId)
  if (!house || house.destroyedAt) {
    return c.html(<p class="hero-error">仕官先の家が見つかりません</p>)
  }

  return c.html(
    <EnterPathPanel mode="enlist" provinceName={province.name} houseName={house.name} />,
  )
})

app.get('/game/fragments/stat-adjust', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) return c.body('Unauthorized', 401)

  const archetypeId = c.req.query('archetypeId') ?? 'domestic'
  if (!isArchetypeId(archetypeId)) {
    return c.html(<p class="hero-error">立ち回りが不正です</p>)
  }

  return c.html(<StatAdjustPanel stats={defaultStatsForArchetype(archetypeId)} />)
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
    return c.render(
      <CharacterCreatePage
        error={error}
        provinces={provinces}
        houses={houses}
        previewColor={nextHouseColor(houses.length)}
      />,
    )
  }

  const [province, provinces, houses] = await Promise.all([
    provincesRepo.findById(character.provinceId),
    provincesRepo.listAll(),
    housesRepo.listActive(),
  ])

  if (!province) {
    return c.render(
      <CharacterCreatePage
        error="所在国データが壊れています。管理者に連絡してください。"
        provinces={provinces}
        houses={houses}
        previewColor={nextHouseColor(houses.length)}
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
