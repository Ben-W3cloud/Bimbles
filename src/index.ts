// ── Bimbles Server — Bun + Hono ──
// Uses Bun.serve() with native WebSocket. No Node adapters.

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import apiRoutes from './api.js'
import type { ServerWebSocket } from 'bun'
import * as Room from './room.js'
import { incrementWsConnection, decrementWsConnection } from './rateLimiter.js'
import { activeRooms, activeConnections, registry } from './metrics.js'
import { WSData, roomSockets, handleMessage, handleDisconnect } from './ws.js'

// ── HTTP app ──
const app = new Hono()
app.use('/*', cors())
app.route('/', apiRoutes)

// Serve built frontend in production
app.use('/*', serveStatic({ root: './client/dist' }))
app.get('*', serveStatic({ root: './client/dist', path: 'index.html' }))

// Update active rooms gauge periodically
setInterval(() => {
  activeRooms.set(Room.getAllRooms().size)
}, 5000)

// Add metrics endpoint
app.get('/metrics', async (c) => {
  c.header('Content-Type', 'text/plain')
  const metrics = await registry.getMetrics()
  return new Response(metrics)
})

// ── Bun.serve ──
const port = Number(process.env.PORT) || 3000

Bun.serve<WSData>({
  port,
  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket upgrade on /ws
    if (url.pathname === '/ws') {
      const roomCode = url.searchParams.get('room') || ''
      const upgraded = server.upgrade(req, {
        data: { roomCode, token: '', nickname: '' },
      })
      if (upgraded) return undefined
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    // HTTP → Hono
    return app.fetch(req)
  },

  websocket: {
    perMessageDeflate: true,
    open(ws: ServerWebSocket<WSData>) {
      const ip = ws.remoteAddress
      const count = incrementWsConnection(ip)
      
      if (count > 10) {
        ws.close(1008, 'Too many connections from this IP')
        decrementWsConnection(ip)
        return
      }
      
      activeConnections.inc()
    },

    message(ws: ServerWebSocket<WSData>, raw: string | ArrayBuffer) {
      const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
      
      // Handle ping/pong for latency measurement
      if (text === 'ping') {
        ws.send('pong')
        return
      }
      
      handleMessage(ws, text)
    },

    close(ws: ServerWebSocket<WSData>) {
      const d = ws.data
      if (!d.roomCode || !d.token) {
        decrementWsConnection(ws.remoteAddress)
        activeConnections.dec()
        return
      }

      // Remove from room sockets map
      roomSockets.get(d.roomCode)?.delete(ws)
      
      // Handle disconnect + cleanup
      handleDisconnect(d.roomCode, d.token)
      
      decrementWsConnection(ws.remoteAddress)
      activeConnections.dec()
    },
  },
})

console.log(`🫧 Bimbles running on http://localhost:${port}`)
