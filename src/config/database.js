import { PrismaClient } from '@prisma/client';
import logger from '../utils/winston.logger.js';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Handle connection events
prisma.$on('query', (e) => {
    logger.debug('Query: ' + e.query);
    logger.debug('Duration: ' + e.duration + 'ms');
});

export default prisma;
