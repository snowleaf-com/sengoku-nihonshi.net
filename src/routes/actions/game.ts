import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth'
import { createCharacter, DomainError } from '../../services/character'
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
  const provinceId = typeof body.provinceId === 'string' ? body.provinceId : ''

  try {
    await createCharacter(c.env.DB, { userId: user.id, name, provinceId })
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
