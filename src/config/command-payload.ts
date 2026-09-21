/**
 * コマンド payload（移動先・売買量など）。
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

export type CommandPayload = MovePayload | TradePayload

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
  return commandLabel || commandId
}
