# Bimbles Complete Task Plan

## Task List (Execute in Order)

---

### 1. Create `.gitignore`
**File:** `/.gitignore`
**Purpose:** Prevent unnecessary files from being committed to version control
**Content:**
```gitignore
# Dependencies
node_modules/
bun.lockb

# Build outputs
client/dist/
*.log

# IDE
.idea/
.vscode/
*.swp
*.swo
*.sublime-workspace
*.sublime-project

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Temporary files
*.tmp
*.temp

# Test coverage
coverage/

# Bun lockfile
bun.lock

# Editor
*.un~ 
```

---

### 2. Create `README.md`
**File:** `/README.md`
**Purpose:** Complete product documentation for users and developers
**Content:**
```markdown
# 🎉 Bimbles

> Pop your brain. Share the fun.

[![Bun](https://img.shields.io/badge/Bun-1.x-000?logo=bun)](https://bun.sh)
[![Hono](https://img.shields.io/badge/Hono-4.x-000?logo=hono)](https://hono.dev)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Bimbles is a **free, real-time multiplayer quiz platform** that lets you create AI-powered quizzes from any text or PDF in seconds. Share a link, play together, no accounts required.

## ✨ Features

### 🎮 Game Modes
- **Sprint** - Fast-paced quiz, no elimination, pure speed
- **Battle Royale** - 2 lives each, wrong answer eliminates you
- **Team Battle** - Squad up, combined scores win
- **Territory** - Claim zones by answering correctly, defend your turf

### 📝 Question Types
- Multiple Choice
- True/False
- Fill-in-the-Blank (with fuzzy matching)
- Multiple Select
- Poll (non-scored)
- Ordering
- Match Pairs

### 🚀 Real-Time Features
- WebSocket-based live updates
- Live countdown timers
- Real-time leaderboard
- Player reactions with emojis
- Spectator mode
- Reconnect-safe (rejoin with same name)

### 🤖 AI Powered
- Generate questions from any text
- Upload PDFs for automatic quiz creation
- Configurable difficulty (easy, standard, hard)
- Select question types
- Generate up to 30 questions per request

### 🎨 Themes
- Default
- Halloween
- Christmas
- World Cup
- Valentine
- Corporate

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/bimbles.git
cd bimbles

# Build and run with Docker
docker build -t bimbles .
docker run -p 3000:3000 \
  -e GROQ_API_KEY=your_groq_api_key \
  -e PORT=3000 \
  bimbles

# Or with docker-compose
docker-compose up -d
```

### Local Development
```bash
# Backend (terminal 1)
cd bimbles
bun install
bun run src/index.ts

# Frontend (terminal 2)
cd client
npm install
npm run dev

# Open http://localhost:3000
```

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh) 1.x |
| Backend Framework | [Hono](https://hono.dev) 4.x |
| WebSocket | Bun native |
| AI | [Groq SDK](https://groq.com) |
| Frontend Framework | [React](https://react.dev) 18.x |
| Router | React Router DOM 6.x |
| State Management | [Zustand](https://zustand.docs.pmnd.rs) 5.x |
| Animations | [Framer Motion](https://framer.com/motion) 11.x |
| Styling | [Tailwind CSS](https://tailwindcss.com) 3.x |
| Build Tool | [Vite](https://vitejs.dev) 6.x |
| PDF Parsing | pdfjs-dist |
| QR Codes | qrcode.react |

## 🎯 How It Works

1. **Create** - Paste any text or upload a PDF. Our AI generates a quiz in seconds. Customize settings.
2. **Share** - Get a unique room code and link. Share via URL or QR code. Anyone can join.
3. **Play** - Players join, host starts the game. Answer fast, score big. Watch the live leaderboard.

## 🔧 Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `PORT` | Server port | 3000 |
| `GROQ_API_KEY` | Groq API key (required) | - |
| `GROQ_MODEL` | Groq model to use | llama-3.3-70b-versatile |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 |
| `MAX_ROOMS_PER_IP` | Max rooms per IP | 10 |
| `MAX_AI_REQUESTS_PER_MINUTE` | Max AI requests per minute | 20 |

## 📁 Project Structure

```
bimbles/
├── src/
│   ├── index.ts          # Server entry (Bun + Hono + WebSocket)
│   ├── api.ts            # HTTP API routes
│   ├── room.ts           # Room state management
│   ├── types.ts          # TypeScript types
│   ├── scoring.ts        # Score calculation
│   └── redis.ts          # Redis client
│
├── client/
│   ├── src/
│   │   ├── pages/        # Landing, Create, Room
│   │   ├── components/   # UI components
│   │   ├── store/         # Zustand state
│   │   └── utils/        # WebSocket, API, types
│   └── ...
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

## 🚢 Deployment

### Docker (Any Platform)
```bash
docker build -t bimbles .
docker run -d -p 3000:3000 \
  -e GROQ_API_KEY=your_key \
  --name bimbles \
  bimbles
```

### Fly.io
```bash
fly launch
fly secrets set GROQ_API_KEY=your_key
fly deploy
```

### Railway
```bash
railway init
railway add secret GROQ_API_KEY=your_key
railway up
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is [MIT licensed](https://opensource.org/licenses/MIT).

---

Made with ❤️ and Bun. Pop your brain!
```

---

### 3. Add Dependencies to `package.json`
**File:** `/package.json`
**Action:** Add backend dependencies for optimizations
**Changes:**
```json
{
  "dependencies": {
    "hono": "^4.12.31",
    "groq-sdk": "^0.8.0",
    "ioredis": "^5.3.2",
    "limiter": "^3.0.0",
    "prom-client": "^14.2.0"
  }
}
```
**Then run:** `bun install`

---

### 4. Create `src/redis.ts`
**File:** `/src/redis.ts`
**Purpose:** Singleton Redis client for caching and room state
**Content:**
```typescript
// Redis client singleton for Bimbles
import { Redis } from 'ioredis';

// Create Redis client with connection retry
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => {
    return Math.min(times * 100, 5000);
  },
  enableOfflineQueue: true,
});

// Graceful shutdown
process.on('SIGINT', () => {
  redis.quit();
  process.exit();
});

process.on('SIGTERM', () => {
  redis.quit();
  process.exit();
});

export { redis };
```

---

### 5. Create `src/rateLimiter.ts`
**File:** `/src/rateLimiter.ts`
**Purpose:** Rate limiting for rooms, AI requests, and WebSocket connections
**Content:**
```typescript
// Rate limiting for Bimbles
import { RateLimiter } from 'limiter';

// Room creation: 5 per minute per IP
export const roomLimiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: 'minute',
});

// AI generation: 20 per minute per IP
export const aiLimiter = new RateLimiter({
  tokensPerInterval: 20,
  interval: 'minute',
});

// WebSocket connections: track per IP
const wsConnections = new Map<string, number>();

export function incrementWsConnection(ip: string): number {
  const count = (wsConnections.get(ip) || 0) + 1;
  wsConnections.set(ip, count);
  return count;
}

export function decrementWsConnection(ip: string): void {
  const count = (wsConnections.get(ip) || 0) - 1;
  if (count <= 0) {
    wsConnections.delete(ip);
  } else {
    wsConnections.set(ip, count);
  }
}

export function getWsConnectionCount(ip: string): number {
  return wsConnections.get(ip) || 0;
}
```

---

### 6. Create `src/metrics.ts`
**File:** `/src/metrics.ts`
**Purpose:** Prometheus metrics for monitoring server health
**Content:**
```typescript
// Prometheus metrics for Bimbles
import { collectDefaultMetrics, Counter, Gauge, Registry } from 'prom-client';

// Enable default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register: new Registry() });

// Custom metrics
export const activeRooms = new Gauge({
  name: 'bimbles_active_rooms',
  help: 'Number of active game rooms',
  labelNames: [],
});

export const activeConnections = new Gauge({
  name: 'bimbles_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: [],
});

export const aiRequests = new Counter({
  name: 'bimbles_ai_requests_total',
  help: 'Total AI generation requests',
  labelNames: ['model', 'status'],
});

export const roomCreations = new Counter({
  name: 'bimbles_rooms_created_total',
  help: 'Total rooms created',
  labelNames: ['mode'],
});

export const questionsGenerated = new Counter({
  name: 'bimbles_questions_generated_total',
  help: 'Total questions generated by AI',
  labelNames: ['type'],
});

export const registry = new Registry();
```

---

### 7. Create `client/src/components/InteractiveDemo.tsx`
**File:** `/client/src/components/InteractiveDemo.tsx`
**Purpose:** Animated demo showing how answering works (green for correct, red for wrong)
**Content:**
```tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEMO_QUESTIONS = [
  {
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
  },
  {
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
  },
  {
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
  },
];

export default function InteractiveDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentQuestion = DEMO_QUESTIONS[currentIndex];

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) return;
    
    setSelectedIndex(index);
    const correct = index === currentQuestion.correctIndex;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(s => s + 1);
    }
  };

  useEffect(() => {
    if (selectedIndex !== null) {
      const timer = setTimeout(() => {
        if (currentIndex < DEMO_QUESTIONS.length - 1) {
          setCurrentIndex(i => i + 1);
          setSelectedIndex(null);
          setIsCorrect(null);
        } else {
          // Last question - reset after delay
          setTimeout(() => {
            setCurrentIndex(0);
            setSelectedIndex(null);
            setIsCorrect(null);
            setScore(0);
          }, 2000);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [selectedIndex, currentIndex]);

  const resetDemo = () => {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setIsCorrect(null);
    setScore(0);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Score display */}
      <div className="flex justify-between items-center mb-6">
        <span className="font-display font-bold" style={{ color: 'var(--gum-500)' }}>
          Question {currentIndex + 1}/{DEMO_QUESTIONS.length}
        </span>
        <span className="font-display font-bold" style={{ color: 'var(--grape-500)' }}>
          Score: {score}
        </span>
      </div>

      {/* Question */}
      <motion.h3
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="font-display text-xl font-bold mb-6 text-center"
        style={{ color: 'var(--text-primary)' }}
      >
        {currentQuestion.question}
      </motion.h3>

      {/* Options */}
      <div className="grid gap-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectAnswer = index === currentQuestion.correctIndex;
          const showFeedback = selectedIndex !== null;
          
          let className = 'option-btn transition-all duration-200';
          
          if (showFeedback) {
            if (isSelected && isCorrectAnswer) {
              className += ' correct';
            } else if (isSelected && !isCorrectAnswer) {
              className += ' wrong';
            } else if (isCorrectAnswer) {
              className += ' correct-hint';
            }
          }

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className={className}
              disabled={selectedIndex !== null}
              onClick={() => handleSelect(index)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                scale: isSelected ? (isCorrectAnswer ? [1, 1.05, 1] : [1, 0.95, 1]) : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {option}
              {showFeedback && isCorrectAnswer && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="correct-badge"
                >
                  ✓
                </motion.span>
              )}
              {showFeedback && isSelected && !isCorrectAnswer && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="wrong-badge"
                >
                  ✗
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Reset button (appears after last question) */}
      <AnimatePresence>
        {selectedIndex !== null && currentIndex === DEMO_QUESTIONS.length - 1 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={resetDemo}
            className="btn-gum w-full mt-6"
          >
            Try Again
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
```
**CSS to add to `client/src/index.css`:**
```css
/* Interactive Demo Styles */
.option-btn {
  position: relative;
  overflow: hidden;
}

.option-btn.correct {
  background-color: var(--mint-400) !important;
  color: white !important;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
  animation: pulse-green 0.5s ease;
}

.option-btn.wrong {
  background-color: var(--coral-400) !important;
  color: white !important;
  box-shadow: 0 0 20px rgba(255, 69, 58, 0.4);
  animation: shake 0.5s ease;
}

.option-btn.correct-hint {
  border: 2px solid var(--mint-400);
  background-color: rgba(0, 255, 136, 0.1);
}

.correct-badge, .wrong-badge {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.correct-badge {
  background-color: var(--mint-400);
  color: white;
}

.wrong-badge {
  background-color: var(--coral-400);
  color: white;
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
```

---

### 8. Modify `client/src/pages/Landing.tsx`
**File:** `/client/src/pages/Landing.tsx`
**Action:** Add 