// ── Frontend types (mirror of server types) ──

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

export interface StandingEntry {
  rank: number
  nickname: string
  points: number
  streak: number
  rankChange: number
  token: string
  team?: string
  eliminated?: boolean
  members?: { nickname: string; points: number; streak: number }[]
}

export interface TerritoryZone {
  id: number
  owner: string | null
}

export interface PlayerInfo {
  nickname: string
  isSpectator: boolean
  eliminated: boolean
  team?: string
  connected: boolean
}

export interface ClientRoomState {
  code: string
  phase: Phase
  mode: GameMode
  config: RoomConfig
  players: PlayerInfo[]
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

export interface ActiveQuestion {
  id: string
  questionType: QuestionType
  question: string
  options?: string[]
  timeLimit: number
  questionNumber: number
  total: number
  pairs?: { left: string; right: string }[]
  order?: string[]
}

export interface RevealData {
  correctAnswer: string | string[]
  explanation: string
  playerResults: Record<string, { correct: boolean; answerGiven: string | string[] | null }>
  stats: { correctPct: number; wrongPct: number }
}
