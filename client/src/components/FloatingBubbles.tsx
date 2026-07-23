import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface Props {
  count?: number
}

export function FloatingBubbles({ count = 12 }: Props) {
  const bubbles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 60 + 20,
      x: Math.random() * 100,
      delay: Math.random() * 6,
      duration: Math.random() * 4 + 5,
      color: [
        'var(--gum-500)',
        'var(--grape-500)',
        'var(--mint-400)',
        'var(--coral-400)',
        'var(--lemon-300)',
      ][Math.floor(Math.random() * 5)],
    })),
    [count]
  )

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {bubbles.map(b => (
        <motion.div
          key={b.id}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.x}%`,
            bottom: '-100px',
            background: b.color,
            opacity: 0.08,
            filter: 'blur(2px)',
          }}
          animate={{
            y: [0, -(window.innerHeight || 800) - 200],
            x: [0, Math.sin(b.id) * 50],
            opacity: [0, 0.08, 0.08, 0],
          }}
          transition={{
            duration: b.duration,
            delay: b.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}
