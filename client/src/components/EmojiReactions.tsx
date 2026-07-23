import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

export function EmojiReactions() {
  const reactions = useGameStore(s => s.reactions)
  const removeReaction = useGameStore(s => s.removeReaction)

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {reactions.map(r => (
          <FloatingEmoji
            key={r.id}
            emoji={r.emoji}
            nickname={r.nickname}
            onComplete={() => removeReaction(r.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function FloatingEmoji({ emoji, nickname, onComplete }: { emoji: string; nickname: string; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  const x = Math.random() * 80 + 10 // 10-90% from left

  return (
    <motion.div
      initial={{ y: '100vh', x: `${x}vw`, opacity: 0, scale: 0.5 }}
      animate={{
        y: '-20vh',
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1, 0.8],
        x: `${x + (Math.random() * 10 - 5)}vw`,
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 3, ease: 'easeOut' }}
      className="absolute flex flex-col items-center"
    >
      <span className="text-3xl">{emoji}</span>
      <span className="font-body font-bold text-xs mt-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(45, 27, 78, 0.6)', color: 'white' }}>
        {nickname}
      </span>
    </motion.div>
  )
}
