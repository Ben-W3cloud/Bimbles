// ── WebSocket Game Loop ──
// Single source of truth for all real-time game logic

import type { ServerWebSocket } from 'bun'
import type { ClientMessage, ServerMessage, RoomState } from './types.js'
import * as Room from './room.js'

// ── Types ──
export interface WSData {
  token: string
  roomCode: string
  nickname: string
}

// ── Socket Management ──
export const roomSockets = new Map<string, Set<ServerWebSocket<WSData>>>()

function broadcast(code: string, msg: ServerMessage, excludeToken?: string) {
  const sockets = roomSockets.get(code)
  if (!sockets) return
  const payload = JSON.stringify(msg)
  for (const ws of sockets) {
    if (excludeToken && ws.data.token === excludeToken) continue
    try { ws.send(payload) } catch {}
  }
}

function sendTo(code: string, token: string, msg: ServerMessage) {
  const sockets = roomSockets.get(code)
  if (!sockets) return
  const payload = JSON.stringify(msg)
  for (const ws of sockets) {
    if (ws.data.token === token) {
      try { ws.send(payload) } catch {}
      return
    }
  }
}

// ── State Builders ──
export function buildClientState(room: RoomState, token: string) {
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

// ── Game Loop ──
export function runQuestionCycle(code: string) {
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
    questionType: q.type,
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

// ── Connection Management ──
export function handleDisconnect(code: string, token: string) {
  if (!code || !token) return
  Room.disconnectPlayer(code, token)

  const room = Room.getRoom(code)
  if (!room) return

  const anyConnected = [...room.players.values()].some(p => p.connected)

  // Clean up empty rooms after 60 s (all players disconnected from lobby)
  if (!anyConnected) {
    setTimeout(() => {
      const r = Room.getRoom(code)
      if (r && ![...r.players.values()].some(p => p.connected)) {
        Room.deleteRoom(code)
      }
    }, 60_000)
  }

  // Clean up orphaned in-progress rooms after 5 minutes with no connections
  if (!anyConnected && room.phase !== 'lobby') {
    setTimeout(() => {
      const r = Room.getRoom(code)
      if (r && ![...r.players.values()].some(p => p.connected)) {
        Room.deleteRoom(code)
        console.log(`🧹 Cleaned up orphaned room ${code} after 5 min with no connections`)
      }
    }, 5 * 60_000)
  }
}

// ── Message Handlers ──
export function handleMessage(ws: ServerWebSocket<WSData>, raw: string) {
  let msg: ClientMessage
  try { msg = JSON.parse(raw) } catch { return }
  const d = ws.data

  switch (msg.type) {
    // ── Connection ──
    case 'join': {
      const room = Room.getRoom(d.roomCode)
      if (!room) {
        ws.send(JSON.stringify({ type: 'join:rejected', reason: 'Room not found' }))
        ws.close()
        return
      }

      const token = msg.token || crypto.randomUUID()
      const result = Room.addPlayer(d.roomCode, token, msg.nickname, msg.role === 'spectator')
      if (!result.ok) {
        ws.send(JSON.stringify({ type: 'join:rejected', reason: result.reason }))
        ws.close()
        return
      }

      // Stamp token + nickname onto ws.data
      d.token = token
      d.nickname = msg.nickname

      // Register socket
      if (!roomSockets.has(d.roomCode)) roomSockets.set(d.roomCode, new Set())
      roomSockets.get(d.roomCode)!.add(ws)

      ws.send(JSON.stringify({ type: 'join:accepted', token }))
      ws.send(JSON.stringify({ type: 'room:state', state: buildClientState(room, token) }))

      if (room.phase === 'lobby') {
        const pc = [...room.players.values()].filter(p => !p.isSpectator).length
        // Broadcast updated state to all existing players so their player list refreshes
        for (const sock of (roomSockets.get(d.roomCode) || [])) {
          if (sock === ws) continue // new joiner already got their state above
          try {
            sock.send(JSON.stringify({ type: 'room:state', state: buildClientState(room, sock.data.token) }))
          } catch {}
        }
        broadcast(d.roomCode, { type: 'room:player-joined', nickname: msg.nickname, count: pc })
      }
      break
    }

    // ── Gameplay ──
    case 'answer': {
      const r = Room.processAnswer(d.roomCode, d.token, msg.answer, msg.timestamp)
      if (r.locked) ws.send(JSON.stringify({ type: 'game:answer-locked' }))
      break
    }

    case 'reaction': {
      broadcast(d.roomCode, { type: 'spectator:reaction', emoji: msg.emoji, nickname: d.nickname })
      break
    }

    // ── Host Controls ──
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

    case 'player:assign-team': {
      // Allow any player to self-assign to a team
      const room = Room.getRoom(d.roomCode)
      if (!room || room.phase !== 'lobby') return
      if (!room.config.teams || room.config.teams.length === 0) return
      
      const team = msg.team
      if (!room.config.teams.includes(team)) return
      
      const player = room.players.get(d.token)
      if (!player) return
      
      // Assign player to the requested team
      player.team = team
      const assignments = Room.getTeamAssignments(d.roomCode)
      broadcast(d.roomCode, { type: 'room:teams-updated', players: assignments })
      break
    }

    case 'host:shuffle-teams': {
      const room = Room.getRoom(d.roomCode)
      if (!room || room.hostToken !== d.token) return
      Room.shuffleTeams(d.roomCode)
      const assignments = Room.getTeamAssignments(d.roomCode)
      broadcast(d.roomCode, { type: 'room:teams-updated', players: assignments })
      break
    }

    case 'host:assign-teams': {
      const room = Room.getRoom(d.roomCode)
      if (!room || room.hostToken !== d.token) return
      Room.assignTeams(d.roomCode, msg.assignments)
      const assignments = Room.getTeamAssignments(d.roomCode)
      broadcast(d.roomCode, { type: 'room:teams-updated', players: assignments })
      break
    }
  }
}
