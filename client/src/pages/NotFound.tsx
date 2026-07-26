import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FloatingBubbles } from '../components/FloatingBubbles'

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      <FloatingBubbles count={8} />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="card-pop p-8 max-w-sm w-full relative z-10 text-center"
      >
        <div className="text-6xl mb-4">🙈</div>
        <h1 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          404
        </h1>
        <p className="font-body font-semibold text-sm mb-6" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
          Oops! This page or room doesn't exist.
        </p>
        <Link to="/" className="btn-gum w-full block">
          Go Home
        </Link>
      </motion.div>
    </motion.div>
  )
}
