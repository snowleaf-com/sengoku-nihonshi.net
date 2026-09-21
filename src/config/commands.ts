/**
 * N1: NET内政コマンド定義。
 * 実効値は execute 時に知略・徳望から算出する（docs/net-spec.md）。
 */

import {
  COMMAND_QUEUE_MAX,
  DOMESTIC_GOLD_COST,
  RICE_GIVE_COST,
  STAT_EX_PER_LEVEL,
} from './net'

export { COMMAND_QUEUE_MAX, STAT_EX_PER_LEVEL }

export type EffectTarget =
  | 'buyu'
  | 'chiryaku'
  | 'toso'
  | 'tokubo'
  | 'agriculture'
  | 'commerce'
  | 'defense'
  | 'tech'
  | 'loyalty'
  | 'money'
  | 'rice'
  | 'troops'
  | 'population'
  | 'merit'

export type EffectMagnitude = 'up2' | 'up' | 'down' | 'down2'

export type CommandEffect = {
  target: EffectTarget
  magnitude: EffectMagnitude
  /** 固定量。variable のときは UI の目安 */
  amount: number
  /** 実行時に式で決まる */
  variable?: boolean
}

export type GameCommand = {
  id: string
  label: string
  blurb: string
  category: 'domestic' | 'move' | 'trade' | 'social'
  /** 自国以外でも実行できる（NET: 移動・仕官） */
  foreignOk?: boolean
  /** UI で追加パラメータが必要 */
  needsPayload?: 'move' | 'trade'
  effects: CommandEffect[]
}

const EFFECT_LABELS: Record<EffectTarget, string> = {
  buyu: '武勇',
  chiryaku: '知略',
  toso: '統率',
  tokubo: '徳望',
  agriculture: '農業',
  commerce: '商業',
  defense: '城壁',
  tech: '技術',
  loyalty: '民忠',
  money: '金',
  rice: '米',
  troops: '兵',
  population: '農民',
  merit: '貢献',
}

const EX_TARGETS: EffectTarget[] = ['buyu', 'chiryaku', 'toso', 'tokubo']

export function effectLabel(target: EffectTarget): string {
  return EFFECT_LABELS[target]
}

export function isExEffect(target: EffectTarget): boolean {
  return EX_TARGETS.includes(target)
}

export function isCostEffect(magnitude: EffectMagnitude): boolean {
  return magnitude === 'down' || magnitude === 'down2'
}

/** 表示用の増減テキスト */
export function formatEffectAmount(effect: CommandEffect): string {
  if (effect.variable) {
    if (effect.target === 'loyalty') return '徳望依存'
    if (effect.target === 'money' || effect.target === 'rice') return '相場依存'
    return '知略依存'
  }
  const sign = isCostEffect(effect.magnitude) ? '-' : '+'
  if (isExEffect(effect.target)) {
    return `${sign}${effect.amount} EX`
  }
  if (effect.target === 'money') {
    return `${sign}${effect.amount} 両`
  }
  if (effect.target === 'rice') {
    return `${sign}${effect.amount} 石`
  }
  if (effect.target === 'merit') {
    return `${sign}${effect.amount}`
  }
  return `${sign}${effect.amount}`
}

/** 表示用: 上がるもの → 下がるもの（消費）の順 */
export function visibleEffects(command: GameCommand): CommandEffect[] {
  const gains = command.effects.filter((e) => e.magnitude === 'up2' || e.magnitude === 'up')
  const costs = command.effects.filter((e) => e.magnitude === 'down' || e.magnitude === 'down2')
  return [...gains, ...costs]
}

export const COMMANDS: GameCommand[] = [
  {
    id: 'nougyou',
    label: '農業',
    blurb: '田畑を拓く（知略で効果）',
    category: 'domestic',
    effects: [
      { target: 'agriculture', magnitude: 'up2', amount: 5, variable: true },
      { target: 'chiryaku', magnitude: 'up', amount: 1 },
      { target: 'merit', magnitude: 'up', amount: 30 },
      { target: 'money', magnitude: 'down', amount: DOMESTIC_GOLD_COST },
    ],
  },
  {
    id: 'syougyou',
    label: '商業',
    blurb: '市を盛んにする（知略で効果）',
    category: 'domestic',
    effects: [
      { target: 'commerce', magnitude: 'up2', amount: 5, variable: true },
      { target: 'chiryaku', magnitude: 'up', amount: 1 },
      { target: 'merit', magnitude: 'up', amount: 30 },
      { target: 'money', magnitude: 'down', amount: DOMESTIC_GOLD_COST },
    ],
  },
  {
    id: 'shiro',
    label: '城壁',
    blurb: '城壁を固める（知略で効果）',
    category: 'domestic',
    effects: [
      { target: 'defense', magnitude: 'up2', amount: 5, variable: true },
      { target: 'chiryaku', magnitude: 'up', amount: 1 },
      { target: 'merit', magnitude: 'up', amount: 30 },
      { target: 'money', magnitude: 'down', amount: DOMESTIC_GOLD_COST },
    ],
  },
  {
    id: 'gijutsu',
    label: '技術',
    blurb: '技術を進める（知略で効果）',
    category: 'domestic',
    effects: [
      { target: 'tech', magnitude: 'up2', amount: 5, variable: true },
      { target: 'chiryaku', magnitude: 'up', amount: 1 },
      { target: 'merit', magnitude: 'up', amount: 30 },
      { target: 'money', magnitude: 'down', amount: DOMESTIC_GOLD_COST },
    ],
  },
  {
    id: 'komehodokoshi',
    label: '米施し',
    blurb: '米を施して民心を得る',
    category: 'domestic',
    effects: [
      { target: 'loyalty', magnitude: 'up2', amount: 3, variable: true },
      { target: 'tokubo', magnitude: 'up', amount: 1 },
      { target: 'merit', magnitude: 'up', amount: 30 },
      { target: 'rice', magnitude: 'down', amount: RICE_GIVE_COST },
    ],
  },
  {
    id: 'idou',
    label: '移動',
    blurb: '隣接する国へ移る',
    category: 'move',
    foreignOk: true,
    needsPayload: 'move',
    effects: [
      { target: 'toso', magnitude: 'up', amount: 1 },
      { target: 'merit', magnitude: 'up', amount: 20 },
    ],
  },
  {
    id: 'beibai',
    label: '米売買',
    blurb: '相場で米と金を換える（自国のみ）',
    category: 'trade',
    needsPayload: 'trade',
    effects: [
      { target: 'chiryaku', magnitude: 'up', amount: 1 },
      { target: 'money', magnitude: 'up', amount: 0, variable: true },
      { target: 'rice', magnitude: 'up', amount: 0, variable: true },
    ],
  },
  {
    id: 'shikan',
    label: '仕官',
    blurb: '浪人が所在国の家へ仕える',
    category: 'social',
    foreignOk: true,
    effects: [],
  },
]

export type CommandId = (typeof COMMANDS)[number]['id']

const COMMAND_BY_ID = new Map(COMMANDS.map((c) => [c.id, c]))

export function isCommandId(value: string): value is CommandId {
  return COMMAND_BY_ID.has(value as CommandId)
}

export function getCommand(id: string): GameCommand | null {
  return COMMAND_BY_ID.get(id as CommandId) ?? null
}

/** 固定枠 0..MAX-1。空きは null（UIでは「無し」） */
export function buildCommandSlots<T extends { position: number }>(
  queue: T[],
): Array<T | null> {
  const slots: Array<T | null> = Array.from({ length: COMMAND_QUEUE_MAX }, () => null)
  for (const row of queue) {
    if (row.position >= 0 && row.position < COMMAND_QUEUE_MAX) {
      slots[row.position] = row
    }
  }
  return slots
}

export function parseSlotPositions(raw: string[]): number[] {
  const positions = new Set<number>()
  for (const value of raw) {
    const n = Number.parseInt(value, 10)
    if (!Number.isFinite(n)) continue
    if (n < 0 || n >= COMMAND_QUEUE_MAX) continue
    positions.add(n)
  }
  return [...positions].sort((a, b) => a - b)
}
