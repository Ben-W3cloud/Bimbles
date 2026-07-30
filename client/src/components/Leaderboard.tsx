import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

export function Leaderboard() {
  const standings = useGameStore(s => s.standings)
  const yourToken = useGameStore(s => s.yourToken)
  const mode = useGameStore(s => s.mode)
  const players = useGameStore(s => s.players)

  if (standings.length === 0) return null

  const isTeamMode = mode === 'team-battle'
  const isBattleRoyale = mode === 'battle-royale'

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
        {isTeamMode ? 'Team Standings' : 'Leaderboard'}
      </h2>
      <div className="space-y-3">
        {standings.map((entry, i) => {
          const isTeam = entry.token.startsWith('team:')
          const player = players.find(p => p.nickname === entry.nickname)
          
          return (
            <motion.div
              key={entry.token}
              layout
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
              className={`leaderboard-row ${i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : ''} ${!isTeam && entry.token === yourToken ? '!ring-2 !ring-offset-2' : ''}`}
              style={!isTeam && entry.token === yourToken ? { '--tw-ring-color': 'var(--gum-500)' } as any : {}}
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
                  {!isTeam && entry.token === yourToken && ' (you)'}
                  {!isTeam && entry.eliminated && ' 💀'}
                  {/* Team tag during game */}
                  {!isTeam && entry.team && (
                    <span className="ml-2 px-2 py-0.5 rounded-md text-xs font-body" 
                          style={{ background: 'rgba(114, 46, 209, 0.1)', color: 'var(--grape-500)' }}>
                      {entry.team}
                    </span>
                  )}
                </div>
                {isTeam && entry.members && (
                  <div className="font-body font-semibold text-xs truncate" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                    {entry.members.map(m => m.nickname).join(', ')}
                  </div>
                )}
                {/* Battle Royale lives */}
                {!isTeam && isBattleRoyale && player && (
                  <div className="font-body font-semibold text-xs mt-0.5" style={{ color: '#EF4444' }}>
                    {'❤️'.repeat(Math.max(0, player.lives || 0))}
                  </div>
                )}
              </div>

              {/* Points */}
              <div className="font-display font-bold text-lg shrink-0" style={{ color: 'var(--gum-500)' }}>
                {entry.points}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
