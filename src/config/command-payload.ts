/**
 * コマンド payload（移動先・売買量・徴兵人数など）。
 * character_commands.payload に JSON で保存する。
 */

export type MovePayload = {
  kind: 'move'
  provinceId: string
}

export type TradePayload = {
  kind: 'trade'
  /** 米を売る / 金を売る */
  side: 'sell_rice' | 'sell_gold'
  amount: number
  /** 予約時点の相場 */
  marketRate: number
}

export type RecruitPayload = {
  kind: 'recruit'
  amount: number
}

export type WarPayload = {
  kind: 'war'
  provinceId: string
}

export type CommandPayload = MovePayload | TradePayload | RecruitPayload | WarPayload

export function parseCommandPayload(raw: string | null | undefined): CommandPayload | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as CommandPayload
    if (data?.kind === 'move' && typeof data.provinceId === 'string') return data
    if (
      data?.kind === 'trade' &&
      (data.side === 'sell_rice' || data.side === 'sell_gold') &&
      typeof data.amount === 'number' &&
      typeof data.marketRate === 'number'
    ) {
      return data
    }
    if (data?.kind === 'recruit' && typeof data.amount === 'number') return data
    if (data?.kind === 'war' && typeof data.provinceId === 'string') return data
  } catch {
    return null
  }
  return null
}

export function serializeCommandPayload(payload: CommandPayload): string {
  return JSON.stringify(payload)
}

export function formatQueueLabel(
  commandId: string,
  payloadRaw: string | null,
  commandLabel: string,
  provinceNameById: (id: string) => string | null,
): string {
  const payload = parseCommandPayload(payloadRaw)
  if (payload?.kind === 'move') {
    const name = provinceNameById(payload.provinceId) ?? payload.provinceId
    return `${name}へ移動`
  }
  if (payload?.kind === 'trade') {
    if (payload.side === 'sell_rice') return `米${payload.amount}売`
    return `金${payload.amount}売`
  }
  if (payload?.kind === 'recruit') {
    return `徴兵${payload.amount}人`
  }
  if (payload?.kind === 'war') {
    const name = provinceNameById(payload.provinceId) ?? payload.provinceId
    return `${name}へ戦争`
  }
  return commandLabel || commandId
}
