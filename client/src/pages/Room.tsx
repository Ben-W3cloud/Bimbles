import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { connectWS, disconnectWS, sendHostStart, sendPlayAgain, sendChangeMode, sendReaction } from '../utils/ws'
import { QRCodeSVG } from 'qrcode.react'
import { FloatingBubbles } from '../components/FloatingBubbles'
import { GameQuestion } from '../components/GameQuestion'
import { Leaderboard } from '../components/Leaderboard'
import { Podium } from '../components/Podium'
import { EmojiReactions } from '../components/EmojiReactions'
import { TerritoryMap } from '../components/TerritoryMap'

const EMOJIS = ['🔥', '😂', '💀', '🎉', '😱', '👏', '💪', '🫧']

export default function Room() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const store = useGameStore()

  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<'player' | 'spectator'>('player')
  const [joined, setJoined] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [showEndControls, setShowEndControls] = useState(false)
  const [showPlayAgainModal, setShowPlayAgainModal] = useState(false)
  const [showModeModal, setShowModeModal] = useState(false)

  // Apply theme
  useEffect(() => {
    if (store.config?.theme && store.config.theme !== 'none') {
      document.documentElement.setAttribute('data-theme', store.config.theme)
    }
    return () => { document.documentElement.removeAttribute('data-theme') }
  }, [store.config?.theme])

  // Cleanup on unmount
  useEffect(() => {
    return () => { disconnectWS() }
  }, [])

  const handleJoin = async () => {
    if (!nickname.trim() || !code) return
    setJoinError('')
    try {
      await connectWS(code, nickname.trim(), role)
      setJoined(true)
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join')
    }
  }

  // Nickname entry screen
  if (!joined) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--bg-primary)' }}
      >
        <FloatingBubbles count={5} />
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="card-pop p-8 max-w-sm w-full relative z-10"
        >
          <h1 className="font-display text-2xl font-bold mb-1 text-center" style={{ color: 'var(--text-primary)' }}>
            Join Game
          </h1>
          <p className="font-body font-semibold text-sm text-center mb-6" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
            Room: {code}
          </p>

          <input
            className="input-pop mb-4"
            placeholder="Your nickname"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={20}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            autoFocus
          />

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setRole('player')}
              className="flex-1 py-3 rounded-xl font-body font-bold text-sm transition-all"
              style={{
                background: role === 'player' ? 'var(--gum-500)' : 'rgba(114, 46, 209, 0.06)',
                color: role === 'player' ? 'white' : 'var(--text-primary)',
              }}
            >
              Play
            </button>
            <button
              onClick={() => setRole('spectator')}
              className="flex-1 py-3 rounded-xl font-body font-bold text-sm transition-all"
              style={{
                background: role === 'spectator' ? 'var(--grape-500)' : 'rgba(114, 46, 209, 0.06)',
                color: role === 'spectator' ? 'white' : 'var(--text-primary)',
              }}
            >
              Watch
            </button>
          </div>

          {joinError && (
            <p className="text-sm font-bold mb-4 text-center" style={{ color: '#EF4444' }}>{joinError}</p>
          )}

          <button onClick={handleJoin} className="btn-gum w-full">
            Join
          </button>
        </motion.div>
      </motion.div>
    )
  }

  // ── Phase rendering ──
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative"
      style={{ background: 'var(--bg-primary)' }}
    >
      <FloatingBubbles count={4} />
      <EmojiReactions />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold" style={{ color: 'var(--grape-700)' }}>
            {code}
          </span>
          {store.mode && (
            <span className="font-body font-bold text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(114, 46, 209, 0.08)', color: 'var(--text-secondary)' }}>
              {store.mode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body font-bold text-xs" style={{ color: 'var(--text-secondary)' }}>
            👁 {store.spectatorCount}
          </span>
          {/* Spectator reactions */}
          {role === 'spectator' && (
            <div className="flex gap-1">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => sendReaction(e)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:scale-125 transition-transform"
                  style={{ background: 'rgba(114, 46, 209, 0.06)' }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 px-4 md:px-8 pb-8">
        <AnimatePresence mode="wait">
          {/* ── LOBBY ── */}
          {store.phase === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Waiting Room
                </h1>
                <p className="font-body font-semibold" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                  Share the link or scan the QR
                </p>
              </div>

              {/* QR + Link */}
              <div className="card-pop p-6 mb-6 text-center">
                <div className="inline-block p-4 bg-white rounded-2xl mb-4">
                  <QRCodeSVG value={window.location.href} size={160} />
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="font-body font-bold text-sm px-4 py-2 rounded-xl transition-all hover:scale-105"
                  style={{ background: 'rgba(114, 46, 209, 0.06)', color: 'var(--text-secondary)' }}
                >
                  Copy Link
                </button>
              </div>

              {/* Players grid */}
              <div className="card-pop p-6 mb-6">
                <h3 className="font-display font-bold text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Players ({store.playerCount})
                </h3>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {store.players.filter(p => !p.isSpectator).map(p => (
                      <motion.div
                        key={p.nickname}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="px-4 py-2 rounded-xl font-body font-bold text-sm"
                        style={{
                          background: 'linear-gradient(135deg, var(--gum-500), var(--grape-500))',
                          color: 'white',
                        }}
                      >
                        {p.nickname}
                        {p.nickname === store.yourNickname && store.isHost && ' 👑'}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Host controls */}
              {store.isHost && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <button onClick={sendHostStart} className="btn-gum w-full text-lg">
                    Start Game
                  </button>
                </motion.div>
              )}

              {!store.isHost && (
                <div className="text-center">
                  <p className="font-body font-semibold text-sm animate-pulse" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                    Waiting for host to start...
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── COUNTDOWN ── */}
          {store.phase === 'countdown' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <motion.div
                key={store.timeRemaining}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="font-display text-8xl md:text-9xl font-bold"
                style={{
                  color: 'var(--gum-500)',
                  textShadow: '4px 4px 0 rgba(114, 46, 209, 0.2)',
                }}
              >
                {store.timeRemaining > 0 ? store.timeRemaining : 'GO!'}
              </motion.div>
            </motion.div>
          )}

          {/* ── ACTIVE QUESTION ── */}
          {store.phase === 'active' && store.activeQuestion && (
            <motion.div
              key={`q-${store.activeQuestion.id}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-2xl mx-auto"
            >
              <GameQuestion />
            </motion.div>
          )}

          {/* ── REVEAL ── */}
          {store.phase === 'reveal' && store.revealData && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
              <GameQuestion showResult />
            </motion.div>
          )}

          {/* ── LEADERBOARD ── */}
          {store.phase === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto"
            >
              <Leaderboard />
              {store.mode === 'territory' && store.territoryZones.length > 0 && (
                <div className="mt-6">
                  <TerritoryMap zones={store.territoryZones} round={store.territoryRound} />
                </div>
              )}
            </motion.div>
          )}

          {/* ── END GAME ── */}
          {store.phase === 'end' && store.podium.length > 0 && (
            <motion.div
              key="end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-lg mx-auto"
            >
              <Podium />
              <Leaderboard />

              {/* Host controls */}
              {store.isHost && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="flex gap-3 mt-6"
                >
                  <button onClick={() => setShowPlayAgainModal(true)} className="btn-gum flex-1">
                    Play Again
                  </button>
                  <button onClick={() => setShowModeModal(true)} className="btn-grape flex-1">
                    Change Mode
                  </button>
                  <button
                    onClick={() => { disconnectWS(); navigate('/') }}
                    className="px-6 py-3 rounded-xl font-body font-bold text-sm"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                  >
                    Quit
                  </button>
                </motion.div>
              )}

              {!store.isHost && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center mt-6"
                >
                  <button
                    onClick={() => { disconnectWS(); navigate('/') }}
                    className="font-body font-bold text-sm px-6 py-3 rounded-xl"
                    style={{ background: 'rgba(114, 46, 209, 0.06)', color: 'var(--text-secondary)' }}
                  >
                    Go Home
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Play Again Modal */}
      <AnimatePresence>
        {showPlayAgainModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(45, 27, 78, 0.6)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="card-pop p-8 max-w-sm w-full text-center"
            >
              <h3 className="font-display text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Play Again</h3>
              <div className="flex flex-col gap-3">
                <button onClick={() => { sendPlayAgain(true); setShowPlayAgainModal(false) }} className="btn-gum w-full">
                  Reshuffle Questions
                </button>
                <button onClick={() => { sendPlayAgain(false); setShowPlayAgainModal(false) }} className="btn-grape w-full">
                  Same Order
                </button>
                <button onClick={() => setShowPlayAgainModal(false)} className="font-body font-bold text-sm py-2" style={{ color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Mode Modal */}
      <AnimatePresence>
        {showModeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(45, 27, 78, 0.6)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="card-pop p-8 max-w-sm w-full text-center"
            >
              <h3 className="font-display text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Change Mode</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(['sprint', 'battle-royale', 'team-battle', 'territory'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { sendChangeMode(m); setShowModeModal(false) }}
                    className="p-4 rounded-xl font-display font-bold text-sm capitalize transition-all hover:scale-105"
                    style={{
                      background: store.mode === m ? 'var(--gum-500)' : 'rgba(114, 46, 209, 0.06)',
                      color: store.mode === m ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowModeModal(false)} className="font-body font-bold text-sm py-2" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
