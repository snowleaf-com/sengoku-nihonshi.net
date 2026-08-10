/** 暗号学的に十分なランダム ID（hex）を生成する。 */
export function createId(bytes = 16): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return [...buffer].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}
