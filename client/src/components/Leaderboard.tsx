import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

export function Leaderboard() {
  const standings = useGameStore(s => s.standings)
  const yourToken = useGameStore(s => s.yourToken)
  const mode = useGameStore(s => s.mode)

  if (standings.length === 0) return null

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
        Leaderboard
      </h2>
      <div className="space-y-3">
        {standings.map((entry, i) => (
          <motion.div
            key={entry.token}
            layout
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            className={`leaderboard-row ${i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : ''} ${entry.token === yourToken ? '!ring-2 !ring-offset-2' : ''}`}
            style={entry.token === yourToken ? { '--tw-ring-color': 'var(--gum-500)' } as any : {}}
          >
            {/* Rank */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0"
              style={{
                background: i === 0 ? '#FBBF24' : i === 1 ? '#9CA3AF' : i === 2 ? '#F97316' : 'rgba(114, 46, 209, 0.06)',
                color: i < 3 ? 'white' : 'var(--text-primary)',
              }}
            >
              {entry.rank}
            </div>

            {/* Name + team */}
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {entry.nickname}
                {entry.token === yourToken && ' (you)'}
                {entry.eliminated && ' 💀'}
              </div>
              {entry.team && (
                <div className="font-body font-semibold text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                  {entry.team}
                </div>
              )}
            </div>

            {/* Streak */}
            {entry.streak > 1 && (
              <span className="font-body font-bold text-xs px-2 py-1 rounded-lg shrink-0" style={{ background: 'rgba(255, 122, 69, 0.1)', color: 'var(--coral-400)' }}>
                🔥 {entry.streak}
              </span>
            )}

            {/* Points */}
            <div className="font-display font-bold text-lg shrink-0" style={{ color: 'var(--gum-500)' }}>
              {entry.points}
            </div>

            {/* Rank change */}
            {entry.rankChange !== 0 && (
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-body font-bold text-xs shrink-0"
                style={{ color: entry.rankChange > 0 ? '#10B981' : '#EF4444' }}
              >
                {entry.rankChange > 0 ? '▲' : '▼'} {Math.abs(entry.rankChange)}
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
