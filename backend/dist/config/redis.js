"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';
const redisClient = new ioredis_1.default(redisUrl);
exports.redisClient = redisClient;
redisClient.on('connect', () => {
    logger_1.logger.info('Connected to Redis');
});
redisClient.on('error', (err) => {
    logger_1.logger.error('Redis error:', err);
});
//# sourceMappingURL=redis.js.map