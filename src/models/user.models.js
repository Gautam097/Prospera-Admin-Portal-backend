import prisma from '../lib/prisma.js';

export async function getUserMfaSecret(email) {
    try {
        if (!email || typeof email !== 'string') {
            throw new Error('Invalid email provided');
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { mfaSecret: true },
        });

        return user?.mfaSecret || null;
    } catch (error) {
        console.error('Error fetching MFA secret:', error);
        throw new Error('Failed to fetch MFA secret');
    }
}
