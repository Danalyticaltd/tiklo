const store = new Map()

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  return (forwarded ? forwarded.split(',')[0] : req.socket?.remoteAddress) ?? 'unknown'
}

/**
 * Sliding-window rate limiter (in-memory, per serverless instance).
 * @param {string} key   - unique key: IP, user ID, etc.
 * @param {number} limit - max requests allowed in the window
 * @param {number} windowMs - window size in milliseconds
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function check(key, limit, windowMs) {
  const now = Date.now()
  const cutoff = now - windowMs
  const timestamps = (store.get(key) ?? []).filter(t => t > cutoff)
  if (timestamps.length >= limit) {
    store.set(key, timestamps)
    return { allowed: false, remaining: 0 }
  }
  timestamps.push(now)
  store.set(key, timestamps)
  return { allowed: true, remaining: limit - timestamps.length }
}

export { getIp }
