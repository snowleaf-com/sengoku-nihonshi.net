import type { EffectTarget } from '../config/commands'
import {
  IconBrain,
  IconCoins,
  IconHeart,
  IconShield,
  IconSprout,
  IconStore,
  IconSword,
  IconUsers,
  IconUsersRound,
  IconWheat,
} from './icons'

type StatIconProps = {
  target: EffectTarget
  class?: string
  size?: number
}

/** コマンド効果・ステ表示で共通のアイコン */
export function StatIcon({ target, class: className = 'stat-icon', size = 14 }: StatIconProps) {
  switch (target) {
    case 'buyu':
      return <IconSword class={className} size={size} />
    case 'chiryaku':
      return <IconBrain class={className} size={size} />
    case 'toso':
      return <IconUsers class={className} size={size} />
    case 'tokubo':
      return <IconHeart class={className} size={size} />
    case 'agriculture':
      return <IconSprout class={className} size={size} />
    case 'commerce':
      return <IconStore class={className} size={size} />
    case 'defense':
      return <IconShield class={className} size={size} />
    case 'tech':
      return <IconBrain class={className} size={size} />
    case 'loyalty':
      return <IconHeart class={className} size={size} />
    case 'merit':
      return <IconUsers class={className} size={size} />
    case 'money':
      return <IconCoins class={className} size={size} />
    case 'rice':
      return <IconWheat class={className} size={size} />
    case 'population':
      return <IconUsersRound class={className} size={size} />
    case 'troops':
      return <IconUsers class={className} size={size} />
    default:
      return null
  }
}
