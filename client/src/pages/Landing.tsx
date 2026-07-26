import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FloatingBubbles } from '../components/FloatingBubbles'
import InteractiveDemo from '../components/InteractiveDemo'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function Landing() {
  const navigate = useNavigate()
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [joinError, setJoinError] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomCode.trim()) {
      setJoinError('Please enter a room code')
      return
    }
    navigate(`/${roomCode.trim().toUpperCase()}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      <FloatingBubbles />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-display text-2xl font-bold"
          style={{ color: 'var(--grape-700)' }}
        >
          Bimbles
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-3"
        >
          <Link to="/create" className="btn-grape text-sm !py-2.5 !px-5">
            Create Quiz
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-10 pb-20 md:pt-24 md:pb-32">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="mb-6">
            <span
              className="inline-block px-5 py-2 rounded-full text-sm font-bold font-body"
              style={{ background: 'rgba(255, 45, 138, 0.1)', color: 'var(--gum-500)' }}
            >
              Pop Your Brain
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Quiz nights,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--gum-500), var(--grape-500), var(--coral-400))',
                backgroundSize: '200% 200%',
                animation: 'gradient-shift 4s ease infinite',
              }}
            >
              never boring.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl max-w-xl mx-auto mb-10 font-body font-semibold"
            style={{ color: 'var(--text-secondary)', opacity: 0.8 }}
          >
            Create AI-powered quizzes in seconds. Share a link. Play together in real-time.
            No accounts, no downloads, no nonsense.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setShowLaunchModal(true)} className="btn-gum text-lg">
              Launch App
            </button>
            <a
              href="#see-it-in-action"
              className="btn-grape text-lg"
            >
              Try Demo Quiz
            </a>
          </motion.div>
        </motion.div>

        {/* Decorative blobs */}
        <div className="blob blob-gum w-72 h-72 -top-20 -left-20" style={{ opacity: 0.2 }} />
        <div className="blob blob-grape w-96 h-96 top-40 -right-32" style={{ opacity: 0.15 }} />
        <div className="blob blob-mint w-64 h-64 bottom-0 left-1/4" style={{ opacity: 0.15 }} />
      </section>

      {/* See It In Action */}
      <section id="see-it-in-action" className="relative z-10 px-6 py-20 md:px-12" style={{ background: 'var(--bg-secondary)' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            See It In Action
          </h2>
          <p className="font-body font-semibold text-lg mb-10" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
            Click an answer. Get instant feedback. Feel the rush.
          </p>
          <div className="card-pop p-6 md:p-8 max-w-lg mx-auto">
            <InteractiveDemo />
          </div>
        </motion.div>
      </section>

      {/* Game Modes */}
      <section className="relative z-10 px-6 py-20 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Pick your poison
          </h2>
          <p className="font-body font-semibold text-lg" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
            Four ways to play. All equally addictive.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { name: 'Sprint', icon: '⚡', desc: 'Fast-paced, no elimination. Pure speed.', color: 'var(--lemon-300)' },
            { name: 'Battle Royale', icon: '👑', desc: '2 lives each. Wrong answer? You\'re out.', color: 'var(--coral-400)' },
            { name: 'Team Battle', icon: '🤝', desc: 'Squad up. Combined scores win.', color: 'var(--mint-400)' },
            { name: 'Territory', icon: '🗺️', desc: 'Claim zones. Defend your turf.', color: 'var(--gum-500)' },
          ].map((mode, i) => (
            <motion.div
              key={mode.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="card-pop p-6 text-center cursor-default"
            >
              <div className="text-4xl mb-3">{mode.icon}</div>
              <h3 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {mode.name}
              </h3>
              <p className="font-body font-semibold text-sm" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                {mode.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 py-20 md:px-12" style={{ background: 'var(--bg-secondary)' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Three steps. That's it.
          </h2>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
          {[
            { step: '01', title: 'Create', desc: 'Paste text or upload a PDF. AI builds your quiz then you customise it.', color: 'var(--gum-500)' },
            { step: '02', title: 'Share', desc: 'Send the room link or QR code. Anyone can join.', color: 'var(--grape-500)' },
            { step: '03', title: 'Play', desc: 'Answer fast, score big. Watch the leaderboard shake out.', color: 'var(--mint-400)' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex-1 text-center"
            >
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl font-display text-2xl font-bold text-white mb-4"
                style={{ background: item.color }}
              >
                {item.step}
              </div>
              <h3 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </h3>
              <p className="font-body font-semibold" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Bimbles */}
      <section className="relative z-10 px-6 py-20 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center mb-14" style={{ color: 'var(--text-primary)' }}>
            Why Bimbles?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Zero setup', desc: 'No accounts, no downloads. Faster and Better experience' },
              { title: 'AI-powered', desc: 'Paste any text, get a quiz in seconds which can still be edited to your taste .' },
              { title: 'Real-time', desc: 'Answers, scores, leaderboards and rankings update live.' },
              { title: 'Reconnect-safe', desc: 'Lost connection? Rejoin with the same link and username. Your score waits.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-pop p-6"
              >
                <h3 className="font-display text-lg font-bold mb-2" style={{ color: 'var(--gum-500)' }}>
                  {item.title}
                </h3>
                <p className="font-body font-semibold text-sm" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 text-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="font-display text-xl font-bold mb-2" style={{ color: 'var(--grape-700)' }}>
          Bimbles
        </div>
        <p className="font-body text-sm font-semibold" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
          Pop your brain. Share the fun.
        </p>
      </footer>

      {/* Launch App Modal */}
      <AnimatePresence>
        {showLaunchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(45, 27, 78, 0.6)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card-pop p-8 max-w-md w-full text-center relative"
            >
              <button
                onClick={() => { setShowLaunchModal(false); setJoinError(''); setRoomCode('') }}
                className="absolute top-4 right-4 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(114, 46, 209, 0.06)', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>

              <h3 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Let's Play!
              </h3>
              <p className="font-body font-semibold text-sm mb-6" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                Choose whether you want to host your own quiz or join an existing game room.
              </p>

              <div className="space-y-4">
                {/* Create card */}
                <button
                  onClick={() => navigate('/create')}
                  className="w-full p-4 rounded-2xl text-left border-2 transition-all hover:scale-[1.02] flex items-center gap-4"
                  style={{ background: 'rgba(255, 45, 138, 0.05)', borderColor: 'rgba(255, 45, 138, 0.2)' }}
                >
                  <span className="text-3xl">🪄</span>
                  <div>
                    <div className="font-display font-bold text-base" style={{ color: 'var(--gum-500)' }}>Create a Quiz</div>
                    <div className="font-body text-xs font-semibold" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>AI-powered trivia setup in seconds</div>
                  </div>
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed" style={{ borderColor: 'rgba(114, 46, 209, 0.15)' }} />
                  </div>
                  <span className="relative px-3 text-xs font-display font-bold bg-[#FAF8FF] dark:bg-[#1C142A]" style={{ color: 'var(--text-secondary)' }}>
                    OR
                  </span>
                </div>

                {/* Join Form */}
                <form onSubmit={handleJoin} className="space-y-3">
                  <div className="relative">
                    <input
                      className="input-pop text-center font-display text-lg uppercase tracking-widest"
                      placeholder="ENTER ROOM CODE"
                      value={roomCode}
                      onChange={e => {
                        setRoomCode(e.target.value.toUpperCase().slice(0, 6))
                        setJoinError('')
                      }}
                      maxLength={6}
                    />
                  </div>
                  {joinError && (
                    <p className="text-xs font-bold text-center" style={{ color: '#EF4444' }}>{joinError}</p>
                  )}
                  <button type="submit" className="btn-grape w-full py-3">
                    Join Game 🎮
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
