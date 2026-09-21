import {
  RECRUIT_OFFICER_LOYALTY_SOFT,
  RECRUIT_OFFICER_MERIT_SOFT,
  RECRUIT_OFFICER_RANDOM_CHANCE,
} from '../config/net'

/** 登用成功判定（乱数注入可） */
export function recruitOfficerSucceeds(input: {
  merit: number
  loyalty: number
  random01?: number
}): boolean {
  if (input.merit < RECRUIT_OFFICER_MERIT_SOFT) return true
  if (input.loyalty < RECRUIT_OFFICER_LOYALTY_SOFT) return true
  const roll = input.random01 ?? Math.random()
  return roll < RECRUIT_OFFICER_RANDOM_CHANCE
}
