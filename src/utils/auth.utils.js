import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const accessSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

export const generateAccessToken = (userId, role, timeZone, sessionId) => {
    return jwt.sign({ userId, role, timeZone, sessionId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
};

export const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    });
};

export const hashToken = async (token) => {
    return await bcrypt.hash(token, 10);
};

export const compareHashedToken = async (token, hashedToken) => {
    return await bcrypt.compare(token, hashedToken);
};

export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
        console.error('Invalid refresh token:', err.message);
        return null;
    }
}

export function setCookie(res, name, value, options = {}) {
    const defaultOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // Default: 7 days
    };

    const cookieOptions = { ...defaultOptions, ...options };

    res.cookie(name, value, cookieOptions);
}
