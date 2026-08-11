import type { ProvinceMaster } from '../../config/provinces'

/** 8方向隣接。完全な地理再現よりゲーム性を優先。 */
export function areAdjacent(from: Pick<ProvinceMaster, 'x' | 'y'>, to: Pick<ProvinceMaster, 'x' | 'y'>): boolean {
  const dx = Math.abs(from.x - to.x)
  const dy = Math.abs(from.y - to.y)
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)
}

export function adjacentCount(province: ProvinceMaster, all: ProvinceMaster[]): number {
  return all.filter((other) => other.id !== province.id && areAdjacent(province, other)).length
}

export function listAdjacentIds(province: ProvinceMaster, all: ProvinceMaster[]): string[] {
  return all.filter((other) => other.id !== province.id && areAdjacent(province, other)).map((p) => p.id)
}
