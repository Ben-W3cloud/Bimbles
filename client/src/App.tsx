import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { FloatingBubbles } from './components/FloatingBubbles'

const Landing = lazy(() => import('./pages/Landing'))
const Create = lazy(() => import('./pages/Create'))
const Room = lazy(() => import('./pages/Room'))

const LoadingFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 flex items-center justify-center"
    style={{ background: 'var(--bg-primary)' }}
  >
    <FloatingBubbles />
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className="card-pop p-6 text-center"
    >
      <div className="text-4xl mb-4">🎉</div>
      <p className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
        Loading...
      </p>
    </motion.div>
  </motion.div>
)

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
)

export default function App() {
  const location = useLocation()
  
  return (
    <>
      <div className="noise-overlay" />
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingFallback />}>
          <Routes key={location.pathname}>
            <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
            <Route path="/create" element={<PageWrapper><Create /></PageWrapper>} />
            <Route path="/:code" element={<PageWrapper><Room /></PageWrapper>} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  )
}
