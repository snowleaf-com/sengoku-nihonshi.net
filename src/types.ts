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
  houseId: string | null
  provinceId: string
  rank: number
  merit: number
  money: number
  troops: number
  createdAt: number
  updatedAt: number
}

export type House = {
  id: string
  name: string
  leaderCharacterId: string | null
  color: string
  createdAt: number
  destroyedAt: number | null
}

export type Province = {
  id: string
  name: string
  houseId: string | null
  population: number
  agriculture: number
  commerce: number
  defense: number
  garrison: number
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
