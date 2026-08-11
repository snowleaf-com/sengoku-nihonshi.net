import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth'
import { DomainError } from '../../services/character'
import { enterWorld } from '../../services/enter-world'
import { raiseHouse } from '../../services/house'
import { ensureProvincesSeeded } from '../../services/world'
import type { AppEnv } from '../../types'

export const gameActionRoutes = new Hono<AppEnv>()

gameActionRoutes.use('*', requireAuth)

gameActionRoutes.post('/character', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  await ensureProvincesSeeded(c.env.DB)
  const body = await c.req.parseBody()
  const name = typeof body.name === 'string' ? body.name : ''
  const iconId = typeof body.iconId === 'string' ? body.iconId : ''
  const archetypeId = typeof body.archetypeId === 'string' ? body.archetypeId : ''
  const buyu = typeof body.buyu === 'string' ? body.buyu : undefined
  const chiryaku = typeof body.chiryaku === 'string' ? body.chiryaku : undefined
  const toso = typeof body.toso === 'string' ? body.toso : undefined
  const provinceId = typeof body.provinceId === 'string' ? body.provinceId : ''
  const houseName = typeof body.houseName === 'string' ? body.houseName : ''

  try {
    await enterWorld(c.env.DB, {
      userId: user.id,
      name,
      iconId,
      archetypeId,
      buyu,
      chiryaku,
      toso,
      provinceId,
      houseName,
    })
    return c.redirect('/game')
  } catch (error) {
    if (error instanceof DomainError) {
      return c.redirect(`/game?error=${encodeURIComponent(error.message)}`)
    }
    console.error(error)
    return c.redirect(`/game?error=${encodeURIComponent('武将作成に失敗しました')}`)
  }
})

gameActionRoutes.post('/raise-house', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const body = await c.req.parseBody()
  const houseName = typeof body.houseName === 'string' ? body.houseName : ''

  try {
    await raiseHouse(c.env.DB, { userId: user.id, houseName })
    return c.redirect('/game')
  } catch (error) {
    if (error instanceof DomainError) {
      return c.redirect(`/game?error=${encodeURIComponent(error.message)}`)
    }
    console.error(error)
    return c.redirect(`/game?error=${encodeURIComponent('旗揚げに失敗しました')}`)
  }
})
