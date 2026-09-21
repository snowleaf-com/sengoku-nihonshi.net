import type { Character } from '../types'

type CharacterRow = {
  id: string
  user_id: string
  name: string
  icon_id: string
  archetype_id: string
  buyu: number
  chiryaku: number
  toso: number
  tokubo: number
  buyu_ex: number
  chiryaku_ex: number
  toso_ex: number
  tokubo_ex: number
  house_id: string | null
  province_id: string
  rank: number
  merit: number
  class_points: number
  money: number
  rice: number
  troops: number
  training: number
  defending: number
  created_at: number
  updated_at: number
}

const CHARACTER_COLUMNS = `id, user_id, name, icon_id, archetype_id, buyu, chiryaku, toso, tokubo,
  buyu_ex, chiryaku_ex, toso_ex, tokubo_ex,
  house_id, province_id, rank, merit, class_points, money, rice, troops, training, defending,
  created_at, updated_at`

function mapCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    iconId: row.icon_id,
    archetypeId: row.archetype_id,
    buyu: row.buyu,
    chiryaku: row.chiryaku,
    toso: row.toso,
    tokubo: row.tokubo,
    buyuEx: row.buyu_ex,
    chiryakuEx: row.chiryaku_ex,
    tosoEx: row.toso_ex,
    tokuboEx: row.tokubo_ex,
    houseId: row.house_id,
    provinceId: row.province_id,
    rank: row.rank,
    merit: row.merit,
    classPoints: row.class_points,
    money: row.money,
    rice: row.rice,
    troops: row.troops,
    training: row.training,
    defending: row.defending,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CharacterRepository {
  constructor(private readonly db: D1Database) {}

  async create(input: {
    id: string
    userId: string
    name: string
    iconId: string
    archetypeId: string
    buyu: number
    chiryaku: number
    toso: number
    tokubo: number
    provinceId: string
    rank: number
    merit: number
    money: number
    rice: number
    troops: number
    createdAt: number
  }): Promise<Character> {
    await this.db
      .prepare(
        `INSERT INTO characters (
           id, user_id, name, icon_id, archetype_id, buyu, chiryaku, toso, tokubo,
           buyu_ex, chiryaku_ex, toso_ex, tokubo_ex,
           house_id, province_id, rank, merit, class_points, money, rice, troops,
           training, defending, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, NULL, ?, ?, ?, 0, ?, ?, ?, 0, 0, ?, ?)`,
      )
      .bind(
        input.id,
        input.userId,
        input.name,
        input.iconId,
        input.archetypeId,
        input.buyu,
        input.chiryaku,
        input.toso,
        input.tokubo,
        input.provinceId,
        input.rank,
        input.merit,
        input.money,
        input.rice,
        input.troops,
        input.createdAt,
        input.createdAt,
      )
      .run()

    return {
      id: input.id,
      userId: input.userId,
      name: input.name,
      iconId: input.iconId,
      archetypeId: input.archetypeId,
      buyu: input.buyu,
      chiryaku: input.chiryaku,
      toso: input.toso,
      tokubo: input.tokubo,
      buyuEx: 0,
      chiryakuEx: 0,
      tosoEx: 0,
      tokuboEx: 0,
      houseId: null,
      provinceId: input.provinceId,
      rank: input.rank,
      merit: input.merit,
      classPoints: 0,
      money: input.money,
      rice: input.rice,
      troops: input.troops,
      training: 0,
      defending: 0,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    }
  }

  async findByUserId(userId: string): Promise<Character | null> {
    const row = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters WHERE user_id = ?`)
      .bind(userId)
      .first<CharacterRow>()
    return row ? mapCharacter(row) : null
  }

  async findById(id: string): Promise<Character | null> {
    const row = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters WHERE id = ?`)
      .bind(id)
      .first<CharacterRow>()
    return row ? mapCharacter(row) : null
  }

  async findByName(name: string): Promise<Character | null> {
    const row = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters WHERE name = ?`)
      .bind(name)
      .first<CharacterRow>()
    return row ? mapCharacter(row) : null
  }

  async listAll(): Promise<Character[]> {
    const result = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters`)
      .all<CharacterRow>()
    return (result.results ?? []).map(mapCharacter)
  }

  async listByHouseId(houseId: string): Promise<Character[]> {
    const result = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters WHERE house_id = ?`)
      .bind(houseId)
      .all<CharacterRow>()
    return (result.results ?? []).map(mapCharacter)
  }

  async listByProvinceId(provinceId: string): Promise<Character[]> {
    const result = await this.db
      .prepare(`SELECT ${CHARACTER_COLUMNS} FROM characters WHERE province_id = ?`)
      .bind(provinceId)
      .all<CharacterRow>()
    return (result.results ?? []).map(mapCharacter)
  }

  async assignHouse(characterId: string, houseId: string, updatedAt: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE characters
         SET house_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(houseId, updatedAt, characterId)
      .run()
  }

  async updateProvince(characterId: string, provinceId: string, updatedAt: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE characters
         SET province_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(provinceId, updatedAt, characterId)
      .run()
  }

  async clearDefendingInProvince(
    provinceId: string,
    exceptCharacterId: string | null,
    updatedAt: number,
  ): Promise<void> {
    if (exceptCharacterId) {
      await this.db
        .prepare(
          `UPDATE characters
           SET defending = 0, updated_at = ?
           WHERE province_id = ? AND id != ? AND defending != 0`,
        )
        .bind(updatedAt, provinceId, exceptCharacterId)
        .run()
      return
    }
    await this.db
      .prepare(
        `UPDATE characters
         SET defending = 0, updated_at = ?
         WHERE province_id = ? AND defending != 0`,
      )
      .bind(updatedAt, provinceId)
      .run()
  }

  async updateResources(
    characterId: string,
    patch: {
      money?: number
      rice?: number
      troops?: number
      training?: number
      defending?: number
      merit?: number
      classPoints?: number
      rank?: number
      buyu?: number
      chiryaku?: number
      toso?: number
      tokubo?: number
      buyuEx?: number
      chiryakuEx?: number
      tosoEx?: number
      tokuboEx?: number
      updatedAt: number
    },
  ): Promise<void> {
    const current = await this.findById(characterId)
    if (!current) return

    await this.db
      .prepare(
        `UPDATE characters SET
           money = ?, rice = ?, troops = ?, training = ?, defending = ?,
           merit = ?, class_points = ?, rank = ?,
           buyu = ?, chiryaku = ?, toso = ?, tokubo = ?,
           buyu_ex = ?, chiryaku_ex = ?, toso_ex = ?, tokubo_ex = ?,
           updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        patch.money ?? current.money,
        patch.rice ?? current.rice,
        patch.troops ?? current.troops,
        patch.training ?? current.training,
        patch.defending ?? current.defending,
        patch.merit ?? current.merit,
        patch.classPoints ?? current.classPoints,
        patch.rank ?? current.rank,
        patch.buyu ?? current.buyu,
        patch.chiryaku ?? current.chiryaku,
        patch.toso ?? current.toso,
        patch.tokubo ?? current.tokubo,
        patch.buyuEx ?? current.buyuEx,
        patch.chiryakuEx ?? current.chiryakuEx,
        patch.tosoEx ?? current.tosoEx,
        patch.tokuboEx ?? current.tokuboEx,
        patch.updatedAt,
        characterId,
      )
      .run()
  }
}
