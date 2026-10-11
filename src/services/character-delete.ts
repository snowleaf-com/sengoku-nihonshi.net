import { nowSeconds } from '../lib/id'
import { CharacterCommandRepository } from '../repositories/character-commands'
import { CharacterRepository } from '../repositories/characters'
import { CommandPresetRepository } from '../repositories/command-presets'
import { HouseRoleRepository } from '../repositories/house-roles'
import { HouseRepository } from '../repositories/houses'
import { UnitRepository } from '../repositories/units'
import { destroyHouse } from './house-destroy'

/**
 * 武将削除。当主なら家を滅ぼし領土を解放、他メンバーは浪人化。
 */
export async function deleteCharacterWithCleanup(
  db: D1Database,
  characterId: string,
): Promise<void> {
  const characters = new CharacterRepository(db)
  const character = await characters.findById(characterId)
  if (!character) return

  const now = nowSeconds()
  const units = new UnitRepository(db)
  const roles = new HouseRoleRepository(db)
  const commands = new CharacterCommandRepository(db)
  const presets = new CommandPresetRepository(db)

  const unit = await units.findByMember(characterId)
  if (unit) {
    if (unit.leaderCharacterId === characterId) {
      await units.delete(unit.id)
    } else {
      await units.removeMember(characterId)
    }
  }

  const queue = await commands.listByCharacter(characterId)
  if (queue.length > 0) {
    await commands.deleteMany(queue.map((q) => q.id))
  }
  await presets.deleteByCharacterId(characterId)

  if (character.houseId) {
    const houses = new HouseRepository(db)
    const house = await houses.findById(character.houseId)
    if (house && !house.destroyedAt && house.leaderCharacterId === characterId) {
      await destroyHouse(db, house.id, { now })
    } else {
      await roles.deleteByCharacterId(characterId)
    }
  }

  await characters.delete(characterId)
}
