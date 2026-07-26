import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { sendAnswer } from '../utils/ws'

export function GameQuestion({ showResult = false }: { showResult?: boolean }) {
  const q = useGameStore(s => s.activeQuestion)
  const revealData = useGameStore(s => s.revealData)
  const answerLocked = useGameStore(s => s.answerLocked)
  const yourToken = useGameStore(s => s.yourToken)
  const timeRemaining = useGameStore(s => s.timeRemaining)
  const setTimeRemaining = useGameStore(s => s.setTimeRemaining)

  const [selected, setSelected] = useState<string | string[] | null>(null)
  const [fillValue, setFillValue] = useState('')
  const [multiSelected, setMultiSelected] = useState<string[]>([])
  const [orderItems, setOrderItems] = useState<string[]>([])
  const [matchSelection, setMatchSelection] = useState<{ left: string | null; pairs: Record<string, string> }>({ left: null, pairs: {} })
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  // Timer countdown
  useEffect(() => {
    if (!q || showResult || answerLocked) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    setTimeRemaining(q.timeLimit)
    timerRef.current = setInterval(() => {
      setTimeRemaining(useGameStore.getState().timeRemaining - 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [q?.id, showResult, answerLocked])

  // Init order for ordering questions
  useEffect(() => {
    if (q?.questionType === 'ordering' && q.order) {
      const shuffled = [...q.order].sort(() => Math.random() - 0.5)
      setOrderItems(shuffled)
    }
  }, [q?.id])

  if (!q) return null

  const setYourAnswer = useGameStore(s => s.setYourAnswer)
  const setAnswerLocked = useGameStore(s => s.setAnswerLocked)

  const handleSubmit = (answer: string | string[]) => {
    if (answerLocked) return
    setSelected(answer)
    setYourAnswer(answer)
    setAnswerLocked(true)
    sendAnswer(q.id, answer, Date.now())
  }

  const handleMultiSubmit = () => {
    if (answerLocked || multiSelected.length === 0) return
    setSelected(multiSelected)
    setYourAnswer(multiSelected)
    setAnswerLocked(true)
    sendAnswer(q.id, multiSelected, Date.now())
  }

  const handleOrderSubmit = () => {
    if (answerLocked) return
    setSelected(orderItems)
    setYourAnswer(orderItems)
    setAnswerLocked(true)
    sendAnswer(q.id, orderItems, Date.now())
  }

  const handleMatchSubmit = () => {
    if (answerLocked) return
    const pairs = Object.entries(matchSelection.pairs).map(([l, r]) => `${l}→${r}`)
    setSelected(pairs)
    setYourAnswer(pairs)
    setAnswerLocked(true)
    sendAnswer(q.id, pairs, Date.now())
  }

  const isCorrect = (opt: string) => {
    if (!revealData) return false
    const myResult = revealData.playerResults[yourToken]
    if (!myResult) return false
    if (Array.isArray(revealData.correctAnswer)) {
      return revealData.correctAnswer.includes(opt)
    }
    return revealData.correctAnswer === opt
  }

  const wasMyAnswerCorrect = () => {
    if (!revealData) return false
    return revealData.playerResults[yourToken]?.correct || false
  }

  const timerPct = q.timeLimit > 0 ? timeRemaining / q.timeLimit : 0
  const timerColor = timerPct > 0.5 ? 'var(--mint-400)' : timerPct > 0.25 ? 'var(--coral-400)' : '#EF4444'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-sm font-bold" style={{ color: 'var(--gum-500)' }}>
          {q.questionNumber}/{q.total}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
            {q.questionType.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Timer bar */}
      {!showResult && (
        <div className="h-2 rounded-full mb-6 overflow-hidden" style={{ background: 'rgba(114, 46, 209, 0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: timerColor }}
            animate={{ width: `${timerPct * 100}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
          />
        </div>
      )}

      {/* Timer number */}
      {!showResult && (
        <div className="text-center mb-4">
          <span className="font-display text-3xl font-bold" style={{ color: timerColor }}>
            {timeRemaining}
          </span>
        </div>
      )}

      {/* Question */}
      <motion.h2
        key={q.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-xl md:text-2xl font-bold text-center mb-8"
        style={{ color: 'var(--text-primary)' }}
      >
        {q.question}
      </motion.h2>

      {/* Answer area */}
      {!showResult ? (
        <>
          {/* Multiple choice / True-False */}
          {(q.questionType === 'multiple-choice' || q.questionType === 'true-false') && q.options && (
            <div className="grid gap-3">
              {q.options.map((opt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`option-btn ${selected === opt ? 'selected' : ''}`}
                  disabled={answerLocked}
                  onClick={() => handleSubmit(opt)}
                >
                  <span className="font-body font-bold">{opt}</span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Fill in the blank */}
          {q.questionType === 'fill-blank' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <input
                className="input-pop text-center text-lg"
                placeholder="Type your answer..."
                value={fillValue}
                onChange={e => setFillValue(e.target.value)}
                disabled={answerLocked}
                onKeyDown={e => {
                  if (e.key === 'Enter' && fillValue.trim() && !answerLocked) {
                    handleSubmit(fillValue.trim())
                  }
                }}
                autoFocus
              />
              {!answerLocked && fillValue.trim() && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="btn-gum w-full mt-4"
                  onClick={() => handleSubmit(fillValue.trim())}
                >
                  Lock In
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Multiple select */}
          {q.questionType === 'multiple-select' && q.options && (
            <div>
              <div className="grid gap-3">
                {q.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`option-btn ${multiSelected.includes(opt) ? 'selected' : ''}`}
                    disabled={answerLocked}
                    onClick={() => {
                      setMultiSelected(prev =>
                        prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                      )
                    }}
                  >
                    <span className="font-body font-bold">{opt}</span>
                  </motion.button>
                ))}
              </div>
              {!answerLocked && multiSelected.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="btn-gum w-full mt-4"
                  onClick={handleMultiSubmit}
                >
                  Lock In ({multiSelected.length} selected)
                </motion.button>
              )}
            </div>
          )}

          {/* Poll */}
          {q.questionType === 'poll' && q.options && (
            <div className="grid gap-3">
              {q.options.map((opt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`option-btn ${selected === opt ? 'selected' : ''}`}
                  disabled={answerLocked}
                  onClick={() => handleSubmit(opt)}
                >
                  <span className="font-body font-bold">{opt}</span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Ordering */}
          {q.questionType === 'ordering' && (
            <div>
              <p className="font-body font-semibold text-sm text-center mb-4" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                Drag to reorder (tap on mobile)
              </p>
              <div className="space-y-2">
                {orderItems.map((item, i) => (
                  <motion.div
                    key={item}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="option-btn flex items-center gap-3 cursor-grab"
                    draggable
                    onDragStart={e => {
                      (e.target as HTMLElement).dataset.index = String(i)
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      const from = Number((e.target as HTMLElement).dataset.index)
                      if (!isNaN(from)) {
                        setOrderItems(prev => {
                          const next = [...prev]
                          const [moved] = next.splice(from, 1)
                          next.splice(i, 0, moved)
                          return next
                        })
                      }
                    }}
                  >
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-sm shrink-0" style={{ background: 'var(--gum-500)', color: 'white' }}>
                      {i + 1}
                    </span>
                    <span className="font-body font-bold">{item}</span>
                  </motion.div>
                ))}
              </div>
              {!answerLocked && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="btn-gum w-full mt-4"
                  onClick={handleOrderSubmit}
                >
                  Lock In Order
                </motion.button>
              )}
            </div>
          )}

          {/* Match pairs */}
          {q.questionType === 'match-pairs' && q.pairs && (
            <div>
              <p className="font-body font-semibold text-sm text-center mb-4" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                Tap a left item, then tap its match on the right
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {q.pairs.map(p => (
                    <motion.button
                      key={p.left}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`option-btn text-center text-sm ${matchSelection.left === p.left ? 'selected' : ''} ${matchSelection.pairs[p.left] ? '!border-green-500 !bg-green-50' : ''}`}
                      onClick={() => setMatchSelection(prev => ({ ...prev, left: p.left }))}
                      disabled={!!matchSelection.pairs[p.left]}
                    >
                      {p.left}
                    </motion.button>
                  ))}
                </div>
                <div className="space-y-2">
                  {[...q.pairs].sort(() => 0.5 - Math.random()).map(p => (
                    <motion.button
                      key={p.right}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`option-btn text-center text-sm ${Object.values(matchSelection.pairs).includes(p.right) ? '!border-green-500 !bg-green-50' : ''}`}
                      onClick={() => {
                        if (matchSelection.left && !matchSelection.pairs[matchSelection.left]) {
                          setMatchSelection(prev => ({
                            left: null,
                            pairs: { ...prev.pairs, [prev.left!]: p.right },
                          }))
                        }
                      }}
                      disabled={Object.values(matchSelection.pairs).includes(p.right)}
                    >
                      {p.right}
                    </motion.button>
                  ))}
                </div>
              </div>
              {!answerLocked && Object.keys(matchSelection.pairs).length === (q.pairs?.length || 0) && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="btn-gum w-full mt-4"
                  onClick={handleMatchSubmit}
                >
                  Lock In Matches
                </motion.button>
              )}
            </div>
          )}
        </>
      ) : (
        /* ── Reveal results ── */
        <div>
          {/* Options with correct/wrong */}
          {q.options && (
            <div className="grid gap-3 mb-6">
              {q.options.map((opt, i) => {
                const correct = isCorrect(opt)
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`option-btn ${correct ? 'correct' : ''} ${selected === opt && !correct ? 'wrong' : ''}`}
                    aria-disabled
                  >
                    <span className="font-body font-bold">{opt}</span>
                    {correct && <span className="float-right">✓</span>}
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Stats */}
          {revealData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card-pop p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-sm" style={{ color: wasMyAnswerCorrect() ? '#10B981' : '#EF4444' }}>
                  {wasMyAnswerCorrect() ? '✓ Correct!' : '✗ Wrong'}
                </span>
                <div className="flex gap-4">
                  <span className="font-body font-bold text-sm" style={{ color: '#10B981' }}>
                    {revealData.stats.correctPct}% correct
                  </span>
                  <span className="font-body font-bold text-sm" style={{ color: '#EF4444' }}>
                    {revealData.stats.wrongPct}% wrong
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'rgba(114, 46, 209, 0.06)' }}>
                <div className="h-full rounded-l-full" style={{ width: `${revealData.stats.correctPct}%`, background: '#10B981' }} />
                <div className="h-full rounded-r-full" style={{ width: `${revealData.stats.wrongPct}%`, background: '#EF4444' }} />
              </div>
              {revealData.explanation && (
                <p className="font-body font-semibold text-sm mt-3" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                  {revealData.explanation}
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Locked indicator */}
      {answerLocked && !showResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mt-6"
        >
          <span className="font-display font-bold text-sm px-4 py-2 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            Answer locked in!
          </span>
        </motion.div>
      )}
    </div>
  )
}
