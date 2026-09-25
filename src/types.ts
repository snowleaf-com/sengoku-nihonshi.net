export type AppBindings = CloudflareBindings

export type AppVariables = {
  user: User | null
  session: Session | null
}

export type AppEnv = {
  Bindings: AppBindings
  Variables: AppVariables
}

export type User = {
  id: string
  createdAt: number
  updatedAt: number
  lastLoginAt: number | null
}

export type Session = {
  id: string
  userId: string
  expiresAt: number
  createdAt: number
}

export type PasskeyRecord = {
  id: string
  userId: string
  webauthnUserId: string
  publicKey: Uint8Array
  counter: number
  deviceType: string
  backedUp: boolean
  transports: string[] | null
  createdAt: number
  lastUsedAt: number | null
}

export type ChallengeType = 'registration' | 'authentication'

export type ChallengeRecord = {
  id: string
  challenge: string
  type: ChallengeType
  userId: string | null
  webauthnUserId: string | null
  expiresAt: number
  createdAt: number
}

export type Character = {
  id: string
  userId: string
  name: string
  iconId: string
  archetypeId: string
  buyu: number
  chiryaku: number
  toso: number
  tokubo: number
  buyuEx: number
  chiryakuEx: number
  tosoEx: number
  tokuboEx: number
  houseId: string | null
  provinceId: string
  rank: number
  /** 貢献（1月・7月でリセット。NET の kcex） */
  merit: number
  /** 階級値（蓄積。NET の kclass） */
  classPoints: number
  money: number
  rice: number
  troops: number
  /** 訓練度 0〜100 */
  training: number
  /** 城の守備中なら 1 */
  defending: number
  /** 何もしない連続回数（60 で自動削除） */
  idleStreak: number
  /** 武将の国への忠誠（都市の民忠とは別） */
  loyalty: number
  createdAt: number
  updatedAt: number
}

export type House = {
  id: string
  name: string
  leaderCharacterId: string | null
  color: string
  /** 建国時の game_state.turn_index（戦争解禁の基準） */
  foundedTurn: number
  /** 国法（当主が編集。家メンバー向け） */
  lawText: string
  createdAt: number
  destroyedAt: number | null
}

export type HouseMessage = {
  id: string
  houseId: string
  characterId: string
  body: string
  createdAt: number
}

export type PersonalLetter = {
  id: string
  fromCharacterId: string
  toCharacterId: string
  body: string
  createdAt: number
  readAt: number | null
}

export type RankingRow = {
  characterId: string
  name: string
  houseName: string | null
  houseId: string | null
  provinceId: string
  provinceName: string
  troops: number
  roleLabel: string | null
  buyu: number
  chiryaku: number
  toso: number
  tokubo: number
  merit: number
  classPoints: number
  rank: number
}

export type Province = {
  id: string
  name: string
  houseId: string | null
  population: number
  populationMax: number
  agriculture: number
  agricultureMax: number
  commerce: number
  commerceMax: number
  /** 城壁（NET の zshiro） */
  defense: number
  defenseMax: number
  garrison: number
  loyalty: number
  tech: number
  marketRate: number
  createdAt: number
  updatedAt: number
}

export type HouseRole = {
  id: string
  houseId: string
  characterId: string
  role: string
  createdAt: number
}

export type GameState = {
  year: number
  month: number
  turnIndex: number
  nextTurnAt: number
  /** メンテ中なら 1（コマンド投稿を止める） */
  maintenance: number
  updatedAt: number
}

export type CharacterCommand = {
  id: string
  characterId: string
  commandId: string
  position: number
  /** JSON。移動先・売買量など。docs/net-spec.md */
  payload: string | null
  createdAt: number
}

/** 実行結果 / 全国の出来事 */
export type WorldEventChannel = 'result' | 'news'

/** 全国の知らせ。war / disaster / riot は今後本格化 */
export type WorldEventKind =
  | 'command'
  | 'income'
  | 'war'
  | 'disaster'
  | 'riot'
  | 'social'
  | 'system'

export type WorldEvent = {
  id: string
  year: number
  month: number
  channel: WorldEventChannel
  kind: WorldEventKind
  message: string
  provinceId: string | null
  fromProvinceId: string | null
  characterId: string | null
  houseId: string | null
  createdAt: number
}
