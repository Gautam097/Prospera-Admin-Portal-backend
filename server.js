import app from './src/app.js';
import prisma from './src/config/database.js';
import logger from './src/utils/winston.logger.js';
import dotenv from 'dotenv';

dotenv.config();
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await prisma.$connect();
        logger.info('Connected to the database with Prisma');

        app.listen(PORT, () => {
            logger.info(
                `Server running on port ${PORT} in ${process.env.NODE_ENV} mode: ${process.env.APP_URL}`
            );
        });
    } catch (error) {
        logger.error('Failed to connect to the database:', error);
        process.exit(1);
    }
}

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
    });
});
