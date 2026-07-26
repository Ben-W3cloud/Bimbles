import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { generateQuestions, createRoom } from '../utils/api'
import type { Question, QuestionType, Difficulty, GameMode, Theme, RoomConfig } from '../utils/types'
import { FloatingBubbles } from '../components/FloatingBubbles'

const LOADING_MESSAGES = [
  "Generating brain-melting questions...",
  "Consulting the quiz gods...",
  "Shuffling the knowledge deck...",
  "Charging the fun meters...",
  "Warming up the confetti cannons...",
  "Calibrating the hype...",
  "Loading the memes...",
  "Almost there...",
  "Hold on to your hats...",
  "Preparing mind-blowing trivia...",
  "Cranking up the difficulty...",
  "Making Kahoot jealous...",
]

// ── PDF parsing (lazy loaded) ──
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item: any) => item.str).join(' ') + '\n'
  }
  return text
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True / False' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'multiple-select', label: 'Multiple Select' },
  { value: 'poll', label: 'Poll' },
  { value: 'ordering', label: 'Ordering' },
  { value: 'match-pairs', label: 'Match Pairs' },
]

const GAME_MODES: { value: GameMode; label: string; icon: string }[] = [
  { value: 'sprint', label: 'Sprint', icon: '⚡' },
  { value: 'battle-royale', label: 'Battle Royale', icon: '👑' },
  { value: 'team-battle', label: 'Team Battle', icon: '🤝' },
  { value: 'territory', label: 'Territory', icon: '🗺️' },
]

const THEMES: { value: Theme; label: string; color: string }[] = [
  { value: 'none', label: 'Default', color: '#FF2D8A' },
  { value: 'halloween', label: 'Halloween', color: '#FF6B2B' },
  { value: 'christmas', label: 'Christmas', color: '#DC2626' },
  { value: 'worldcup', label: 'World Cup', color: '#2563EB' },
  { value: 'valentine', label: 'Valentine', color: '#EC4899' },
  { value: 'corporate', label: 'Corporate', color: '#0EA5E9' },
]

export default function Create() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0: input, 1: config, 2: loading, 3: review
  const [sourceText, setSourceText] = useState('')
  const [pdfName, setPdfName] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('')

  // Config
  const [difficulty, setDifficulty] = useState<Difficulty>('standard')
  const [questionCount, setQuestionCount] = useState(10)
  const [timePerQuestion, setTimePerQuestion] = useState(20)
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['multiple-choice'])
  const [gameMode, setGameMode] = useState<GameMode>('sprint')
  const [playerCap, setPlayerCap] = useState(20)
  const [theme, setTheme] = useState<Theme>('none')
  const [territoryRounds, setTerritoryRounds] = useState(4)
  const [territoryQPerRound, setTerritoryQPerRound] = useState(2)

  // Teams
  const [teamNames, setTeamNames] = useState<string[]>(['Team A', 'Team B'])
  // Generated
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState('')

  // Cycle through loading messages
  useEffect(() => {
    if (step !== 2) {
      setLoadingMessage('')
      return
    }
    let index = 0
    const interval = setInterval(() => {
      setLoadingMessage(LOADING_MESSAGES[index % LOADING_MESSAGES.length])
      index++
    }, 2000)
    return () => clearInterval(interval)
  }, [step])

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfName(file.name)
    try {
      const text = await extractPdfText(file)
      setSourceText(text)
    } catch {
      setError('Failed to parse PDF')
    }
  }, [])

  const toggleType = (t: QuestionType) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      setError('Please provide some text or upload a PDF')
      return
    }
    if (selectedTypes.length === 0) {
      setError('Select at least one question type')
      return
    }
    setError('')
    setStep(2)
    try {
      const qs = await generateQuestions(sourceText, questionCount, difficulty, selectedTypes)
      setQuestions(qs)
      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Generation failed')
      setStep(0)
    }
  }

  const handleCreateRoom = async () => {
    if (questions.length === 0) return
    const hostToken = crypto.randomUUID()
    localStorage.setItem('bimbles-host-token', hostToken)

    const config: RoomConfig = {
      difficulty,
      questionCount: questions.length,
      timePerQuestion,
      questionTypes: selectedTypes,
      gameMode,
      playerCap,
      theme,
      teams: gameMode === 'team-battle' ? teamNames : undefined,
      territoryRounds: gameMode === 'territory' ? territoryRounds : undefined,
      territoryQuestionsPerRound: gameMode === 'territory' ? territoryQPerRound : undefined,
    }

    try {
      const { code } = await createRoom(config, questions, hostToken)
      navigate(`/${code}`)
    } catch {
      setError('Failed to create room')
    }
  }

  // ── Question editing ──
  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const deleteQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return
    setQuestions(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)' }}
    >
      <FloatingBubbles count={13} />

      {/* Header */}
      <div className="relative z-10 px-6 py-5 md:px-12 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="font-display text-2xl font-bold" style={{ color: 'var(--grape-700)' }}>
          Bimbles
        </button>
        {step === 3 && (
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="font-body font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
              Start Over
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {/* Step 0: Input */}
          {step === 0 && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                What's your quiz about?
              </h1>
              <p className="font-body font-semibold mb-8" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                Paste text or upload a PDF. We'll do the rest.
              </p>

              {/* PDF Upload */}
              <div className="card-pop p-6 mb-6">
                <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-colors"
                  style={{ borderColor: pdfName ? 'var(--gum-500)' : 'rgba(114, 46, 209, 0.15)' }}
                >
                  <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                  <div className="text-3xl mb-2">{pdfName ? '📄' : '📎'}</div>
                  <span className="font-body font-bold text-sm" style={{ color: pdfName ? 'var(--gum-500)' : 'var(--text-secondary)' }}>
                    {pdfName || 'Upload PDF'}
                  </span>
                </label>
              </div>

              {/* Text area */}
              <div className="card-pop p-6 mb-6">
                <textarea
                  className="input-pop min-h-[200px] resize-y"
                  placeholder="Or paste your content here..."
                  value={sourceText}
                  onChange={e => setSourceText(e.target.value)}
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold mb-4" style={{ color: '#EF4444' }}>
                  {error}
                </motion.p>
              )}

              <button onClick={() => { if (sourceText.trim()) { setError(''); setStep(1) } else setError('Please provide some content first') }} className="btn-gum w-full">
                Next: Configure
              </button>
            </motion.div>
          )}

          {/* Step 1: Config */}
          {step === 1 && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
                Set it up
              </h1>

              {/* Difficulty */}
              <div className="card-pop p-6 mb-4">
                <label className="font-display font-bold text-sm block mb-3" style={{ color: 'var(--text-secondary)' }}>Difficulty</label>
                <div className="flex gap-3">
                  {(['easy', 'standard', 'hard'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className="flex-1 py-3 rounded-xl font-body font-bold text-sm capitalize transition-all"
                      style={{
                        background: difficulty === d ? 'var(--gum-500)' : 'rgba(114, 46, 209, 0.06)',
                        color: difficulty === d ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question count + time */}
              <div className="card-pop p-6 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-display font-bold text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Questions</label>
                    <input type="number" min={3} max={30} value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className="input-pop" />
                  </div>
                  <div>
                    <label className="font-display font-bold text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Seconds / question</label>
                    <input type="number" min={10} max={120} value={timePerQuestion} onChange={e => setTimePerQuestion(Number(e.target.value))} className="input-pop" />
                  </div>
                </div>
              </div>

              {/* Question types */}
              <div className="card-pop p-6 mb-4">
                <label className="font-display font-bold text-sm block mb-3" style={{ color: 'var(--text-secondary)' }}>Question Types</label>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => toggleType(t.value)}
                      className="px-4 py-2 rounded-xl font-body font-bold text-sm transition-all"
                      style={{
                        background: selectedTypes.includes(t.value) ? 'var(--grape-500)' : 'rgba(114, 46, 209, 0.06)',
                        color: selectedTypes.includes(t.value) ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game mode */}
              <div className="card-pop p-6 mb-4">
                <label className="font-display font-bold text-sm block mb-3" style={{ color: 'var(--text-secondary)' }}>Game Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {GAME_MODES.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setGameMode(m.value)}
                      className="p-4 rounded-xl text-left transition-all"
                      style={{
                        background: gameMode === m.value ? 'linear-gradient(135deg, var(--gum-500), var(--grape-500))' : 'rgba(114, 46, 209, 0.06)',
                        color: gameMode === m.value ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <div className="font-display font-bold text-sm mt-1">{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Battle config */}
              {gameMode === 'team-battle' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card-pop p-6 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="font-display font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>Teams</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const names = playerCap >= 4 ? ['Team A', 'Team B', 'Team C', 'Team D'] : ['Team A', 'Team B']
                          setTeamNames(names)
                        }}
                        className="text-xs font-body font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(114, 46, 209, 0.06)', color: 'var(--text-secondary)' }}
                      >
                        Preset
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {teamNames.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className="input-pop text-sm flex-1"
                          value={name}
                          onChange={e => {
                            const next = [...teamNames]
                            next[i] = e.target.value
                            setTeamNames(next)
                          }}
                          placeholder={`Team ${String.fromCharCode(65 + i)}`}
                        />
                        {teamNames.length > 2 && (
                          <button
                            onClick={() => setTeamNames(teamNames.filter((_, j) => j !== i))}
                            className="text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {teamNames.length < 4 && (
                    <button
                      onClick={() => setTeamNames([...teamNames, `Team ${String.fromCharCode(65 + teamNames.length)}`])}
                      className="mt-2 text-xs font-body font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}
                    >
                      + Add Team
                    </button>
                  )}
                </motion.div>
              )}

              {/* Territory config */}
              {gameMode === 'territory' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card-pop p-6 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-display font-bold text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Rounds</label>
                      <input type="number" min={1} max={10} value={territoryRounds} onChange={e => setTerritoryRounds(Number(e.target.value))} className="input-pop" />
                    </div>
                    <div>
                      <label className="font-display font-bold text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Questions / round</label>
                      <input type="number" min={1} max={5} value={territoryQPerRound} onChange={e => setTerritoryQPerRound(Number(e.target.value))} className="input-pop" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Player cap */}
              <div className="card-pop p-6 mb-4">
                <label className="font-display font-bold text-sm block mb-2" style={{ color: 'var(--text-secondary)' }}>Max Players (1–20)</label>
                <input type="number" min={1} max={20} value={playerCap} onChange={e => setPlayerCap(Math.min(20, Math.max(1, Number(e.target.value))))} className="input-pop" />
              </div>

              {/* Theme */}
              <div className="card-pop p-6 mb-6">
                <label className="font-display font-bold text-sm block mb-3" style={{ color: 'var(--text-secondary)' }}>Theme</label>
                <div className="flex flex-wrap gap-3">
                  {THEMES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl font-body font-bold text-sm transition-all"
                      style={{
                        background: theme === t.value ? 'rgba(114, 46, 209, 0.1)' : 'rgba(114, 46, 209, 0.04)',
                        border: theme === t.value ? `2px solid ${t.color}` : '2px solid transparent',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold mb-4" style={{ color: '#EF4444' }}>
                  {error}
                </motion.p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-grape flex-1">Back</button>
                <button onClick={handleGenerate} className="btn-gum flex-[2]">Generate Questions</button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Loading */}
          {step === 2 && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-6xl mb-6"
              >
                🫧
              </motion.div>
              <h2 className="font-display text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Cooking up questions...
              </h2>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMessage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="font-body font-semibold text-center"
                  style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
                >
                  {loadingMessage}
                </motion.p>
              </AnimatePresence>
              <motion.div
                className="mt-6 w-64 h-2"
                style={{ background: 'rgba(114, 46, 209, 0.1)' }}
              >
                <motion.div
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, var(--gum-500), var(--grape-500))' }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                />
              </motion.div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Review your quiz
              </h1>
              <p className="font-body font-semibold mb-8" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                {questions.length} questions ready. Edit, delete, or reorder.
              </p>

              <div className="space-y-4 mb-8">
                {questions.map((q, i) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card-pop p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="font-display text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(255, 45, 138, 0.1)', color: 'var(--gum-500)' }}>
                        Q{i + 1} · {q.type}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => moveQuestion(i, i - 1)} className="p-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(114, 46, 209, 0.06)', color: 'var(--text-secondary)' }}>↑</button>
                        <button onClick={() => moveQuestion(i, i + 1)} className="p-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(114, 46, 209, 0.06)', color: 'var(--text-secondary)' }}>↓</button>
                        <button onClick={() => deleteQuestion(i)} className="p-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>✕</button>
                      </div>
                    </div>

                    <input
                      className="input-pop mb-3 text-sm"
                      value={q.question}
                      onChange={e => updateQuestion(i, 'question', e.target.value)}
                    />

                    {q.options && (
                      <div className="space-y-2 mb-3">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              className="input-pop text-sm flex-1"
                              value={opt}
                              onChange={e => {
                                const opts = [...(q.options || [])]
                                opts[oi] = e.target.value
                                updateQuestion(i, 'options', opts)
                              }}
                            />
                            <button
                              onClick={() => updateQuestion(i, 'correctAnswer', opt)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0"
                              style={{
                                background: q.correctAnswer === opt || (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt))
                                  ? '#10B981' : 'rgba(114, 46, 209, 0.06)',
                                color: q.correctAnswer === opt || (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt))
                                  ? 'white' : 'var(--text-secondary)',
                              }}
                            >
                              ✓
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'fill-blank' && (
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          className="input-pop text-sm flex-1"
                          value={String(q.correctAnswer)}
                          onChange={e => updateQuestion(i, 'correctAnswer', e.target.value)}
                          placeholder="Correct answer"
                        />
                        <label className="flex items-center gap-2 font-body font-bold text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={q.strictMatch || false}
                            onChange={e => updateQuestion(i, 'strictMatch', e.target.checked)}
                            className="w-4 h-4"
                          />
                          Strict
                        </label>
                      </div>
                    )}

                    <input
                      className="input-pop text-sm"
                      value={q.explanation}
                      onChange={e => updateQuestion(i, 'explanation', e.target.value)}
                      placeholder="Explanation (shown after answer)"
                    />
                  </motion.div>
                ))}
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold mb-4" style={{ color: '#EF4444' }}>
                  {error}
                </motion.p>
              )}

              <button onClick={handleCreateRoom} className="btn-gum w-full text-lg">
                Create Room
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
