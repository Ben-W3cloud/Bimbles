// ── WebSocket client ──

import { useGameStore } from '../store/gameStore'
import type { ActiveQuestion, RevealData, StandingEntry, TerritoryZone, ClientRoomState } from './types'

type MessageHandler = (data: any) => void

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null
let currentRoomCode: string | null = null
let latency = 0
let lastPingTime = 0

export function connectWS(
  roomCode: string,
  nickname: string,
  role: 'player' | 'spectator'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws?room=${roomCode}`
    const token = localStorage.getItem(`bimbles-token-${roomCode}`) || undefined

    ws = new WebSocket(url)

    ws.onopen = () => {
      ws!.send(JSON.stringify({
        type: 'join',
        nickname,
        token,
        role,
      }))
      
      // Start ping interval for latency measurement
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          lastPingTime = Date.now()
          try {
            ws.send('ping')
          } catch {
            // Connection might have closed
          }
        }
      }, 10000)
    }

    ws.onmessage = (event) => {
      const data = event.data
      
      // Handle ping/pong
      if (data === 'pong') {
        latency = Date.now() - lastPingTime
        return
      }
      
      const msg = JSON.parse(data)
      handleMessage(msg, resolve, roomCode)
    }

    ws.onclose = () => {
      // Clear ping timer
      if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
      }
      latency = 0
      
      // Auto-reconnect after 2s
      if (currentRoomCode === roomCode) {
        reconnectTimer = setTimeout(() => {
          connectWS(roomCode, nickname, role)
            .then(() => {
              useGameStore.getState().setReconnectFailed(false)
            })
            .catch(() => {
              useGameStore.getState().setReconnectFailed(true)
            })
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

    case 'room:teams-updated':
      store.setTeams(msg.players as { nickname: string; team: string }[])
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
      store.setTimeRemaining(msg.seconds)
      break

    case 'game:question':
      store.setPhase('active')
      store.setActiveQuestion({
        id: msg.id,
        questionType: msg.questionType,
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

    case 'host:end':
      store.setPhase('end')
      store.setEndData([], [])
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

export function sendShuffleTeams() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'host:shuffle-teams' }))
}

export function sendAssignTeams(assignments: Record<string, string>) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'host:assign-teams', assignments }))
}

export function disconnectWS() {
  currentRoomCode = null
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (pingTimer) clearInterval(pingTimer)
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  latency = 0
  pingTimer = null
}

// Connection quality indicator
export function getConnectionStatus() {
  if (latency < 100) return { icon: '⚡', color: 'green', label: 'Excellent' }
  if (latency < 300) return { icon: '🟢', color: 'green', label: 'Good' }
  if (latency < 500) return { icon: '🟡', color: 'yellow', label: 'OK' }
  return { icon: '🔴', color: 'red', label: 'Slow' }
}

export function getLatency() {
  return latency
}
