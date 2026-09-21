/**
 * N4: 簡易戦闘（NET battle.cgi 由来の攻防式・最大50ラウンド）。
 */

export type BattleCombatant = {
  troops: number
  buyu: number
  training: number
  /** 攻撃補正（装備など。当面 0） */
  attAdd?: number
  /** 防御補正（装備など。当面 0） */
  defAdd?: number
}

export type BattleResult = {
  winner: 'attacker' | 'defender'
  attackerTroops: number
  defenderTroops: number
  rounds: number
}

const BATTLE_MAX_ROUNDS = 50

/** NET: katt = int((kstr + katt_add - eatt_def - int(egat/2.5))/8) */
export function calcAttackPower(
  str: number,
  trainingOfOpponent: number,
  attAdd = 0,
  enemyDefAdd = 0,
): number {
  return Math.max(
    0,
    Math.floor((str + attAdd - enemyDefAdd - Math.floor(trainingOfOpponent / 2.5)) / 8),
  )
}

/** rng: 0..1 → 整数 0..max（両端含む） */
function randInclusive(max: number, rng: () => number): number {
  if (max <= 0) return 0
  const r = Math.min(1, Math.max(0, rng()))
  return Math.floor(r * (max + 1))
}

/**
 * 1対1の戦闘。rng は 0..1 を返す（テストで固定可能）。
 */
export function resolveBattle(
  attacker: BattleCombatant,
  defender: BattleCombatant,
  rng: () => number = Math.random,
): BattleResult {
  let ksol = Math.max(0, Math.floor(attacker.troops))
  let esol = Math.max(0, Math.floor(defender.troops))

  if (esol <= 0) {
    return { winner: 'attacker', attackerTroops: ksol, defenderTroops: 0, rounds: 0 }
  }
  if (ksol <= 0) {
    return { winner: 'defender', attackerTroops: 0, defenderTroops: esol, rounds: 0 }
  }

  const katt = calcAttackPower(
    attacker.buyu,
    defender.training,
    attacker.attAdd ?? 0,
    defender.defAdd ?? 0,
  )
  const eatt = calcAttackPower(
    defender.buyu,
    attacker.training,
    defender.attAdd ?? 0,
    attacker.defAdd ?? 0,
  )

  let rounds = 0
  for (; rounds < BATTLE_MAX_ROUNDS; rounds += 1) {
    const kdmg = Math.max(1, randInclusive(katt, rng))
    esol -= kdmg
    if (esol <= 0) {
      return {
        winner: 'attacker',
        attackerTroops: ksol,
        defenderTroops: 0,
        rounds: rounds + 1,
      }
    }

    const edmg = Math.max(1, randInclusive(eatt, rng))
    ksol -= edmg
    if (ksol <= 0) {
      return {
        winner: 'defender',
        attackerTroops: 0,
        defenderTroops: esol,
        rounds: rounds + 1,
      }
    }
  }

  // ラウンド上限: 兵が残っていれば防衛側の勝ち扱い
  return {
    winner: 'defender',
    attackerTroops: ksol,
    defenderTroops: esol,
    rounds,
  }
}

/** 城壁防衛（守備武将がいないとき） */
export function wallDefender(defense: number): BattleCombatant {
  return {
    troops: Math.max(0, Math.floor(defense)),
    buyu: 30,
    training: 60,
  }
}
