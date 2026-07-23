// ── WebSocket handler ──

import type { ServerWebSocket } from 'bun'
import type { ClientMessage, ServerMessage, RoomState } from './types.js'
import * as Room from './room.js'

interface WSData {
  token: string
  roomCode: string
  nickname: string
}

const wsMap = new Map<string, Set<ServerWebSocket<WSData>>>()

function broadcast(code: string, msg: ServerMessage, exclude?: string) {
  const sockets = wsMap.get(code)
  if (!sockets) return
  const data = JSON.stringify(msg)
  for (const ws of sockets) {
    if (exclude && (ws.data as WSData)?.token === exclude) continue
    try { ws.send(data) } catch {}
  }
}

function sendTo(code: string, token: string, msg: ServerMessage) {
  const sockets = wsMap.get(code)
  if (!sockets) return
  const data = JSON.stringify(msg)
  for (const ws of sockets) {
    if ((ws.data as WSData)?.token === token) {
      try { ws.send(data) } catch {}
      return
    }
  }
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
    territory: room.territory ? { zones: room.territory.zones, round: room.territory.round } : undefined,
  }
}

function runQuestionCycle(code: string) {
  const room = Room.getRoom(code)
  if (!room) return

  const q = room.questions[room.currentQIndex]
  if (!q) {
    room.phase = 'end'
    sendEndGame(code)
    return
  }

  // Send question to all
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

  // Timer
  setTimeout(() => {
    const currentRoom = Room.getRoom(code)
    if (!currentRoom || currentRoom.phase !== 'active') return
    if (currentRoom.currentQIndex !== room.currentQIndex) return

    const reveal = Room.revealAnswers(code)
    if (!reveal) return

    currentRoom.phase = 'reveal'
    broadcast(code, { type: 'game:reveal', ...reveal })

    // Check BR eliminations
    if (currentRoom.mode === 'battle-royale') {
      for (const p of currentRoom.players.values()) {
        if (p.eliminated && p.isSpectator === false) {
          broadcast(code, { type: 'game:eliminated', nickname: p.nickname })
          p.isSpectator = true
        }
      }
    }

    // Leaderboard after 3s
    setTimeout(() => {
      const r = Room.getRoom(code)
      if (!r || r.currentQIndex !== room.currentQIndex) return

      const standings = Room.getStandings(r)
      r.phase = 'leaderboard'
      broadcast(code, { type: 'game:leaderboard', standings })

      // Territory update
      if (r.mode === 'territory' && r.territory) {
        broadcast(code, { type: 'game:territory-update', zones: r.territory.zones })
      }

      // Auto advance after 4s
      setTimeout(() => {
        const rr = Room.getRoom(code)
        if (!rr || rr.currentQIndex !== room.currentQIndex) return

        const { done } = Room.advanceQuestion(code)
        if (done) {
          sendEndGame(code)
        } else {
          // Countdown then next question
          broadcast(code, { type: 'game:countdown', seconds: 3 })
          let count = 3
          const interval = setInterval(() => {
            count--
            if (count <= 0) {
              clearInterval(interval)
              runQuestionCycle(code)
            } else {
              broadcast(code, { type: 'game:countdown', seconds: count })
            }
          }, 1000)
        }
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

export function handleWebSocket(ws: ServerWebSocket<WSData>) {
  ws.subscribe('ws')

  ws.message = (_ws, raw) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(raw as string)
    } catch {
      return
    }

    const data = ws.data

    switch (msg.type) {
      case 'join': {
        const room = Room.getRoom(data.roomCode)
        if (!room) {
          ws.send(JSON.stringify({ type: 'join:rejected', reason: 'Room not found' }))
          ws.close()
          return
        }

        const token = msg.token || crypto.randomUUID()
        const result = Room.addPlayer(data.roomCode, token, msg.nickname, msg.role === 'spectator')

        if (!result.ok) {
          ws.send(JSON.stringify({ type: 'join:rejected', reason: result.reason }))
          ws.close()
          return
        }

        // Update ws data with token
        data.token = token
        data.nickname = msg.nickname

        // Track socket
        if (!wsMap.has(data.roomCode)) wsMap.set(data.roomCode, new Set())
        wsMap.get(data.roomCode)!.add(ws)

        ws.send(JSON.stringify({ type: 'join:accepted', token }))

        const state = buildClientState(room, token)
        ws.send(JSON.stringify({ type: 'room:state', state }))

        if (room.phase === 'lobby') {
          const playerCount = [...room.players.values()].filter(p => !p.isSpectator).length
          broadcast(data.roomCode, {
            type: 'room:player-joined',
            nickname: msg.nickname,
            count: playerCount,
          })
        }
        break
      }

      case 'answer': {
        const result = Room.processAnswer(data.roomCode, data.token, msg.answer, msg.timestamp)
        if (result.locked) {
          ws.send(JSON.stringify({ type: 'game:answer-locked' }))
        }
        break
      }

      case 'reaction': {
        broadcast(data.roomCode, {
          type: 'spectator:reaction',
          emoji: msg.emoji,
          nickname: data.nickname,
        })
        break
      }

      case 'host:start': {
        const room = Room.getRoom(data.roomCode)
        if (!room || room.hostToken !== data.token) return

        Room.startGame(data.roomCode)
        broadcast(data.roomCode, { type: 'game:countdown', seconds: 3 })

        let count = 3
        const interval = setInterval(() => {
          count--
          if (count <= 0) {
            clearInterval(interval)
            runQuestionCycle(data.roomCode)
          } else {
            broadcast(data.roomCode, { type: 'game:countdown', seconds: count })
          }
        }, 1000)
        break
      }

      case 'host:end': {
        const room = Room.getRoom(data.roomCode)
        if (!room || room.hostToken !== data.token) return
        sendEndGame(data.roomCode)
        break
      }

      case 'host:play-again': {
        const room = Room.getRoom(data.roomCode)
        if (!room || room.hostToken !== data.token) return
        if (msg.reshuffle) Room.shuffleQuestions(data.roomCode)
        Room.resetRoom(data.roomCode)
        const state = buildClientState(room, data.token)
        broadcast(data.roomCode, { type: 'room:state', state })
        break
      }

      case 'host:change-mode': {
        const room = Room.getRoom(data.roomCode)
        if (!room || room.hostToken !== data.token) return
        Room.changeMode(data.roomCode, msg.mode)
        const state = buildClientState(room, data.token)
        broadcast(data.roomCode, { type: 'room:state', state })
        break
      }
    }
  }

  ws.close = () => {
    const data = ws.data
    if (data.roomCode && data.token) {
      Room.disconnectPlayer(data.roomCode, data.token)
      const sockets = wsMap.get(data.roomCode)
      if (sockets) sockets.delete(ws)

      // Check if room empty
      const room = Room.getRoom(data.roomCode)
      if (room) {
        const anyConnected = [...room.players.values()].some(p => p.connected)
        if (!anyConnected) {
          // Clean up after delay
          setTimeout(() => {
            const r = Room.getRoom(data.roomCode)
            if (r) {
              const any = [...r.players.values()].some(p => p.connected)
              if (!any) Room.deleteRoom(data.roomCode)
            }
          }, 60000)
        }
      }
    }
  }
}
