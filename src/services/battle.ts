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

export type BattleRoundLog = {
  round: number
  /** 攻撃側が与えたダメージ */
  attackerDamage: number
  defenderTroopsAfter: number
  /** 防衛側が与えたダメージ（攻撃側が先に壊滅した場合は null） */
  defenderDamage: number | null
  attackerTroopsAfter: number
}

export type BattleResult = {
  winner: 'attacker' | 'defender'
  attackerTroops: number
  defenderTroops: number
  rounds: number
  log: BattleRoundLog[]
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
  const log: BattleRoundLog[] = []

  if (esol <= 0) {
    return { winner: 'attacker', attackerTroops: ksol, defenderTroops: 0, rounds: 0, log }
  }
  if (ksol <= 0) {
    return { winner: 'defender', attackerTroops: 0, defenderTroops: esol, rounds: 0, log }
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
      esol = 0
      log.push({
        round: rounds + 1,
        attackerDamage: kdmg,
        defenderTroopsAfter: 0,
        defenderDamage: null,
        attackerTroopsAfter: ksol,
      })
      return {
        winner: 'attacker',
        attackerTroops: ksol,
        defenderTroops: 0,
        rounds: rounds + 1,
        log,
      }
    }

    const edmg = Math.max(1, randInclusive(eatt, rng))
    ksol -= edmg
    if (ksol <= 0) {
      ksol = 0
      log.push({
        round: rounds + 1,
        attackerDamage: kdmg,
        defenderTroopsAfter: esol,
        defenderDamage: edmg,
        attackerTroopsAfter: 0,
      })
      return {
        winner: 'defender',
        attackerTroops: 0,
        defenderTroops: esol,
        rounds: rounds + 1,
        log,
      }
    }

    log.push({
      round: rounds + 1,
      attackerDamage: kdmg,
      defenderTroopsAfter: esol,
      defenderDamage: edmg,
      attackerTroopsAfter: ksol,
    })
  }

  // ラウンド上限: 兵が残っていれば防衛側の勝ち扱い
  return {
    winner: 'defender',
    attackerTroops: ksol,
    defenderTroops: esol,
    rounds,
    log,
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

function formatRoundLine(row: BattleRoundLog): string {
  if (row.defenderDamage == null) {
    return `${row.round} 攻-${row.attackerDamage}→守${row.defenderTroopsAfter} 攻略`
  }
  if (row.attackerTroopsAfter <= 0) {
    return `${row.round} 攻-${row.attackerDamage}→守${row.defenderTroopsAfter} / 守-${row.defenderDamage}→攻0 撃退`
  }
  return `${row.round} 攻-${row.attackerDamage}→守${row.defenderTroopsAfter} / 守-${row.defenderDamage}→攻${row.attackerTroopsAfter}`
}

/**
 * 個人結果向けの戦況テキスト。長い場合は先頭・末尾を残して省略。
 */
export function formatBattleLog(
  result: Pick<BattleResult, 'rounds' | 'log' | 'winner'>,
  options?: { maxLines?: number },
): string {
  const maxLines = options?.maxLines ?? 20
  const { log, rounds, winner } = result
  if (log.length === 0) {
    return `【戦況】交戦なし（${winner === 'attacker' ? '守備兵なし' : '攻撃兵なし'}）`
  }

  const header = `【戦況】全${rounds}ラウンド`
  if (log.length <= maxLines) {
    return [header, ...log.map(formatRoundLine)].join('\n')
  }

  const head = Math.ceil(maxLines / 2)
  const tail = maxLines - head
  const omitted = log.length - head - tail
  return [
    header,
    ...log.slice(0, head).map(formatRoundLine),
    `…（中略 ${omitted} ラウンド）…`,
    ...log.slice(-tail).map(formatRoundLine),
  ].join('\n')
}
