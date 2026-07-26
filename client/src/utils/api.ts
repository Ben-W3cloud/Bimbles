// ── API client ──


export async function generateQuestions(
  text: string,
  count: number,
  difficulty: string,
  types: string[]
) {
  const res = await fetch(`/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, count, difficulty, types }),
  })
  if (!res.ok) throw new Error('Failed to generate questions')
  return res.json()
}

export async function createRoom(
  config: any,
  questions: any[],
  hostToken: string
) {
  const res = await fetch(`/api/room/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, questions, hostToken }),
  })
  if (!res.ok) throw new Error('Failed to create room')
  return res.json()
}
