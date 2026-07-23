// ── WebSocket client ──

import { useGameStore } from '../store/gameStore'
import type { ActiveQuestion, RevealData, StandingEntry, TerritoryZone, ClientRoomState } from './types'

type MessageHandler = (data: any) => void

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let currentRoomCode: string | null = null

export function connectWS(
  roomCode: string,
  nickname: string,
  role: 'player' | 'spectator'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}`
    const url = `${WS_URL}/ws?room=${roomCode}`
    const token = localStorage.getItem(`bimbles-token-${roomCode}`) || undefined

    ws = new WebSocket(url)

    ws.onopen = () => {
      ws!.send(JSON.stringify({
        type: 'join',
        nickname,
        token,
        role,
      }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      handleMessage(msg, resolve, roomCode)
    }

    ws.onclose = () => {
      // Auto-reconnect after 2s
      if (currentRoomCode === roomCode) {
        reconnectTimer = setTimeout(() => {
          connectWS(roomCode, nickname, role).catch(() => {})
        }, 2000)
      }
    }

    ws.onerror = () => {
      reject(new Error('WebSocket connection failed'))
    }

    currentRoomCode = roomCode

    // Timeout
    setTimeout(() => reject(new Error('Connection timeout')), 10000)
  })
}

function handleMessage(
  msg: any,
  joinResolve?: (token: string) => void,
  roomCode?: string
) {
  const store = useGameStore.getState()

  switch (msg.type) {
    case 'join:accepted':
      if (roomCode) {
        localStorage.setItem(`bimbles-token-${roomCode}`, msg.token)
      }
      joinResolve?.(msg.token)
      break

    case 'join:rejected':
      console.error('Join rejected:', msg.reason)
      break

    case 'room:state':
      store.setRoomState(msg.state as ClientRoomState)
      break

    case 'room:player-joined':
      // Re-fetch state handled by server
      break

    case 'room:closed':
      store.setPhase('end')
      store.reset()
      break

    case 'game:countdown':
      store.setPhase('countdown')
      break

    case 'game:question':
      store.setPhase('active')
      store.setActiveQuestion({
        id: msg.id,
        type: msg.type,
        question: msg.question,
        options: msg.options,
        timeLimit: msg.timeLimit,
        questionNumber: msg.questionNumber,
        total: msg.total,
        pairs: msg.pairs,
        order: msg.order,
      } as ActiveQuestion)
      store.setTimeRemaining(msg.timeLimit)
      break

    case 'game:answer-locked':
      store.setAnswerLocked(true)
      break

    case 'game:reveal':
      store.setPhase('reveal')
      store.setRevealData(msg as RevealData)
      break

    case 'game:leaderboard':
      store.setPhase('leaderboard')
      store.setStandings(msg.standings as StandingEntry[])
      break

    case 'game:eliminated':
      store.setEliminated(msg.nickname)
      break

    case 'game:territory-update':
      store.setTerritory(msg.zones as TerritoryZone[], store.territoryRound)
      break

    case 'game:end':
      store.setPhase('end')
      store.setEndData(msg.podium, msg.leaderboard)
      break

    case 'spectator:reaction':
      store.addReaction(msg.emoji, msg.nickname)
      break
  }
}

export function sendAnswer(questionId: string, answer: string | string[], timestamp: number) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'answer', questionId, answer, timestamp }))
}

export function sendReaction(emoji: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'reaction', emoji }))
}

export function sendHostStart() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'host:start' }))
}

export function sendHostEnd() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'host:end' }))
}

export function sendPlayAgain(reshuffle: boolean) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'host:play-again', reshuffle }))
}

export function sendChangeMode(mode: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'host:change-mode', mode }))
}

export function disconnectWS() {
  currentRoomCode = null
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
}
