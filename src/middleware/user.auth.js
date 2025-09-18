import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import logger from '../utils/winston.logger.js';
import { sendError } from '../utils/sendResponse.js';

export default async function userAuth(req, res, next) {
    try {
        // Extract token from Authorization header or cookie
        let token;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return sendError(res, null, 'No token provided', 401);
        }

        // Verify JWT
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const { userId } = decodedToken;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            logger.error('User not found');
            return sendError(res, null, 'User not found', 401);
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return sendError(res, error, 'Authentication failed', 401);
    }
}
