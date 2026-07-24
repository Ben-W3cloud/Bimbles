// ── API routes ──

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Groq from 'groq-sdk'
import { createHash } from 'node:crypto'
import type { Question, RoomConfig } from './types.js'
import * as Room from './room.js'
import { redis } from './redis.js'
import { checkAiRateLimit, checkRoomRateLimit } from './rateLimiter.js'
import { aiRequests, roomCreations, questionsGenerated } from './metrics.js'

const app = new Hono()

app.use('/*', cors())

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'none' })
const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

// Helper to generate cache key
function generateCacheKey(text: string, count: number, difficulty: string, types: string[]): string {
  const keyString = `${text.slice(0, 1000)}:${count}:${difficulty}:${types.sort().join(',')}`
  return `ai:gen:${createHash('sha256').update(keyString).digest('hex')}`
}

// Fallback question generator
function generateFallbackQuestions(text: string, count: number, difficulty: string, types: string[]): Question[] {
  const questions: Question[] = []
  const words = text.split(/\s+/).filter(w => w.length > 3)
  
  for (let i = 0; i < Math.min(count, 10); i++) {
    const word = words[i % words.length]
    const questionType = types[0] || 'multiple-choice'
    
    if (questionType === 'multiple-choice') {
      questions.push({
        id: `fallback-${i}`,
        type: 'multiple-choice',
        question: `What is ${word}?`,
        options: [word, `Not ${word}`, 'Something else', 'Another thing'],
        correctAnswer: word,
        explanation: 'This is a fallback question generated when AI was unavailable.',
        difficulty: difficulty,
      })
    } else if (questionType === 'true-false') {
      questions.push({
        id: `fallback-${i}`,
        type: 'true-false',
        question: `Is ${word} a real word?`,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Fallback true/false question.',
        difficulty: difficulty,
      })
    } else {
      questions.push({
        id: `fallback-${i}`,
        type: 'multiple-choice',
        question: `What is ${word}?`,
        options: [word, `Not ${word}`, 'Something else', 'Another thing'],
        correctAnswer: word,
        explanation: 'Fallback question.',
        difficulty: difficulty,
      })
    }
  }
  
  return questions
}

// Generate questions from text
app.post('/api/generate', async (c) => {
  const body = await c.req.json()
  const { text, count, difficulty, types } = body as {
    text: string
    count: number
    difficulty: string
    types: string[]
  }

  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  
  // Rate limiting
  if (!checkAiRateLimit(ip)) {
    return c.json({ error: 'Too many AI requests. Please wait a minute.' }, 429)
  }

  const cacheKey = generateCacheKey(text, count, difficulty, types)
  
  // Check cache first
  let cached: string | null = null
  try {
    cached = await redis.get(cacheKey)
  } catch (err) {
    console.error('Redis cache read failed, proceeding without cache:', err)
  }
  if (cached) {
    aiRequests.inc({ model: 'cached', status: 'hit' })
    return c.json(JSON.parse(cached))
  }

  const generateCount = Math.min(count + 3, 30)
  
  // Models to try in order
  const modelsToTry = [
    model,
    'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768',
  ]

  let questions: Question[] = []
  let lastError: any = null

  // Try each model with retry
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const currentModel = modelsToTry[attempt]
      const completion = await groq.chat.completions.create({
        model: currentModel,
        messages: [
          {
            role: 'system',
            content: 'Return ONLY a valid JSON array of quiz questions. No markdown, no preamble, no explanation. Each object must have: id (string), type (string), question (string), options (string array for multiple-choice/true-false, omit for fill-blank), correctAnswer (string or string array), explanation (string), difficulty (string). For true-false, options must be ["True", "False"]. For fill-blank, correctAnswer is a string. For multiple-select, correctAnswer is an array of strings. For ordering, include an "order" array. For match-pairs, include a "pairs" array with {left, right} objects.',
          },
          {
            role: 'user',
            content: `Generate ${generateCount} quiz questions from the following content. Difficulty: ${difficulty}. Types to include: ${types.join(', ')}. English only. Return ONLY the JSON array.

Content:
${text.slice(0, 6000)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      })

      const content = completion.choices[0]?.message?.content || '[]'
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      questions = JSON.parse(cleaned)
      
      // Validate
      if (Array.isArray(questions) && questions.length > 0) {
        aiRequests.inc({ model: currentModel, status: 'success' })
        questionsGenerated.inc({ type: types[0] || 'unknown' }, questions.length)
        break
      }
    } catch (err: any) {
      lastError = err
      aiRequests.inc({ model: modelsToTry[attempt], status: 'failed' })
      console.error(`AI generation attempt ${attempt + 1} failed:`, err.message)
      
      // Exponential backoff
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  // Fallback if all attempts failed
  if (questions.length === 0) {
    console.error('All AI attempts failed, using fallback:', lastError)
    questions = generateFallbackQuestions(text, generateCount, difficulty, types)
    aiRequests.inc({ model: 'fallback', status: 'used' })
  }

  // Validate and assign IDs
  const validated = questions.slice(0, generateCount).map((q: any, i) => ({
    ...q,
    id: q.id || `q-${i}-${Date.now()}`,
    difficulty: q.difficulty || difficulty,
    type: q.type || types[0] || 'multiple-choice',
  }))

  // Cache for 24 hours (non-blocking if Redis is down)
  try {
    await redis.setex(cacheKey, 86400, JSON.stringify(validated))
  } catch (err) {
    console.error('Redis cache write failed:', err)
  }

  return c.json(validated.slice(0, count))
})

// Create room
app.post('/api/room/create', async (c) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  
  // Rate limiting
  if (!checkRoomRateLimit(ip)) {
    return c.json({ error: 'Too many rooms created. Please wait a minute.' }, 429)
  }

  const body = await c.req.json()
  const { config, questions, hostToken } = body as {
    config: RoomConfig
    questions: Question[]
    hostToken: string
  }

  const room = Room.createRoom(hostToken, config, questions)
  roomCreations.inc({ mode: config.gameMode })
  return c.json({ code: room.code })
})

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', time: Date.now() }))

export default app
