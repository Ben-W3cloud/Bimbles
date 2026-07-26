// ── Zustand store ──

import { create } from 'zustand'
import type { Phase, GameMode, Theme, RoomConfig, ClientRoomState, ActiveQuestion, RevealData, StandingEntry, TerritoryZone, PlayerInfo } from '../utils/types'

interface GameState {
  // Room
  roomCode: string | null
  phase: Phase
  mode: GameMode
  config: RoomConfig | null
  players: PlayerInfo[]
  playerCount: number
  spectatorCount: number
  isHost: boolean
  yourToken: string
  yourNickname: string
  currentQIndex: number
  totalQuestions: number

  // Game
  activeQuestion: ActiveQuestion | null
  timeRemaining: number
  answerLocked: boolean
  yourAnswer: string | string[] | null
  revealData: RevealData | null
  standings: StandingEntry[]
  eliminated: string | null

  // End
  podium: StandingEntry[]
  leaderboard: StandingEntry[]

  // Territory
  territoryZones: TerritoryZone[]
  territoryRound: number

  // Reactions
  reactions: { id: number; emoji: string; nickname: string }[]

  // Network
  reconnectFailed: boolean

  // Actions
  setRoomState: (state: ClientRoomState) => void
  setPhase: (phase: Phase) => void
  setActiveQuestion: (q: ActiveQuestion | null) => void
  setTimeRemaining: (t: number) => void
  setAnswerLocked: (locked: boolean) => void
  setYourAnswer: (a: string | string[] | null) => void
  setRevealData: (data: RevealData | null) => void
  setStandings: (s: StandingEntry[]) => void
  setEliminated: (name: string | null) => void
  setEndData: (podium: StandingEntry[], leaderboard: StandingEntry[]) => void
  setTerritory: (zones: TerritoryZone[], round: number) => void
  setTeams: (players: { nickname: string; team: string }[]) => void
  addReaction: (emoji: string, nickname: string) => void
  removeReaction: (id: number) => void
  setReconnectFailed: (failed: boolean) => void
  reset: () => void
}

const initial = {
  roomCode: null,
  phase: 'lobby' as Phase,
  mode: 'sprint' as GameMode,
  config: null,
  players: [],
  playerCount: 0,
  spectatorCount: 0,
  isHost: false,
  yourToken: '',
  yourNickname: '',
  currentQIndex: 0,
  totalQuestions: 0,
  activeQuestion: null,
  timeRemaining: 0,
  answerLocked: false,
  yourAnswer: null,
  revealData: null,
  standings: [],
  eliminated: null,
  podium: [],
  leaderboard: [],
  territoryZones: [],
  territoryRound: 0,
  reactions: [],
  reconnectFailed: false,
}

export const useGameStore = create<GameState>((set) => ({
  ...initial,

  setRoomState: (state) => set({
    roomCode: state.code,
    phase: state.phase,
    mode: state.mode,
    config: state.config,
    players: state.players,
    playerCount: state.playerCount,
    spectatorCount: state.spectatorCount,
    isHost: state.isHost,
    yourToken: state.yourToken,
    yourNickname: state.yourNickname,
    currentQIndex: state.currentQIndex,
    totalQuestions: state.totalQuestions,
    territoryZones: state.territory?.zones || [],
    territoryRound: state.territory?.round || 0,
  }),

  setPhase: (phase) => set({ phase }),
  setActiveQuestion: (q) => set({ activeQuestion: q, answerLocked: false, yourAnswer: null }),
  setTimeRemaining: (t) => set({ timeRemaining: t }),
  setAnswerLocked: (locked) => set({ answerLocked: locked }),
  setYourAnswer: (a) => set({ yourAnswer: a }),
  setRevealData: (data) => set({ revealData: data }),
  setStandings: (s) => set({ standings: s }),
  setEliminated: (name) => set({ eliminated: name }),
  setEndData: (podium, leaderboard) => set({ podium, leaderboard }),
  setTerritory: (zones, round) => set({ territoryZones: zones, territoryRound: round }),
  setTeams: (teamPlayers) => set((s) => ({
    players: s.players.map(p => {
      const match = teamPlayers.find(tp => tp.nickname === p.nickname)
      return match ? { ...p, team: match.team } : p
    }),
  })),
  addReaction: (emoji, nickname) => set((s) => ({
    reactions: [...s.reactions, { id: Date.now() + Math.random(), emoji, nickname }],
  })),
  removeReaction: (id) => set((s) => ({
    reactions: s.reactions.filter(r => r.id !== id),
  })),
  setReconnectFailed: (failed) => set({ reconnectFailed: failed }),
  reset: () => set(initial),
}))
