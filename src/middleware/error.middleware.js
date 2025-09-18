import { sendError } from '../utils/sendResponse.js';
import logger from '../utils/winston.logger.js';

export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error(err);

    // Prisma errors
    if (err.code === 'P2002') {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }

    // Prisma validation errors
    if (err.code === 'P2025') {
        const message = 'Resource not found';
        error = { message, statusCode: 404 };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { message, statusCode: 401 };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = { message, statusCode: 401 };
    }

    return sendError(res, error, error.message || 'Server Error', 500);
};
