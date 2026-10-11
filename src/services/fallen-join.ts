import { FALLEN_JOIN_STAT_BONUS, FALLEN_JOIN_WINDOW_TURNS } from '../config/net'
import { CharacterRepository } from '../repositories/characters'
import type { Character } from '../types'

export type FallenJoinBonus = {
  statBonus: number
}

/**
 * 滅亡後に勝者の家へ入ったときの帰順の礼。
 * 条件を満たせば武勇・知略・統率を上げ、fallen 印は必ず消す。
 */
export async function claimFallenJoinBonus(
  db: D1Database,
  character: Character,
  joiningHouseId: string,
  turnIndex: number,
  now: number,
): Promise<FallenJoinBonus | null> {
  const characters = new CharacterRepository(db)
  const eligible =
    character.fallenToHouseId === joiningHouseId &&
    character.fallenAtTurn != null &&
    turnIndex - character.fallenAtTurn <= FALLEN_JOIN_WINDOW_TURNS

  if (!eligible) {
    if (character.fallenToHouseId || character.fallenAtTurn != null) {
      await characters.clearFallenTo(character.id, now)
    }
    return null
  }

  await characters.updateResources(character.id, {
    buyu: character.buyu + FALLEN_JOIN_STAT_BONUS,
    chiryaku: character.chiryaku + FALLEN_JOIN_STAT_BONUS,
    toso: character.toso + FALLEN_JOIN_STAT_BONUS,
    updatedAt: now,
  })
  await characters.clearFallenTo(character.id, now)
  return { statBonus: FALLEN_JOIN_STAT_BONUS }
}
