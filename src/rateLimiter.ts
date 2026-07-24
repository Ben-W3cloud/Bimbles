// Rate limiting for Bimbles
// Simple token-bucket per key (IP) — doesn't use the `limiter` package incorrectly

interface BucketEntry {
  tokens: number
  refillTime: number
}

// Room creation: 5 per minute per IP
const roomBuckets = new Map<string, BucketEntry>()
const ROOM_MAX = 5
const ROOM_INTERVAL = 60_000 // 1 minute

// AI generation: 20 per minute per IP
const aiBuckets = new Map<string, BucketEntry>()
const AI_MAX = 20
const AI_INTERVAL = 60_000 // 1 minute

function checkBucket(buckets: Map<string, BucketEntry>, key: string, max: number, interval: number): boolean {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || now - entry.refillTime >= interval) {
    // New or expired bucket — reset
    buckets.set(key, { tokens: max - 1, refillTime: now })
    return true
  }
  if (entry.tokens > 0) {
    entry.tokens--
    return true
  }
  return false
}

export function checkAiRateLimit(ip: string): boolean {
  return checkBucket(aiBuckets, ip, AI_MAX, AI_INTERVAL)
}

export function checkRoomRateLimit(ip: string): boolean {
  return checkBucket(roomBuckets, ip, ROOM_MAX, ROOM_INTERVAL)
}

// WebSocket connections: track per IP
const wsConnections = new Map<string, number>()

export function incrementWsConnection(ip: string): number {
  const count = (wsConnections.get(ip) || 0) + 1
  wsConnections.set(ip, count)
  return count
}

export function decrementWsConnection(ip: string): void {
  const count = (wsConnections.get(ip) || 0) - 1
  if (count <= 0) {
    wsConnections.delete(ip)
  } else {
    wsConnections.set(ip, count)
  }
}

export function getWsConnectionCount(ip: string): number {
  return wsConnections.get(ip) || 0
}
