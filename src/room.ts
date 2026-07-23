// ── In-memory room management ──

import type { RoomState, RoomConfig, Question, Player, Phase, GameMode, TerritoryZone, StandingEntry } from './types.js'
import { calculateScore, checkAnswer } from './scoring.js'

const rooms = new Map<string, RoomState>()

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let part1 = '', part2 = ''
  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * chars.length)]
    part2 += chars[Math.floor(Math.random() * chars.length)]
  }
  const code = `${part1}-${part2}`
  if (rooms.has(code)) return generateCode()
  return code
}

export function createRoom(hostToken: string, config: RoomConfig, questions: Question[]): RoomState {
  const code = generateCode()
  const room: RoomState = {
    code,
    hostToken,
    phase: 'lobby',
    mode: config.gameMode,
    config,
    players: new Map(),
    questions,
    currentQIndex: 0,
    currentRoundScores: new Map(),
  }

  if (config.gameMode === 'territory') {
    const zoneCount = config.playerCap <= 3 ? 6 : config.playerCap <= 6 ? 10 : 15
    const zones: TerritoryZone[] = Array.from({ length: zoneCount }, (_, i) => ({ id: i, owner: null }))
    room.territory = { zones, round: 0 }
  }

  rooms.set(code, room)
  return room
}

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code)
}

export function deleteRoom(code: string) {
  rooms.delete(code)
}

export function addPlayer(code: string, token: string, nickname: string, isSpectator: boolean): { ok: boolean; reason?: string } {
  const room = rooms.get(code)
  if (!room) return { ok: false, reason: 'Room not found' }

  // Check for reconnect
  const existing = room.players.get(token)
  if (existing) {
    if (existing.nickname !== nickname) return { ok: false, reason: 'Nickname mismatch' }
    existing.connected = true
    return { ok: true }
  }

  if (room.phase !== 'lobby') return { ok: false, reason: 'Game already in progress' }

  if (!isSpectator) {
    const playerCount = [...room.players.values()].filter(p => !p.isSpectator).length
    if (playerCount >= room.config.playerCap) return { ok: false, reason: 'Room is full' }
  }

  const nicknames = [...room.players.values()].map(p => p.nickname)
  if (nicknames.includes(nickname)) return { ok: false, reason: 'Nickname taken' }

  const player: Player = {
    token,
    nickname,
    score: 0,
    streak: 0,
    lives: room.mode === 'battle-royale' ? 2 : Infinity,
    connected: true,
    isSpectator,
    eliminated: false,
  }

  room.players.set(token, player)
  return { ok: true }
}

export function disconnectPlayer(code: string, token: string) {
  const room = rooms.get(code)
  if (!room) return
  const player = room.players.get(token)
  if (player) player.connected = false
}

export function getPlayerCount(room: RoomState): number {
  return [...room.players.values()].filter(p => !p.isSpectator && !p.eliminated).length
}

export function startGame(code: string) {
  const room = rooms.get(code)
  if (!room) return
  room.phase = 'countdown'
  room.currentQIndex = 0
  room.currentRoundScores = new Map()
  if (room.territory) {
    room.territory.round = 1
    room.territory.zones.forEach(z => z.owner = null)
  }
  // Reset scores
  for (const p of room.players.values()) {
    p.score = 0
    p.streak = 0
    p.eliminated = false
    if (room.mode === 'battle-royale') p.lives = 2
  }
}

export function advanceQuestion(code: string): { done: boolean } {
  const room = rooms.get(code)
  if (!room) return { done: true }

  room.currentQIndex++

  // Check if round complete for territory
  if (room.mode === 'territory' && room.territory) {
    const qPerRound = room.config.territoryQuestionsPerRound || 2
    const roundStart = (room.territory.round - 1) * qPerRound
    if (room.currentQIndex >= roundStart + qPerRound) {
      processTerritoryRound(room)
      if (room.territory.round >= (room.config.territoryRounds || 4)) {
        room.phase = 'end'
        return { done: true }
      }
      room.territory.round++
      room.currentRoundScores = new Map()
      room.phase = 'leaderboard'
      return { done: false }
    }
  }

  if (room.currentQIndex >= room.questions.length) {
    room.phase = 'end'
    return { done: true }
  }

  // BR: check if only 1 player left
  if (room.mode === 'battle-royale') {
    const alive = getPlayerCount(room)
    if (alive <= 1) {
      room.phase = 'end'
      return { done: true }
    }
  }

  room.phase = 'countdown'
  return { done: false }
}

function processTerritoryRound(room: RoomState) {
  if (!room.territory) return

  // Find player with highest round score
  let best: Player | null = null
  for (const p of room.players.values()) {
    if (p.isSpectator || p.eliminated) continue
    const rs = room.currentRoundScores.get(p.token) || 0
    if (!best || rs > (room.currentRoundScores.get(best.token) || 0)) {
      best = p
    }
  }

  // Claim a zone
  if (best) {
    const unclaimed = room.territory.zones.filter(z => z.owner === null)
    if (unclaimed.length > 0) {
      const zone = unclaimed[Math.floor(Math.random() * unclaimed.length)]
      zone.owner = best.nickname
    }
  }
}

export function processAnswer(
  code: string,
  token: string,
  answer: string | string[],
  timestamp: number
): { locked: boolean } {
  const room = rooms.get(code)
  if (!room || room.phase !== 'active') return { locked: false }

  const player = room.players.get(token)
  if (!player || player.currentAnswer !== undefined) return { locked: false }

  player.currentAnswer = answer
  player.answerTimestamp = timestamp
  return { locked: true }
}

export function revealAnswers(code: string): {
  correctAnswer: string | string[]
  explanation: string
  playerResults: Record<string, { correct: boolean; answerGiven: string | string[] | null }>
  stats: { correctPct: number; wrongPct: number }
} | null {
  const room = rooms.get(code)
  if (!room) return null

  const q = room.questions[room.currentQIndex]
  if (!q) return null

  const elapsed = room.questionStartTime ? (Date.now() - room.questionStartTime) / 1000 : 0
  const playerResults: Record<string, { correct: boolean; answerGiven: string | string[] | null }> = {}
  let correctCount = 0
  let totalPlayers = 0

  for (const [token, player] of room.players) {
    if (player.isSpectator || player.eliminated) continue
    totalPlayers++

    const given = player.currentAnswer ?? null
    const correct = given !== null && checkAnswer(given, q.correctAnswer, q.type, q.strictMatch)

    if (correct) {
      correctCount++
      const playerElapsed = player.answerTimestamp && room.questionStartTime
        ? (player.answerTimestamp - room.questionStartTime) / 1000
        : elapsed
      const points = calculateScore(playerElapsed || 0, room.config.timePerQuestion, true)
      player.score += points
      player.streak++

      if (room.mode === 'territory') {
        const rs = room.currentRoundScores.get(token) || 0
        room.currentRoundScores.set(token, rs + points)
      }
    } else {
      player.streak = 0

      if (room.mode === 'battle-royale' && player.lives !== Infinity) {
        player.lives--
        if (player.lives <= 0) {
          player.eliminated = true
        }
      }

      // Territory: lose a zone on wrong answer
      if (room.mode === 'territory' && room.territory) {
        const ownedZone = room.territory.zones.find(z => z.owner === player.nickname)
        if (ownedZone) ownedZone.owner = null
      }
    }

    playerResults[token] = { correct, answerGiven: given }
    player.currentAnswer = undefined
    player.answerTimestamp = undefined
  }

  return {
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    playerResults,
    stats: {
      correctPct: totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0,
      wrongPct: totalPlayers > 0 ? Math.round(((totalPlayers - correctCount) / totalPlayers) * 100) : 0,
    },
  }
}

export function getStandings(room: RoomState): StandingEntry[] {
  const prevStandings = [...room.players.values()]
    .filter(p => !p.isSpectator)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ token: p.token, rank: i + 1 }))

  const standings: StandingEntry[] = [...room.players.values()]
    .filter(p => !p.isSpectator)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => {
      const prev = prevStandings.find(s => s.token === p.token)
      return {
        rank: i + 1,
        nickname: p.nickname,
        points: p.score,
        streak: p.streak,
        rankChange: prev ? prev.rank - (i + 1) : 0,
        token: p.token,
        team: p.team,
        eliminated: p.eliminated,
      }
    })

  return standings
}

export function resetRoom(code: string) {
  const room = rooms.get(code)
  if (!room) return
  room.phase = 'lobby'
  room.currentQIndex = 0
  room.currentRoundScores = new Map()
  for (const p of room.players.values()) {
    p.score = 0
    p.streak = 0
    p.eliminated = false
    p.connected = true
    if (room.mode === 'battle-royale') p.lives = 2
  }
  if (room.territory) {
    room.territory.round = 0
    room.territory.zones.forEach(z => z.owner = null)
  }
}

export function changeMode(code: string, mode: GameMode) {
  const room = rooms.get(code)
  if (!room) return
  room.mode = mode
  room.config.gameMode = mode
  if (mode === 'battle-royale') {
    for (const p of room.players.values()) p.lives = 2
  }
  if (mode === 'territory' && !room.territory) {
    const zoneCount = room.config.playerCap <= 3 ? 6 : room.config.playerCap <= 6 ? 10 : 15
    room.territory = {
      zones: Array.from({ length: zoneCount }, (_, i) => ({ id: i, owner: null })),
      round: 0,
    }
  }
  resetRoom(code)
}

export function shuffleQuestions(code: string) {
  const room = rooms.get(code)
  if (!room) return
  for (let i = room.questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [room.questions[i], room.questions[j]] = [room.questions[j], room.questions[i]]
  }
}
