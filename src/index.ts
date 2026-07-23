// ── Bimbles Server — Bun + Hono ──
// Uses Bun.serve() with native WebSocket. No Node adapters.

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import apiRoutes from './api.js'
import type { ServerWebSocket } from 'bun'
import type { ClientMessage, ServerMessage, RoomState } from './types.js'
import * as Room from './room.js'

// ── HTTP app ──
const app = new Hono()
app.use('/*', cors())
app.route('/', apiRoutes)

// Serve built frontend in production
app.use('/*', serveStatic({ root: './client/dist' }))
app.get('*', serveStatic({ root: './client/dist', path: 'index.html' }))

// ── WebSocket state ──
interface WSData {
  roomCode: string
  token: string
  nickname: string
}

// roomCode -> Set of connected sockets
const roomSockets = new Map<string, Set<ServerWebSocket<WSData>>>()

function broadcast(code: string, msg: ServerMessage, excludeToken?: string) {
  const sockets = roomSockets.get(code)
  if (!sockets) return
  const payload = JSON.stringify(msg)
  for (const ws of sockets) {
    if (excludeToken && ws.data.token === excludeToken) continue
    try { ws.send(payload) } catch {}
  }
}

function sendTo(ws: ServerWebSocket<WSData>, msg: ServerMessage) {
  try { ws.send(JSON.stringify(msg)) } catch {}
}

function buildClientState(room: RoomState, token: string) {
  const players = [...room.players.values()].map(p => ({
    nickname: p.nickname,
    isSpectator: p.isSpectator,
    eliminated: p.eliminated,
    team: p.team,
    connected: p.connected,
  }))
  return {
    code: room.code,
    phase: room.phase,
    mode: room.mode,
    config: room.config,
    players,
    playerCount: players.filter(p => !p.isSpectator && !p.eliminated).length,
    spectatorCount: players.filter(p => p.isSpectator).length,
    isHost: token === room.hostToken,
    yourToken: token,
    yourNickname: room.players.get(token)?.nickname || '',
    currentQIndex: room.currentQIndex,
    totalQuestions: room.questions.length,
    territory: room.territory
      ? { zones: room.territory.zones, round: room.territory.round }
      : undefined,
  }
}

// ── Question cycle ──
function runQuestionCycle(code: string) {
  const room = Room.getRoom(code)
  if (!room) return

  const q = room.questions[room.currentQIndex]
  if (!q) {
    room.phase = 'end'
    return sendEndGame(code)
  }

  broadcast(code, {
    type: 'game:question',
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
    timeLimit: room.config.timePerQuestion,
    questionNumber: room.currentQIndex + 1,
    total: room.questions.length,
    pairs: q.pairs,
    order: q.order,
  })

  room.phase = 'active'
  room.questionStartTime = Date.now()
  const qIndex = room.currentQIndex

  // Time up → reveal
  setTimeout(() => {
    const r = Room.getRoom(code)
    if (!r || r.phase !== 'active' || r.currentQIndex !== qIndex) return

    const reveal = Room.revealAnswers(code)
    if (!reveal) return
    r.phase = 'reveal'
    broadcast(code, { type: 'game:reveal', ...reveal })

    // Battle Royale eliminations
    if (r.mode === 'battle-royale') {
      for (const p of r.players.values()) {
        if (p.eliminated && !p.isSpectator) {
          broadcast(code, { type: 'game:eliminated', nickname: p.nickname })
          p.isSpectator = true
        }
      }
    }

    // Leaderboard after 3s
    setTimeout(() => {
      const r2 = Room.getRoom(code)
      if (!r2 || r2.currentQIndex !== qIndex) return

      const standings = Room.getStandings(r2)
      r2.phase = 'leaderboard'
      broadcast(code, { type: 'game:leaderboard', standings })

      if (r2.mode === 'territory' && r2.territory) {
        broadcast(code, { type: 'game:territory-update', zones: r2.territory.zones })
      }

      // Advance after 4s
      setTimeout(() => {
        const r3 = Room.getRoom(code)
        if (!r3 || r3.currentQIndex !== qIndex) return

        const { done } = Room.advanceQuestion(code)
        if (done) return sendEndGame(code)

        // Countdown to next question
        broadcast(code, { type: 'game:countdown', seconds: 3 })
        let c = 3
        const iv = setInterval(() => {
          c--
          if (c <= 0) {
            clearInterval(iv)
            runQuestionCycle(code)
          } else {
            broadcast(code, { type: 'game:countdown', seconds: c })
          }
        }, 1000)
      }, 4000)
    }, 3000)
  }, room.config.timePerQuestion * 1000)
}

function sendEndGame(code: string) {
  const room = Room.getRoom(code)
  if (!room) return
  room.phase = 'end'
  const standings = Room.getStandings(room)
  broadcast(code, {
    type: 'game:end',
    podium: standings.slice(0, 3),
    leaderboard: standings,
  })
}

// ── Handle WS message ──
function handleMessage(ws: ServerWebSocket<WSData>, raw: string) {
  let msg: ClientMessage
  try { msg = JSON.parse(raw) } catch { return }
  const d = ws.data

  switch (msg.type) {
    case 'join': {
      const room = Room.getRoom(d.roomCode)
      if (!room) {
        sendTo(ws, { type: 'join:rejected', reason: 'Room not found' })
        ws.close()
        return
      }

      const token = msg.token || crypto.randomUUID()
      const result = Room.addPlayer(d.roomCode, token, msg.nickname, msg.role === 'spectator')
      if (!result.ok) {
        sendTo(ws, { type: 'join:rejected', reason: result.reason })
        ws.close()
        return
      }

      // Stamp token + nickname onto ws.data
      d.token = token
      d.nickname = msg.nickname

      // Register socket
      if (!roomSockets.has(d.roomCode)) roomSockets.set(d.roomCode, new Set())
      roomSockets.get(d.roomCode)!.add(ws)

      sendTo(ws, { type: 'join:accepted', token })
      sendTo(ws, { type: 'room:state', state: buildClientState(room, token) })

      if (room.phase === 'lobby') {
        const pc = [...room.players.values()].filter(p => !p.isSpectator).length
        broadcast(d.roomCode, { type: 'room:player-joined', nickname: msg.nickname, count: pc })
      }
      break
    }

    case 'answer': {
      const r = Room.processAnswer(d.roomCode, d.token, msg.answer, msg.timestamp)
      if (r.locked) sendTo(ws, { type: 'game:answer-locked' })
      break
    }

    case 'reaction': {
      broadcast(d.roomCode, { type: 'spectator:reaction', emoji: msg.emoji, nickname: d.nickname })
      break
    }

    case 'host:start': {
      const room = Room.getRoom(d.roomCode)
      if (!room || room.hostToken !== d.token) return
      Room.startGame(d.roomCode)
      broadcast(d.roomCode, { type: 'game:countdown', seconds: 3 })
      let c = 3
      const iv = setInterval(() => {
        c--
        if (c <= 0) { clearInterval(iv); runQuestionCycle(d.roomCode) }
        else broadcast(d.roomCode, { type: 'game:countdown', seconds: c })
      }, 1000)
      break
    }

    case 'host:end': {
      const room = Room.getRoom(d.roomCode)
      if (!room || room.hostToken !== d.token) return
      sendEndGame(d.roomCode)
      break
    }

    case 'host:play-again': {
      const room = Room.getRoom(d.roomCode)
      if (!room || room.hostToken !== d.token) return
      if (msg.reshuffle) Room.shuffleQuestions(d.roomCode)
      Room.resetRoom(d.roomCode)
      broadcast(d.roomCode, { type: 'room:state', state: buildClientState(room, d.token) })
      break
    }

    case 'host:change-mode': {
      const room = Room.getRoom(d.roomCode)
      if (!room || room.hostToken !== d.token) return
      Room.changeMode(d.roomCode, msg.mode)
      broadcast(d.roomCode, { type: 'room:state', state: buildClientState(room, d.token) })
      break
    }
  }
}

// ── Bun.serve ──
const port = Number(process.env.PORT) || 3000

const server = Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket upgrade on /ws
    if (url.pathname === '/ws') {
      const roomCode = url.searchParams.get('room') || ''
      const upgraded = server.upgrade(req, {
        data: { roomCode, token: '', nickname: '' } satisfies WSData,
      })
      if (upgraded) return undefined
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    // HTTP → Hono
    return app.fetch(req)
  },

  websocket: {
    open(ws: ServerWebSocket<WSData>) {
      // Nothing to do until join message arrives
    },

    message(ws: ServerWebSocket<WSData>, raw: string | ArrayBuffer) {
      const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
      handleMessage(ws, text)
    },

    close(ws: ServerWebSocket<WSData>) {
      const d = ws.data
      if (!d.roomCode || !d.token) return

      Room.disconnectPlayer(d.roomCode, d.token)
      roomSockets.get(d.roomCode)?.delete(ws)

      // Clean up empty rooms after 60s
      const room = Room.getRoom(d.roomCode)
      if (room && ![...room.players.values()].some(p => p.connected)) {
        setTimeout(() => {
          const r = Room.getRoom(d.roomCode)
          if (r && ![...r.players.values()].some(p => p.connected)) {
            Room.deleteRoom(d.roomCode)
          }
        }, 60_000)
      }
    },
  },
})

console.log(`🫧 Bimbles running on http://localhost:${port}`)
