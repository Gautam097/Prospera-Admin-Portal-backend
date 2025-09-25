import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import logger from '../utils/winston.logger.js';
import { sendError } from '../utils/sendResponse.js';
import { handleRefreshToken } from '../services/auth/auth.js';

export async function userAuth(req, res, next) {
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

        // Decode to check expiry
        const decoded = jwt.decode(token);
        if (!decoded) {
            return sendError(res, null, 'Invalid token', 401);
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        // Auto-refresh if within 5 minutes of expiry
        if (expiresIn <= 5 * 60) {
            try {
                console.log('Auto-refreshing token');

                const refreshed = await handleRefreshToken(req, res);
                token = refreshed.accessToken;
            } catch (err) {
                return sendError(res, null, 'Token refresh failed', 401);
            }
        }

        // Verify token properly
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const { userId, sessionId } = verified;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return sendError(res, null, 'User not found', 401);
        }

        // 2. Set the current session to true and update lastActive
        await prisma.userSession.update({
            where: {
                id: sessionId,
            },
            data: {
                lastActive: new Date()
            },
        })

        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return sendError(res, error.message, 'Authentication failed', 401);
    }
}

// Ensure user is authenticated & has ADMIN role
export async function adminAuth(req, res, next) {
  try {
    // userAuth should already have run before this, so req.user must exist
    if (!req.user || !req.user.userId) {
      return sendError(res, null, 'Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user) {
      return sendError(res, null, 'User not found', 404);
    }

    if (!user.isActive) {
      return sendError(res, null, 'User account is inactive', 403);
    }

    if (user.role !== 'ADMIN') {
      return sendError(res, null, 'Forbidden: Admin access required', 403);
    }

    // Passed checks → continue
    req.admin = user; // optional: attach admin info
    next();
  } catch (error) {
    return sendError(res, error.message, 'Admin authentication failed', 500);
  }
}
