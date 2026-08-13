/**
 * Phase 2: コマンド定義。
 * UI は gains / costs をアイコン＋数値で表示する。
 */

export const COMMAND_QUEUE_MAX = 48
/** 能力+1 に必要な EX。コマンド1〜2回で届くくらい */
export const STAT_EX_PER_LEVEL = 100

export type EffectTarget =
  | 'buyu'
  | 'chiryaku'
  | 'toso'
  | 'tokubo'
  | 'agriculture'
  | 'commerce'
  | 'loyalty'
  | 'money'
  | 'rice'
  | 'troops'
  | 'population'

export type EffectMagnitude = 'up2' | 'up' | 'down' | 'down2'

export type CommandEffect = {
  target: EffectTarget
  magnitude: EffectMagnitude
  /** 実際に加減する量（能力は EX、都市は実値） */
  amount: number
}

export type GameCommand = {
  id: string
  label: string
  blurb: string
  category: 'domestic'
  effects: CommandEffect[]
}

const EFFECT_LABELS: Record<EffectTarget, string> = {
  buyu: '武勇',
  chiryaku: '知略',
  toso: '統率',
  tokubo: '徳望',
  agriculture: '農業',
  commerce: '商業',
  loyalty: '民忠',
  money: '金',
  rice: '米',
  troops: '兵',
  population: '農民',
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

/** 表示用の増減テキスト（例: +8 / -50 両 / +80 EX） */
export function formatEffectAmount(effect: CommandEffect): string {
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
    id: 'kaikon',
    label: '開墾',
    blurb: '田畑を広げる',
    category: 'domestic',
    effects: [
      { target: 'agriculture', magnitude: 'up2', amount: 8 },
      { target: 'chiryaku', magnitude: 'up', amount: 50 },
      { target: 'money', magnitude: 'down', amount: 50 },
    ],
  },
  {
    id: 'ichitate',
    label: '市立て',
    blurb: '市を立てて商いを盛んにする',
    category: 'domestic',
    effects: [
      { target: 'commerce', magnitude: 'up2', amount: 8 },
      { target: 'chiryaku', magnitude: 'up', amount: 50 },
      { target: 'money', magnitude: 'down', amount: 50 },
    ],
  },
  {
    id: 'keiko',
    label: '稽古',
    blurb: '武芸を磨く',
    category: 'domestic',
    effects: [
      { target: 'buyu', magnitude: 'up2', amount: 80 },
      { target: 'money', magnitude: 'down', amount: 50 },
    ],
  },
  {
    id: 'seimu',
    label: '政務',
    blurb: '政を練って知略を磨く',
    category: 'domestic',
    effects: [
      { target: 'chiryaku', magnitude: 'up2', amount: 80 },
      { target: 'money', magnitude: 'down', amount: 50 },
    ],
  },
  {
    id: 'komehodokoshi',
    label: '米施し',
    blurb: '米を施して民心を得る',
    category: 'domestic',
    effects: [
      { target: 'loyalty', magnitude: 'up2', amount: 5 },
      { target: 'tokubo', magnitude: 'up', amount: 50 },
      { target: 'rice', magnitude: 'down', amount: 50 },
    ],
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
