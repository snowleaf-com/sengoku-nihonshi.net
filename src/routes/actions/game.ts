import { Hono } from 'hono'
import { requireAuth } from '../../middleware/auth'
import { DomainError } from '../../services/character'
import {
  applyCommandsToPositions,
  buildRecruitPayload,
  buildTradePayload,
  clearCommandPositions,
  repeatSelectedCommands,
} from '../../services/commands'
import { enterWorld } from '../../services/enter-world'
import { raiseHouse } from '../../services/house'
import { advanceDueTurns } from '../../services/turns'
import { ensureProvincesSeeded } from '../../services/world'
import { CharacterRepository } from '../../repositories/characters'
import { ProvinceRepository } from '../../repositories/provinces'
import type { AppEnv } from '../../types'

export const gameActionRoutes = new Hono<AppEnv>()

gameActionRoutes.use('*', requireAuth)

function parseBodyString(body: Record<string, unknown>, key: string): string {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}

function parseBodyIds(body: Record<string, unknown>, key: string): string[] {
  const value = body[key]
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

/** 同名チェックボックスは all:true でないと最後の1件しか取れない */
async function parseCommandForm(c: {
  req: { parseBody: (options?: { all?: boolean }) => Promise<Record<string, unknown>> }
}) {
  const body = await c.req.parseBody({ all: true })
  return {
    commandId: parseBodyString(body, 'commandId'),
    positions: parseBodyIds(body, 'positions'),
  }
}

gameActionRoutes.post('/character', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  await ensureProvincesSeeded(c.env.DB)
  const body = await c.req.parseBody()
  const name = parseBodyString(body, 'name')
  const iconId = parseBodyString(body, 'iconId')
  const archetypeId = parseBodyString(body, 'archetypeId')
  const buyu = typeof body.buyu === 'string' ? body.buyu : undefined
  const chiryaku = typeof body.chiryaku === 'string' ? body.chiryaku : undefined
  const toso = typeof body.toso === 'string' ? body.toso : undefined
  const provinceId = parseBodyString(body, 'provinceId')
  const houseName = parseBodyString(body, 'houseName')

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
  const houseName = parseBodyString(body, 'houseName')

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

gameActionRoutes.post('/apply-commands', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const body = await c.req.parseBody({ all: true })
  const commandId = parseBodyString(body, 'commandId')
  const positions = parseBodyIds(body, 'positions')

  try {
    let payload = null as
      | { kind: 'move'; provinceId: string }
      | { kind: 'trade'; side: 'sell_rice' | 'sell_gold'; amount: number; marketRate: number }
      | { kind: 'recruit'; amount: number }
      | null

    if (commandId === 'idou') {
      const provinceId = parseBodyString(body, 'moveProvinceId')
      payload = { kind: 'move', provinceId }
    } else if (commandId === 'beibai') {
      const sideRaw = parseBodyString(body, 'tradeSide')
      const side = sideRaw === 'sell_gold' ? 'sell_gold' : 'sell_rice'
      const amount = Number.parseInt(parseBodyString(body, 'tradeAmount'), 10)
      const character = await new CharacterRepository(c.env.DB).findByUserId(user.id)
      if (!character) throw new DomainError('武将が見つかりません')
      const province = await new ProvinceRepository(c.env.DB).findById(character.provinceId)
      if (!province) throw new DomainError('所在国がありません')
      payload = buildTradePayload({
        side,
        amount,
        marketRate: province.marketRate,
      })
    } else if (commandId === 'chouhei') {
      const amount = Number.parseInt(parseBodyString(body, 'recruitAmount'), 10)
      payload = buildRecruitPayload({ amount })
    }

    await applyCommandsToPositions(c.env.DB, {
      userId: user.id,
      commandId,
      positions,
      payload,
    })
    return c.redirect('/game')
  } catch (error) {
    if (error instanceof DomainError) {
      return c.redirect(`/game?cmdError=${encodeURIComponent(error.message)}`)
    }
    console.error(error)
    return c.redirect(`/game?cmdError=${encodeURIComponent('コマンド入力に失敗しました')}`)
  }
})

gameActionRoutes.post('/clear-commands', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const { positions } = await parseCommandForm(c)

  try {
    await clearCommandPositions(c.env.DB, { userId: user.id, positions })
    return c.redirect('/game')
  } catch (error) {
    if (error instanceof DomainError) {
      return c.redirect(`/game?cmdError=${encodeURIComponent(error.message)}`)
    }
    console.error(error)
    return c.redirect(`/game?cmdError=${encodeURIComponent('コマンド削除に失敗しました')}`)
  }
})

gameActionRoutes.post('/repeat-commands', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/')

  const { positions } = await parseCommandForm(c)

  try {
    await repeatSelectedCommands(c.env.DB, { userId: user.id, positions })
    return c.redirect('/game')
  } catch (error) {
    if (error instanceof DomainError) {
      return c.redirect(`/game?cmdError=${encodeURIComponent(error.message)}`)
    }
    console.error(error)
    return c.redirect(`/game?cmdError=${encodeURIComponent('コマンド繰返に失敗しました')}`)
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
