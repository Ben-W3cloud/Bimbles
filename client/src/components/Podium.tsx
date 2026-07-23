import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

const MEDAL_COLORS = ['#FBBF24', '#9CA3AF', '#F97316']
const MEDAL_EMOJIS = ['👑', '🥈', '🥉']

export function Podium() {
  const podium = useGameStore(s => s.podium)
  const yourToken = useGameStore(s => s.yourToken)

  if (podium.length === 0) return null

  // Reorder for podium display: 2nd, 1st, 3rd
  const ordered = podium.length >= 3
    ? [podium[1], podium[0], podium[2]]
    : podium.length === 2
    ? [podium[1], podium[0]]
    : [podium[0]]

  const heights = podium.length >= 3 ? [100, 140, 80] : podium.length === 2 ? [100, 140] : [120]

  return (
    <div className="mb-8">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-3xl font-bold text-center mb-8"
        style={{ color: 'var(--text-primary)' }}
      >
        Game Over!
      </motion.h2>

      <div className="flex items-end justify-center gap-4 mb-8" style={{ minHeight: 200 }}>
        {ordered.map((entry, i) => {
          const originalIndex = podium.length >= 3 ? (i === 0 ? 1 : i === 1 ? 0 : 2) : i
          return (
            <motion.div
              key={entry.token}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center"
            >
              {/* Medal emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + i * 0.2, type: 'spring', stiffness: 300 }}
                className="text-3xl mb-2"
              >
                {MEDAL_EMOJIS[originalIndex]}
              </motion.div>

              {/* Name */}
              <span className="font-display font-bold text-sm mb-2 text-center max-w-[100px] truncate" style={{ color: 'var(--text-primary)' }}>
                {entry.nickname}
                {entry.token === yourToken && ' ★'}
              </span>

              {/* Points */}
              <span className="font-display font-bold text-xs mb-2" style={{ color: 'var(--gum-500)' }}>
                {entry.points} pts
              </span>

              {/* Podium block */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: heights[i] }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.5, ease: 'easeOut' }}
                className="w-20 md:w-24 rounded-t-2xl flex items-start justify-center pt-3"
                style={{
                  background: `linear-gradient(180deg, ${MEDAL_COLORS[originalIndex]}, ${MEDAL_COLORS[originalIndex]}88)`,
                }}
              >
                <span className="font-display text-2xl font-bold text-white">
                  {originalIndex + 1}
                </span>
              </motion.div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
