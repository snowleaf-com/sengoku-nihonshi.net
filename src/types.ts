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
  createdAt: number
  updatedAt: number
}
