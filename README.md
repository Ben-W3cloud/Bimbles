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
