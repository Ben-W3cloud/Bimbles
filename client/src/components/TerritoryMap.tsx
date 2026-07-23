import { motion } from 'framer-motion'
import type { TerritoryZone } from '../utils/types'
import { useGameStore } from '../store/gameStore'

const PLAYER_COLORS = [
  '#FF2D8A', '#722ED1', '#36CFC9', '#FF7A45', '#D3F261',
  '#2563EB', '#EC4899', '#10B981', '#F59E0B', '#EF4444',
]

export function TerritoryMap({ zones, round }: { zones: TerritoryZone[]; round: number }) {
  const players = useGameStore(s => s.players)
  const playerNames = players.filter(p => !p.isSpectator).map(p => p.nickname)

  const getColor = (owner: string | null) => {
    if (!owner) return 'rgba(114, 46, 209, 0.06)'
    const idx = playerNames.indexOf(owner)
    return idx >= 0 ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : 'rgba(114, 46, 209, 0.2)'
  }

  const cols = zones.length <= 6 ? 3 : zones.length <= 10 ? 5 : 5

  return (
    <div>
      <h3 className="font-display font-bold text-sm text-center mb-3" style={{ color: 'var(--text-secondary)' }}>
        Territory — Round {round}
      </h3>
      <div
        className="grid gap-2 max-w-md mx-auto"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {zones.map((zone, i) => (
          <motion.div
            key={zone.id}
            layout
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="aspect-square rounded-xl flex items-center justify-center"
            style={{
              background: getColor(zone.owner),
              border: zone.owner ? 'none' : '2px dashed rgba(114, 46, 209, 0.15)',
            }}
          >
            {zone.owner && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-display font-bold text-xs text-white truncate max-w-full px-1"
              >
                {zone.owner.slice(0, 3)}
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
