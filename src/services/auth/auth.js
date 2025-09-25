import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, hashToken, setCookie, verifyRefreshToken } from "../../utils/auth.utils.js";

export async function handleRefreshToken(req, res) {
    let refreshToken = req.cookies?.refreshToken;

    if (!refreshToken && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            refreshToken = authHeader.split(' ')[1];
        }
    }

    if (!refreshToken) {
        throw new Error('No refresh token provided');
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
        throw new Error('Invalid or expired refresh token');
    }

    const userId = decoded.userId;

    // Get all sessions for the user
    const sessions = await prisma.userSession.findMany({
        where: { userId },
    });

    if (!sessions || sessions.length === 0) {
        throw new Error('No sessions found');
    }

    // Find the session that matches this refresh token
    let session = null;
    for (const sess of sessions) {
        const isValidToken = await bcrypt.compare(refreshToken, sess.refreshToken);
        if (isValidToken) {
            session = sess;
            break;
        }
    }

    if (!session) {
        throw new Error('Session not found');
    }

    const isValidToken = await bcrypt.compare(refreshToken, session.refreshToken);
    if (!isValidToken) {
        throw new Error('Refresh token mismatch');
    }

    if (session.refreshTokenExp && new Date() > new Date(session.refreshTokenExp).getTime()) {
        throw new Error('Refresh token expired');
    }

    const parser = new UAParser(req.headers['user-agent']);
    const ua = parser.getResult();

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    const timeZone = geo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    console.log(`User's time zone: ${timeZone}`);
    const serverDefaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`Server's default time zone: ${serverDefaultTimeZone}`);
    console.log(`Current time in user's time zone: ${new Date()}`);

    const newRefreshToken = generateRefreshToken(userId);
    const newHashedRefreshToken = await hashToken(newRefreshToken);
    
    await prisma.userSession.update({
        where: { id: session.id },
        data: {
            device: ua.device.model || 'Unknown',
            os: ua.os.name || 'Unknown',
            browser: ua.browser.name || 'Unknown',
            location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
            ipAddress: ip,
            timeZone: timeZone,
            refreshToken: newHashedRefreshToken,
            refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            lastActive: new Date(),
        },
    });
    const newAccessToken = generateAccessToken(userId, decoded.role, timeZone, session.id);

    setCookie(res, 'refreshToken', newRefreshToken, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    setCookie(res, 'accessToken', newAccessToken, {
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, timeZone };
}
