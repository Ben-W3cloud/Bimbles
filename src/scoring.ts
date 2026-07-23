// ── Scoring logic ──

export function calculateScore(elapsed: number, timeLimit: number, correct: boolean): number {
  if (!correct) return 0
  if (elapsed < 5) return 970
  if (elapsed >= timeLimit) return 500
  return Math.max(500, Math.round(970 - ((elapsed - 5) / (timeLimit - 5)) * 470))
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[m][n]
}

export function checkAnswer(
  given: string | string[],
  correct: string | string[],
  type: string,
  strictMatch?: boolean
): boolean {
  if (type === 'poll') return true

  if (type === 'fill-blank') {
    const g = String(given).toLowerCase().trim()
    const c = String(correct).toLowerCase().trim()
    if (strictMatch) return g === c
    return g === c || levenshtein(g, c) <= 2
  }

  if (type === 'multiple-select') {
    const gArr = Array.isArray(given) ? given.map(s => String(s).toLowerCase().trim()).sort() : []
    const cArr = Array.isArray(correct) ? correct.map(s => String(s).toLowerCase().trim()).sort() : []
    return gArr.length === cArr.length && gArr.every((v, i) => v === cArr[i])
  }

  if (type === 'ordering') {
    const gArr = Array.isArray(given) ? given : [String(given)]
    const cArr = Array.isArray(correct) ? correct : [String(correct)]
    return gArr.length === cArr.length && gArr.every((v, i) => v === cArr[i])
  }

  if (type === 'match-pairs') {
    return JSON.stringify(given) === JSON.stringify(correct)
  }

  // multiple-choice, true-false
  return String(given).toLowerCase().trim() === String(correct).toLowerCase().trim()
}
