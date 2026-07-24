// ── WebSocket game loop — single source of truth ──

import type { ServerWebSocket } from 'bun'
import type { ClientMessage, ServerMessage, RoomState } from './types.js'
import * as Room from './room.js'

export interface WSData {
  token: string
  roomCode: string
  nickname: string
}

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

export function handleDisconnect(code: string, token: string) {
  if (!code || !token) return
  Room.disconnectPlayer(code, token)

  // Clean up empty rooms after 60s
  const room = Room.getRoom(code)
  if (room && ![...room.players.values()].some(p => p.connected)) {
    setTimeout(() => {
      const r = Room.getRoom(code)
      if (r && ![...r.players.values()].some(p => p.connected)) {
        Room.deleteRoom(code)
      }
    }, 60_000)
  }
}

export function handleMessage(ws: ServerWebSocket<WSData>, raw: string) {
  let msg: ClientMessage
  try { msg = JSON.parse(raw) } catch { return }
  const d = ws.data

  switch (msg.type) {
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
        broadcast(d.roomCode, { type: 'room:player-joined', nickname: msg.nickname, count: pc })
      }
      break
    }

    case 'answer': {
      const r = Room.processAnswer(d.roomCode, d.token, msg.answer, msg.timestamp)
      if (r.locked) ws.send(JSON.stringify({ type: 'game:answer-locked' }))
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
