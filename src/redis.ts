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
