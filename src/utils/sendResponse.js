import logger from './winston.logger.js';

export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

export const sendError = (res, error, message = 'Something went wrong', statusCode = 500) => {
    logger.error(message, error); // helpful for debugging
    return res.status(statusCode).json({
        success: false,
        message,
        error: error?.message || error,
    });
};
