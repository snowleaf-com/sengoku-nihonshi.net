import { Hono } from 'hono'
import { requireAuth, redirectIfAuthenticated, sessionMiddleware } from './middleware/auth'
import { authRoutes } from './routes/auth'
import { gameActionRoutes } from './routes/actions/game'
import { EnterPathPanel } from './components/EnterPathPanel'
import { StatAdjustPanel } from './components/StatAdjustPanel'
import { CharacterCreatePage } from './routes/pages/character-create'
import { GameHubPage } from './routes/pages/game-hub'
import { HouseCouncilPage } from './routes/pages/house-council'
import { HomePage } from './routes/pages/home'
import { LettersPage } from './routes/pages/letters'
import { LoginPage } from './routes/pages/login'
import { RankingPage } from './routes/pages/ranking'
import { CharacterCommandRepository } from './repositories/character-commands'
import { CharacterRepository } from './repositories/characters'
import { GameStateRepository } from './repositories/game-state'
import { HouseRepository } from './repositories/houses'
import { ProvinceRepository } from './repositories/provinces'
import { UnitRepository } from './repositories/units'
import { renderer } from './renderer'
import {
  defaultStatsForArchetype,
  isArchetypeId,
} from './config/archetypes'
import { nextHouseColor } from './config/game'
import { DomainError } from './services/character'
import {
  listHouseMessages,
  listInbox,
  listRanking,
  postHouseMessage,
  sendLetter,
  updateHouseLaw,
} from './services/social'
import { ensureProvincesSeeded } from './services/world'
import { listActionResults, listWorldNews } from './services/events'
import { advanceDueTurns, ensureGameState } from './services/turns'
import { nowSeconds } from './lib/id'
import type { AppEnv } from './types'
import { AdminPage } from './routes/pages/admin'

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
  await advanceDueTurns(c.env.DB)
  const gameState = await ensureGameState(c.env.DB)

  const error = c.req.query('error') ?? null
  const cmdError = c.req.query('cmdError') ?? null
  const notice = c.req.query('notice') ?? null
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

  const [province, provinces, houses, queue, news, results, locals] = await Promise.all([
    provincesRepo.findById(character.provinceId),
    provincesRepo.listAll(),
    housesRepo.listActive(),
    new CharacterCommandRepository(c.env.DB).listByCharacter(character.id),
    listWorldNews(c.env.DB),
    listActionResults(c.env.DB, character.id),
    characters.listByProvinceId(character.provinceId),
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
  const houseById = Object.fromEntries(houses.map((h) => [h.id, h]))
  const recruitTargets = locals
    .filter((row) => row.id !== character.id)
    .filter((row) => !row.houseId || row.houseId !== character.houseId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      houseLabel: row.houseId ? (houseById[row.houseId]?.name ?? '他家') : '浪人',
    }))
  const allChars = await characters.listAll()
  const characterNameById = Object.fromEntries(allChars.map((row) => [row.id, row.name]))

  const unitsRepo = new UnitRepository(c.env.DB)
  const myUnit = await unitsRepo.findByMember(character.id)
  const unit = myUnit
    ? {
        id: myUnit.id,
        name: myUnit.name,
        isLeader: myUnit.leaderCharacterId === character.id,
      }
    : null
  const houseUnits =
    character.houseId && !myUnit
      ? (await unitsRepo.listByHouse(character.houseId)).map((u) => ({
          id: u.id,
          name: u.name,
        }))
      : []

  return c.render(
    <GameHubPage
      character={character}
      province={province}
      house={house}
      provinces={provinces}
      houses={houses}
      gameState={gameState}
      queue={queue}
      news={news}
      results={results}
      recruitTargets={recruitTargets}
      characterNameById={characterNameById}
      unit={unit}
      houseUnits={houseUnits}
      commandError={cmdError}
      error={error}
      notice={notice}
    />,
  )
})

function parseBodyString(body: Record<string, unknown>, key: string): string {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}

app.get('/game/house', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const error = c.req.query('error') ?? null
  const notice = c.req.query('notice') ?? null

  try {
    const { house, character, messages } = await listHouseMessages(c.env.DB, {
      userId: user.id,
    })
    return c.render(
      <HouseCouncilPage
        character={character}
        house={house}
        messages={messages}
        error={error}
        notice={notice}
      />,
    )
  } catch (err) {
    if (err instanceof DomainError) {
      return c.redirect(`/game?error=${encodeURIComponent(err.message)}`)
    }
    throw err
  }
})

app.post('/game/house', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const body = await c.req.parseBody()
  const intent = parseBodyString(body, 'intent')

  try {
    if (intent === 'law') {
      await updateHouseLaw(c.env.DB, {
        userId: user.id,
        lawText: parseBodyString(body, 'lawText'),
      })
      return c.redirect(`/game/house?notice=${encodeURIComponent('国法を更新した')}`)
    }
    await postHouseMessage(c.env.DB, {
      userId: user.id,
      body: parseBodyString(body, 'body'),
    })
    return c.redirect(`/game/house?notice=${encodeURIComponent('会議室に投稿した')}`)
  } catch (err) {
    if (err instanceof DomainError) {
      return c.redirect(`/game/house?error=${encodeURIComponent(err.message)}`)
    }
    throw err
  }
})

app.get('/game/letters', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const error = c.req.query('error') ?? null
  const notice = c.req.query('notice') ?? null
  const characters = new CharacterRepository(c.env.DB)
  const character = await characters.findByUserId(user.id)
  if (!character) {
    return c.redirect(`/game?error=${encodeURIComponent('先に武将を作成してください')}`)
  }

  const [{ letters }, all] = await Promise.all([
    listInbox(c.env.DB, { userId: user.id }),
    characters.listAll(),
  ])
  const recipients = all.filter((row) => row.id !== character.id)

  return c.render(
    <LettersPage
      character={character}
      letters={letters}
      recipients={recipients}
      error={error}
      notice={notice}
    />,
  )
})

app.post('/game/letters', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const body = await c.req.parseBody()
  try {
    await sendLetter(c.env.DB, {
      userId: user.id,
      toCharacterId: parseBodyString(body, 'toCharacterId') || undefined,
      toName: parseBodyString(body, 'toName') || undefined,
      body: parseBodyString(body, 'body'),
    })
    return c.redirect(`/game/letters?notice=${encodeURIComponent('手紙を送った')}`)
  } catch (err) {
    if (err instanceof DomainError) {
      return c.redirect(`/game/letters?error=${encodeURIComponent(err.message)}`)
    }
    throw err
  }
})

app.get('/game/ranking', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const character = await new CharacterRepository(c.env.DB).findByUserId(user.id)
  if (!character) {
    return c.redirect(`/game?error=${encodeURIComponent('先に武将を作成してください')}`)
  }

  const rows = await listRanking(c.env.DB)
  return c.render(<RankingPage rows={rows} />)
})

function adminAuthorized(
  env: AppEnv['Bindings'],
  input: { querySecret?: string | null; headerSecret?: string | null; formSecret?: string | null },
): boolean {
  const expected = env.ADMIN_SECRET
  if (!expected) return false
  return (
    input.querySecret === expected ||
    input.headerSecret === expected ||
    input.formSecret === expected
  )
}

app.get('/admin', async (c) => {
  const secret =
    c.req.query('secret') ??
    c.req.header('x-admin-secret') ??
    ''
  const authorized = adminAuthorized(c.env, {
    querySecret: secret || null,
    headerSecret: c.req.header('x-admin-secret'),
  })
  const state = authorized ? await ensureGameState(c.env.DB) : null
  return c.render(
    <AdminPage
      authorized={authorized}
      secret={authorized ? secret : ''}
      maintenance={state?.maintenance ?? 0}
      year={state?.year ?? null}
      month={state?.month ?? null}
      error={c.req.query('error') ?? null}
      notice={c.req.query('notice') ?? null}
    />,
  )
})

app.post('/admin', async (c) => {
  const body = await c.req.parseBody()
  const formSecret = typeof body.secret === 'string' ? body.secret : ''
  if (
    !adminAuthorized(c.env, {
      formSecret,
      querySecret: c.req.query('secret'),
      headerSecret: c.req.header('x-admin-secret'),
    })
  ) {
    return c.redirect(`/admin?error=${encodeURIComponent('認証に失敗しました')}`)
  }

  const intent = typeof body.intent === 'string' ? body.intent : ''
  const repo = new GameStateRepository(c.env.DB)
  const now = nowSeconds()

  if (intent === 'toggle_maintenance') {
    const state = await ensureGameState(c.env.DB)
    await repo.setMaintenance(state.maintenance ? 0 : 1, now)
    return c.redirect(
      `/admin?secret=${encodeURIComponent(formSecret)}&notice=${encodeURIComponent(
        state.maintenance ? 'メンテを解除した' : 'メンテを開始した',
      )}`,
    )
  }

  if (intent === 'advance_turn') {
    await advanceDueTurns(c.env.DB, { force: true })
    return c.redirect(
      `/admin?secret=${encodeURIComponent(formSecret)}&notice=${encodeURIComponent('ターンを進行した')}`,
    )
  }

  return c.redirect(
    `/admin?secret=${encodeURIComponent(formSecret)}&error=${encodeURIComponent('不明な操作')}`,
  )
})

const worker = {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: AppEnv['Bindings'],
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(advanceDueTurns(env.DB))
  },
}

export default worker
