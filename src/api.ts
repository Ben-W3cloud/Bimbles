// ── API routes ──

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Groq from 'groq-sdk'
import type { Question, RoomConfig } from './types.js'
import * as Room from './room.js'

const app = new Hono()

app.use('/*', cors())

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'none' })
const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

// Generate questions from text
app.post('/api/generate', async (c) => {
  const body = await c.req.json()
  const { text, count, difficulty, types } = body as {
    text: string
    count: number
    difficulty: string
    types: string[]
  }

  const generateCount = Math.min(count + 3, 30)

  try {
    const completion = await groq.chat.completions.create({
      model,
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
    const questions: Question[] = JSON.parse(cleaned)

    // Validate and assign IDs
    const validated = questions.map((q, i) => ({
      ...q,
      id: q.id || `q-${i}-${Date.now()}`,
      difficulty: q.difficulty || difficulty,
    }))

    return c.json(validated)
  } catch (err: any) {
    console.error('Groq error:', err.message)
    return c.json({ error: 'Failed to generate questions', details: err.message }, 500)
  }
})

// Create room
app.post('/api/room/create', async (c) => {
  const body = await c.req.json()
  const { config, questions, hostToken } = body as {
    config: RoomConfig
    questions: Question[]
    hostToken: string
  }

  const room = Room.createRoom(hostToken, config, questions)
  return c.json({ code: room.code })
})

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', time: Date.now() }))

export default app
