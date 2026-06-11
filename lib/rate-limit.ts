/**
 * Simple in-memory OTP rate limiter.
 * Limits each phone number to MAX_ATTEMPTS OTP requests per WINDOW_MS.
 * Uses a Map stored in module scope (survives across requests in a single
 * Node.js process; resets on cold start, which is fine for development and
 * lightweight production traffic).
 */

const MAX_ATTEMPTS = 3
const WINDOW_MS = 10 * 60 * 1000 // 10 minutes

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

export function checkRateLimit(phone: string): {
  allowed: boolean
  retryAfterSecs?: number
} {
  const now = Date.now()
  const entry = store.get(phone)

  if (!entry || now > entry.resetAt) {
    store.set(phone, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSecs }
  }

  entry.count++
  return { allowed: true }
}
