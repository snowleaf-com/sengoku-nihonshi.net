import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth'
import { DomainError } from '../../services/character'
import { cancelQueuedCommand, enqueueCommand } from '../../services/commands'
import { enterWorld } from '../../services/enter-world'
import { raiseHouse } from '../../services/house'
import { advanceDueTurns } from '../../services/turns'
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

gameActionRoutes.post('/enqueue-command', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const body = await c.req.parseBody()
  const commandId = typeof body.commandId === 'string' ? body.commandId : ''

  try {
    await enqueueCommand(c.env.DB, { userId: user.id, commandId })
    return c.redirect('/game')
  } catch (error) {
    if (error instanceof DomainError) {
      return c.redirect(`/game?error=${encodeURIComponent(error.message)}`)
    }
    console.error(error)
    return c.redirect(`/game?error=${encodeURIComponent('コマンド予約に失敗しました')}`)
  }
})

gameActionRoutes.post('/cancel-command', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const body = await c.req.parseBody()
  const queueId = typeof body.queueId === 'string' ? body.queueId : ''

  try {
    await cancelQueuedCommand(c.env.DB, { userId: user.id, queueId })
    return c.redirect('/game')
  } catch (error) {
    if (error instanceof DomainError) {
      return c.redirect(`/game?error=${encodeURIComponent(error.message)}`)
    }
    console.error(error)
    return c.redirect(`/game?error=${encodeURIComponent('コマンド取消に失敗しました')}`)
  }
})

gameActionRoutes.post('/advance-turn', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  try {
    await advanceDueTurns(c.env.DB, { force: true })
    return c.redirect('/game')
  } catch (error) {
    console.error(error)
    return c.redirect(`/game?error=${encodeURIComponent('ターン進行に失敗しました')}`)
  }
})
