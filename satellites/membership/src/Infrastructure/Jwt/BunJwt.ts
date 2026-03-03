/**
 * BunJwt - Bun 原生 JWT 實作
 * 使用 Web Crypto API (HMAC-SHA256) 取代 hono/jwt
 */

const encoder = new TextEncoder()

/**
 * Base64url 編碼（無填充）
 */
function base64urlEncode(data: Uint8Array): string {
  const binary = String.fromCharCode(...data)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Base64url 解碼
 */
function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 取得 HMAC-SHA256 簽名金鑰
 */
async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/**
 * 簽發 JWT token
 * @param payload - JWT payload（支援 sub, exp, iat 等標準欄位）
 * @param secret - HMAC-SHA256 簽名密鑰
 * @returns 簽發的 JWT token 字串
 */
export async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }

  const headerStr = base64urlEncode(encoder.encode(JSON.stringify(header)))
  const payloadStr = base64urlEncode(encoder.encode(JSON.stringify(payload)))

  const signingInput = `${headerStr}.${payloadStr}`
  const key = await getSigningKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput))

  return `${signingInput}.${base64urlEncode(new Uint8Array(signature))}`
}

/**
 * 驗證並解析 JWT token
 * @param token - JWT token 字串
 * @param secret - HMAC-SHA256 簽名密鑰
 * @returns 解析後的 payload
 * @throws Error 當 token 無效、簽名不正確或已過期時
 */
export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT: expected 3 parts')
  }

  const [headerStr, payloadStr, signatureStr] = parts

  // 驗證簽名
  const signingInput = `${headerStr}.${payloadStr}`
  const key = await getSigningKey(secret)
  const signature = base64urlDecode(signatureStr)
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature as BufferSource,
    encoder.encode(signingInput) as BufferSource
  )

  if (!isValid) {
    throw new Error('Invalid JWT: signature verification failed')
  }

  // 解析 header 確認演算法
  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerStr)))
  if (header.alg !== 'HS256') {
    throw new Error(`Invalid JWT: unsupported algorithm ${header.alg}`)
  }

  // 解析 payload
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadStr))) as Record<
    string,
    unknown
  >

  // 驗證過期時間
  if (typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000)
    if (now >= payload.exp) {
      throw new Error('Invalid JWT: token has expired')
    }
  }

  return payload
}
