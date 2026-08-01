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
    disconnectedPlayers: new Map(),
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

export function getAllRooms(): Map<string, RoomState> {
  return rooms
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')
    .trim()
}

export function addPlayer(code: string, token: string, nickname: string, isSpectator: boolean): { ok: boolean; reason?: string; token?: string } {
  const room = rooms.get(code)
  if (!room) return { ok: false, reason: 'Room not found' }

  // Sanitize nickname
  const sanitizedNickname = sanitizeInput(nickname)
  if (sanitizedNickname.length === 0) return { ok: false, reason: 'Invalid nickname' }
  if (sanitizedNickname.length > 20) return { ok: false, reason: 'Nickname too long (max 20 chars)' }

  // Check for reconnect with same token
  const existing = room.players.get(token)
  if (existing) {
    if (existing.nickname !== sanitizedNickname) return { ok: false, reason: 'Nickname mismatch' }
    // Check if token has expired
    if (existing.tokenExpiry && Date.now() > existing.tokenExpiry) {
      return { ok: false, reason: 'Token expired. Please rejoin with your nickname.' }
    }
    existing.connected = true
    return { ok: true, token }
  }

  // Check for reconnect by nickname (from disconnected players)
  const disconnectedPlayer = room.disconnectedPlayers.get(sanitizedNickname)
  if (disconnectedPlayer && !isSpectator) {
    // Restore player data with new token
    const restoredPlayer: Player = {
      ...disconnectedPlayer,
      token,
      connected: true,
      tokenExpiry: undefined, // Clear expiry on reconnect
    }
    room.players.set(token, restoredPlayer)
    room.disconnectedPlayers.delete(sanitizedNickname)
    return { ok: true, token }
  }

  // Check if game already started
  if (room.phase !== 'lobby') return { ok: false, reason: 'Game already in progress' }

  // Check room capacity
  if (!isSpectator) {
    const playerCount = [...room.players.values()].filter(p => !p.isSpectator).length
    if (playerCount >= room.config.playerCap) return { ok: false, reason: 'Room is full' }
  }

  // Check if nickname is already taken by active player
  const activeNicknames = [...room.players.values()].map(p => p.nickname)
  if (activeNicknames.includes(sanitizedNickname)) return { ok: false, reason: 'Nickname already in use' }

  const player: Player = {
    token,
    nickname: sanitizedNickname,
    score: 0,
    streak: 0,
    lives: room.mode === 'battle-royale' ? 2 : Infinity,
    connected: true,
    isSpectator,
    eliminated: false,
  }

  room.players.set(token, player)
  return { ok: true, token }
}

export function disconnectPlayer(code: string, token: string) {
  const room = rooms.get(code)
  if (!room) return
  const player = room.players.get(token)
  if (player) {
    player.connected = false
    // Move to disconnected players map for potential reconnection
    if (!player.isSpectator && !player.eliminated) {
      room.disconnectedPlayers.set(player.nickname, { ...player })
    }
  }
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
  // Reset scores and invalidate old tokens
  for (const p of room.players.values()) {
    p.score = 0
    p.streak = 0
    p.eliminated = false
    p.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
    if (room.mode === 'battle-royale') p.lives = 2
  }
  // Clear disconnected players when game starts
  room.disconnectedPlayers.clear()
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
  const players = [...room.players.values()].filter(p => !p.isSpectator)

  if (room.mode === 'team-battle') {
    // Aggregate scores by team
    const teamScores = new Map<string, { points: number; members: { nickname: string; points: number; streak: number }[] }>()
    for (const p of players) {
      if (!p.team) continue
      const entry = teamScores.get(p.team) || { points: 0, members: [] }
      entry.points += p.score
      entry.members.push({ nickname: p.nickname, points: p.score, streak: p.streak })
      teamScores.set(p.team, entry)
    }

    return [...teamScores.entries()]
      .sort((a, b) => b[1].points - a[1].points)
      .map(([teamName, data], i) => ({
        rank: i + 1,
        nickname: teamName,
        points: data.points,
        streak: 0,
        rankChange: 0,
        token: `team:${teamName}`,
        team: teamName,
        members: data.members,
      }))
  }

  // Individual standings (sprint, battle-royale, territory)
  const prevStandings = players
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ token: p.token, rank: i + 1 }))

  return players
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
    p.tokenExpiry = undefined // Clear expiry on reset
    if (room.mode === 'battle-royale') p.lives = 2
  }
  if (room.territory) {
    room.territory.round = 0
    room.territory.zones.forEach(z => z.owner = null)
  }
  // Clear disconnected players on reset
  room.disconnectedPlayers.clear()
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

// ── Team management ──

export function shuffleTeams(code: string) {
  const room = rooms.get(code)
  if (!room || !room.config.teams || room.config.teams.length === 0) return

  const teamNames = [...room.config.teams]
  const playerList = [...room.players.values()].filter(p => !p.isSpectator)

  // Shuffle players randomly
  const shuffled = [...playerList].sort(() => Math.random() - 0.5)

  // Assign teams round-robin to ensure even distribution
  shuffled.forEach((player, i) => {
    player.team = teamNames[i % teamNames.length]
  })
}

export function assignTeams(code: string, assignments: Record<string, string>) {
  const room = rooms.get(code)
  if (!room) return

  for (const [token, team] of Object.entries(assignments)) {
    const player = room.players.get(token)
    if (player) player.team = team
  }
}

export function getTeamAssignments(code: string): { nickname: string; team: string }[] {
  const room = rooms.get(code)
  if (!room) return []
  return [...room.players.values()]
    .filter(p => !p.isSpectator && p.team)
    .map(p => ({ nickname: p.nickname, team: p.team! }))
}
