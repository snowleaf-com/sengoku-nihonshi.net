/**
 * Passkey / WebAuthn サーバー側処理。
 *
 * 登録フロー（理解用）:
 *   1. generateRegistrationOptions() で challenge を発行
 *   2. ブラウザが navigator.credentials.create() で Authenticator とやり取り
 *   3. 公開鍵付きの attestation が返る
 *   4. verifyRegistrationResponse() で origin / challenge / 署名を検証
 *   5. publicKey だけを D1 に保存（秘密鍵は端末側のみ）
 *
 * ログインフロー:
 *   1. generateAuthenticationOptions() で challenge を発行（usernameless）
 *   2. ブラウザが navigator.credentials.get() で署名を取得
 *   3. verifyAuthenticationResponse() で公開鍵検証
 *   4. counter を更新し、セッションを発行
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import {
  CHALLENGE_TTL_SECONDS,
  getWebAuthnConfig,
  resolveExpectedOrigins,
} from '../../config/auth'
import { createId, nowSeconds } from '../../lib/id'
import { ChallengeRepository } from '../../repositories/challenges'
import { PasskeyRepository } from '../../repositories/passkeys'
import { UserRepository } from '../../repositories/users'
import type { AppBindings, PasskeyRecord, User } from '../../types'

export type RegistrationOptionsResult = {
  options: PublicKeyCredentialCreationOptionsJSON
  challengeId: string
}

export type AuthenticationOptionsResult = {
  options: PublicKeyCredentialRequestOptionsJSON
  challengeId: string
}

export async function beginRegistration(
  env: AppBindings,
): Promise<RegistrationOptionsResult> {
  const { rpName, rpID } = requireWebAuthnConfig(env)
  const now = nowSeconds()
  const challenges = new ChallengeRepository(env.DB)

  // 登録前に User は存在しない。仮 userId + webauthn userHandle を challenge に紐付ける。
  const userId = createId(16)
  const webauthnUserId = createId(16)
  const userName = `sengoku-${userId.slice(0, 8)}`

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: hexToUint8Array(webauthnUserId) as Uint8Array<ArrayBuffer>,
    userName,
    userDisplayName: '戦国日本史.net 武将',
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  })

  const challenge = await challenges.create({
    id: createId(16),
    challenge: options.challenge,
    type: 'registration',
    userId,
    webauthnUserId,
    expiresAt: now + CHALLENGE_TTL_SECONDS,
    createdAt: now,
  })

  return { options, challengeId: challenge.id }
}

export async function finishRegistration(
  env: AppBindings,
  input: {
    challengeId: string
    response: RegistrationResponseJSON
    requestOrigin?: string
  },
): Promise<{ user: User; passkey: PasskeyRecord }> {
  const { rpID } = requireWebAuthnConfig(env)
  const expectedOrigin = resolveExpectedOrigins(env, input.requestOrigin)
  const now = nowSeconds()
  const challenges = new ChallengeRepository(env.DB)
  const users = new UserRepository(env.DB)
  const passkeys = new PasskeyRepository(env.DB)

  const challenge = await challenges.findById(input.challengeId)
  if (!challenge || challenge.type !== 'registration' || challenge.expiresAt < now) {
    throw new AuthError('登録チャレンジが無効または期限切れです')
  }
  if (!challenge.userId || !challenge.webauthnUserId) {
    throw new AuthError('登録チャレンジが不正です')
  }

  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin,
    expectedRPID: rpID,
    requireUserVerification: false,
  })

  await challenges.delete(challenge.id)

  if (!verification.verified || !verification.registrationInfo) {
    throw new AuthError('パスキー登録の検証に失敗しました')
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo

  const user = await users.create(challenge.userId, now)
  const passkey = await passkeys.create({
    id: credential.id,
    userId: user.id,
    webauthnUserId: challenge.webauthnUserId,
    publicKey: credential.publicKey,
    counter: credential.counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: credential.transports ?? null,
    createdAt: now,
  })

  return { user, passkey }
}

export async function beginAuthentication(
  env: AppBindings,
): Promise<AuthenticationOptionsResult> {
  const { rpID } = requireWebAuthnConfig(env)
  const now = nowSeconds()
  const challenges = new ChallengeRepository(env.DB)

  // usernameless: allowCredentials を空にし、discoverable credential（パスキー）に任せる
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  })

  const challenge = await challenges.create({
    id: createId(16),
    challenge: options.challenge,
    type: 'authentication',
    userId: null,
    webauthnUserId: null,
    expiresAt: now + CHALLENGE_TTL_SECONDS,
    createdAt: now,
  })

  return { options, challengeId: challenge.id }
}

export async function finishAuthentication(
  env: AppBindings,
  input: {
    challengeId: string
    response: AuthenticationResponseJSON
    requestOrigin?: string
  },
): Promise<{ user: User; passkey: PasskeyRecord }> {
  const { rpID } = requireWebAuthnConfig(env)
  const expectedOrigin = resolveExpectedOrigins(env, input.requestOrigin)
  const now = nowSeconds()
  const challenges = new ChallengeRepository(env.DB)
  const passkeys = new PasskeyRepository(env.DB)
  const users = new UserRepository(env.DB)

  const challenge = await challenges.findById(input.challengeId)
  if (!challenge || challenge.type !== 'authentication' || challenge.expiresAt < now) {
    throw new AuthError('ログインチャレンジが無効または期限切れです')
  }

  const passkey = await passkeys.findByCredentialId(input.response.id)
  if (!passkey) {
    await challenges.delete(challenge.id)
    throw new AuthError('登録済みのパスキーが見つかりません')
  }

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin,
    expectedRPID: rpID,
    credential: {
      id: passkey.id,
      publicKey: passkey.publicKey as Uint8Array<ArrayBuffer>,
      counter: passkey.counter,
      transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
    },
    requireUserVerification: false,
  })

  await challenges.delete(challenge.id)

  if (!verification.verified) {
    throw new AuthError('パスキー認証の検証に失敗しました')
  }

  await passkeys.updateCounter(
    passkey.id,
    verification.authenticationInfo.newCounter,
    now,
  )

  const user = await users.findById(passkey.userId)
  if (!user) {
    throw new AuthError('ユーザーが見つかりません')
  }

  return { user, passkey }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

function requireWebAuthnConfig(env: AppBindings) {
  const config = getWebAuthnConfig(env)
  if (!config.rpID || !config.origin) {
    throw new AuthError('WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN が設定されていません')
  }
  return config
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex length')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
