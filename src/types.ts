// ── Shared Types ──

// ── Enums ──
export type QuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blank'
  | 'multiple-select'
  | 'poll'
  | 'ordering'
  | 'match-pairs'

export type Difficulty = 'easy' | 'standard' | 'hard'

export type GameMode = 'sprint' | 'battle-royale' | 'team-battle' | 'territory'

export type Theme = 'none' | 'halloween' | 'christmas' | 'worldcup' | 'valentine' | 'corporate'

export type Phase = 'lobby' | 'countdown' | 'active' | 'reveal' | 'leaderboard' | 'end'

export interface Question {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  correctAnswer: string | string[]
  explanation: string
  difficulty: string
  strictMatch?: boolean
  pairs?: { left: string; right: string }[]
  order?: string[]
}

export interface RoomConfig {
  difficulty: Difficulty
  questionCount: number
  timePerQuestion: number
  questionTypes: QuestionType[]
  gameMode: GameMode
  playerCap: number
  theme: Theme
  teams?: string[]
  territoryRounds?: number
  territoryQuestionsPerRound?: number
}

export interface Player {
  token: string
  nickname: string
  score: number
  streak: number
  lives: number
  team?: string
  connected: boolean
  isSpectator: boolean
  eliminated: boolean
  currentAnswer?: string | string[]
  answerTimestamp?: number
  tokenExpiry?: number
}

export interface TerritoryZone {
  id: number
  owner: string | null
}

export interface RoomState {
  code: string
  hostToken: string
  phase: Phase
  mode: GameMode
  config: RoomConfig
  players: Map<string, Player>
  questions: Question[]
  currentQIndex: number
  currentRoundScores: Map<string, number>
  territory?: {
    zones: TerritoryZone[]
    round: number
  }
  questionStartTime?: number
  countdownValue?: number
  disconnectedPlayers: Map<string, Player> // nickname -> Player (for reconnection)
}

// ── WebSocket Message Types ──

// Client → Server
export type ClientMessage =
  | { type: 'join'; nickname: string; token?: string; role: 'player' | 'spectator' }
  | { type: 'answer'; questionId: string; answer: string | string[]; timestamp: number }
  | { type: 'reaction'; emoji: string }
  | { type: 'player:assign-team'; team: string }
  | { type: 'host:start' }
  | { type: 'host:end' }
  | { type: 'host:play-again'; reshuffle: boolean }
  | { type: 'host:change-mode'; mode: GameMode }
  | { type: 'host:shuffle-teams' }
  | { type: 'host:assign-teams'; assignments: Record<string, string> }

// Server → Client
export type ServerMessage =
  | { type: 'room:state'; state: ClientRoomState }
  | { type: 'room:player-joined'; nickname: string; count: number }
  | { type: 'room:closed' }
  | { type: 'room:teams-updated'; players: { nickname: string; team: string }[] }
  | { type: 'game:countdown'; seconds: number }
  | { type: 'game:question'; id: string; questionType: QuestionType; question: string; options?: string[]; timeLimit: number; questionNumber: number; total: number; pairs?: { left: string; right: string }[]; order?: string[] }
  | { type: 'game:answer-locked' }
  | { type: 'game:reveal'; correctAnswer: string | string[]; explanation: string; playerResults: Record<string, { correct: boolean; answerGiven: string | string[] | null }>; stats: { correctPct: number; wrongPct: number } }
  | { type: 'game:leaderboard'; standings: StandingEntry[] }
  | { type: 'game:eliminated'; nickname: string }
  | { type: 'game:territory-update'; zones: TerritoryZone[] }
  | { type: 'game:end'; podium: StandingEntry[]; leaderboard: StandingEntry[] }
  | { type: 'spectator:reaction'; emoji: string; nickname: string }
  | { type: 'join:accepted'; token: string }
  | { type: 'join:rejected'; reason: string }

export interface StandingEntry {
  rank: number
  nickname: string
  points: number
  streak: number
  rankChange: number
  token: string
  team?: string
  eliminated?: boolean
  // Team battle: list of members under this team entry
  members?: { nickname: string; points: number; streak: number }[]
}

export interface ClientRoomState {
  code: string
  phase: Phase
  mode: GameMode
  config: RoomConfig
  players: { nickname: string; isSpectator: boolean; eliminated: boolean; team?: string; connected: boolean }[]
  playerCount: number
  spectatorCount: number
  isHost: boolean
  yourToken: string
  yourNickname: string
  currentQIndex: number
  totalQuestions: number
  territory?: {
    zones: TerritoryZone[]
    round: number
  }
}
