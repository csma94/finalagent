import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl);

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

export { redisClient }; 