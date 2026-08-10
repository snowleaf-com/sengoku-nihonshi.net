/**
 * Passkey クライアント。
 *
 * ブラウザ API の対応関係:
 *   登録: startRegistration → navigator.credentials.create()
 *   ログイン: startAuthentication → navigator.credentials.get()
 *
 * HTMX は renderer から /htmx.min.js を読み込む。
 * Passkey 自体は fetch + JSON（ArrayBuffer / base64url 変換は SimpleWebAuthn が担当）。
 */

import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser'

type OptionsResponse<T> = {
  options: T
  challengeId: string
}

type VerifyResponse = {
  ok: true
  redirectTo: string
}

function showError(message: string) {
  const el = document.getElementById('passkey-error')
  if (!el) return
  el.hidden = false
  el.textContent = message
}

function clearError() {
  const el = document.getElementById('passkey-error')
  if (!el) return
  el.hidden = true
  el.textContent = ''
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })

  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `リクエストに失敗しました (${res.status})`)
  }
  return data
}

async function registerWithPasskey() {
  clearError()
  if (!browserSupportsWebAuthn()) {
    showError('このブラウザはパスキーに対応していません。')
    return
  }

  const { options, challengeId } = await postJson<
    OptionsResponse<PublicKeyCredentialCreationOptionsJSON>
  >('/auth/register/options')

  let response: RegistrationResponseJSON
  try {
    response = await startRegistration({ optionsJSON: options })
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      showError('パスキー作成がキャンセルされました。')
      return
    }
    throw error
  }

  const result = await postJson<VerifyResponse>('/auth/register/verify', {
    challengeId,
    response,
  })
  window.location.assign(result.redirectTo)
}

async function loginWithPasskey() {
  clearError()
  if (!browserSupportsWebAuthn()) {
    showError('このブラウザはパスキーに対応していません。')
    return
  }

  const { options, challengeId } = await postJson<
    OptionsResponse<PublicKeyCredentialRequestOptionsJSON>
  >('/auth/login/options')

  let response: AuthenticationResponseJSON
  try {
    response = await startAuthentication({ optionsJSON: options })
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      showError('パスキー認証がキャンセルされました。')
      return
    }
    throw error
  }

  const result = await postJson<VerifyResponse>('/auth/login/verify', {
    challengeId,
    response,
  })
  window.location.assign(result.redirectTo)
}

function bindButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-passkey-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true
      try {
        const action = button.dataset.passkeyAction
        if (action === 'register') {
          await registerWithPasskey()
        } else if (action === 'login') {
          await loginWithPasskey()
        }
      } catch (error) {
        console.error(error)
        showError(error instanceof Error ? error.message : '予期しないエラーが発生しました')
      } finally {
        button.disabled = false
      }
    })
  })
}

bindButtons()
