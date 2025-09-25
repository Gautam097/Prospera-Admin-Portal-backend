import prisma from '../../lib/prisma.js';
import bcrypt from 'bcrypt';
import logger from '../../utils/winston.logger.js';
import { sendError, sendSuccess } from '../../utils/sendResponse.js';
import {
    compareHashedToken,
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    setCookie,
    verifyRefreshToken,
} from '../../utils/auth.utils.js';
import { validateEmail, validatePassword } from '../../validators/index.js';
import speakeasy from 'speakeasy';
import qrcode from "qrcode";
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import { generateOTP, sendOTPByEmail, sendOTPBySms } from '../../utils/otp.js';
import pkg from 'phone';
import { getDefaultPerferedCurrency } from '../../models/wallet.models.js';
import { generateProsperaId, getTimezone } from '../../utils/index.js';
import { handleRefreshToken } from '../../services/auth/auth.js';
const phone = pkg.default;

export async function registerAdmin(req, res) {
    try {
        const { name, email, phoneNumber, password, dob, address, country, state, zipCode } = req.body;

        if (!name || !email || !phoneNumber || !password || !dob || !address || !country || !state || !zipCode) {
            return sendError(res, "Missing required fields", "Bad Request", 400);
        }

        if (!validateEmail(email)) {
            return sendError(res, "Invalid email format", "Bad Request", 400);
        }

        const existingAdminByEmail = await prisma.user.findFirst({
            where: { email, role: "ADMIN" },
        });
        if (existingAdminByEmail) {
            return sendError(res, "Admin with this email already exists", "Conflict", 409);
        }

        const existingAdminByPhone = await prisma.user.findFirst({
            where: { phoneNumber, role: "ADMIN" },
        });
        if (existingAdminByPhone) {
            return sendError(res, "Admin with this phone number already exists", "Conflict", 409);
        }

        if (!validatePassword(password)) {
            return sendError(
                res,
                "Password must be at least 12 characters long and include at least one letter, one number, and one special character",
                "Weak Password",
                400
            );
        }

        const phoneResult = phone(phoneNumber);
        if (!phoneResult.isValid) {
            return sendError(res, "Invalid phone number format", "Bad Request", 400);
        }

        const hashedPassword = await hashToken(password);
        // const defaultCurrency = await getDefaultPerferedCurrency();

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: "ADMIN",
                name,
                phoneNumber: phoneResult.phoneNumber, // normalized
                // preferredCurrencyId: defaultCurrency.id,
                prosperaId: await generateProsperaId(name),
                mfaSecret: null,
                // set investorType explicitly (cannot be null in your schema)
                investorType: "RETAIL_INVESTOR",
                profile: {
                    create: {
                        dob: new Date(dob),
                        address,
                        country,
                        state,
                        zipCode: zipCode ? Number(zipCode) : null,
                    },
                },
            },
        });

        return sendSuccess(
            res,
            { userId: user.id, email: user.email, role: user.role },
            "Admin registered successfully. MFA setup required."
        );
    } catch (err) {
        logger.error("registerAdmin error:", err);
        return sendError(res, err.message, "Failed to register Admin", 500);
    }
}

export async function setupAdminMFA(req, res) {
    try {
        const { email } = req.body;

        if (!email?.trim()) {
            return sendError(res, "Email is required", "Bad Request", 400);
        }

        // 1. Find the Admin user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "ADMIN") {
            return sendError(res, "Admin user not found", "Not Found", 404);
        }

        // 2. Generate MFA secret
        const mfaSecret = speakeasy.generateSecret({
            name: email,
            issuer: "Prospera Admin Portal", //issuer name shown in authenticator app
        });

        // 3. Convert secret to QR code
        const qrCode = await qrcode.toDataURL(mfaSecret.otpauth_url);

        // 4. Save the secret in DB
        await prisma.user.update({
            where: { email },
            data: { mfaSecret: mfaSecret.base32 },
        });

        // 5. Return QR code to frontend
        return sendSuccess(res, { qrCode }, "Scan this QR code in your authenticator app");
    } catch (err) {
        logger.error("setupAdminMFA error:", err);
        return sendError(res, err.message, "Failed to setup MFA for Admin", 500);
    }
}

/**
 * @swagger
 * /auth/login/init:
 *   post:
 *     tags:
 *       - auth
 *     summary: Initiate login
 *     description: |
 *       Authenticates the user with email and password, and sends a one-time password (OTP) for MFA to their email if credentials are valid.  
 *       Creates a new login session with emailVerified set to true.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass!2024
 *     responses:
 *       '200':
 *         description: OTP sent to email after successful email/password validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 message:
 *                   type: string
 *                   example: OTP sent to your email
 *       '400':
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Invalid credentials or inactive account
 *       '500':
 *         description: Server error during login
 */
export async function loginInit(req, res) {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password) {
            return sendError(
                res,
                "Missing Fields",
                "Email and password are required to login.",
                400
            );
        }

        if (!validateEmail(email)) {
            return sendError(res, "Invalid email format", "Bad Request", 400);
        }

        // Find only Admin user by email
        const user = await prisma.user.findFirst({
            where: {
                email,
                role: "ADMIN",
            },
            include: { profile: true },
        });

        if (!user || !user.isActive) {
            return sendError(res, "Invalid Credentials", "Incorrect email or password", 401);
        }

        const isPasswordValid = await compareHashedToken(password, user.password);
        if (!isPasswordValid) {
            return sendError(res, "Invalid Credentials", "Incorrect email or password.", 401);
        }

        // Cleanup unverified login sessions
        await prisma.loginSession.deleteMany({
            where: { email, mfaVerified: false },
        });

        // Create loginSession (without MFA yet)
        await prisma.loginSession.create({
            data: {
                email,
                emailVerified: true,
            },
        });

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const timezone = getTimezone(req);
        const resultEmail = await sendOTPByEmail(email, otp, expiresAt, "LOGIN", timezone);
        const resultSms = await sendOTPBySms(user.phoneNumber, otp, expiresAt, "LOGIN", timezone);

        if (!resultEmail.success && !resultSms.success) {
            return sendError(res, "Failed to send OTP", "Email/SMS Error", 500);
        }

        // Save OTP
        await prisma.userOtp.upsert({
            where: {
                email_phone_purpose_unique: {
                    email,
                    phoneNumber: user.phoneNumber,
                    purpose: "LOGIN",
                },
            },
            update: {
                code: otp,
                expiresAt,
                createdAt: new Date(),
            },
            create: {
                email,
                phoneNumber: user.phoneNumber,
                code: otp,
                expiresAt,
                purpose: "LOGIN",
            },
        });

        return sendSuccess(res, null, "OTP sent to your email");
    } catch (err) {
        logger.error("loginInit error:", err);
        return sendError(res, err.message, "Login failed", 500);
    }
}


/**
 * @swagger
 * /auth/login/resend-otp:
 *   post:
 *     tags:
 *       - auth
 *     summary: Resend login OTP
 *     description: |
 *       Resends the OTP for login if a valid session exists and an OTP hasn’t been sent recently (within 30 seconds).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *     responses:
 *       '200':
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 message:
 *                   type: string
 *                   example: OTP resent to your email
 *       '400':
 *         description: Invalid or missing email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: No valid login session found
 *       '429':
 *         description: Too many requests (OTP recently sent)
 *       '500':
 *         description: Server error while resending OTP
 */
export async function resendLoginOtp(req, res) {
    try {
        const { email } = req.body;

        if (!email?.trim()) {
            return sendError(res, 'Missing Email', 'Email is required.', 400);
        }

        if (!validateEmail(email)) {
            return sendError(res, 'Invalid email format', 'Bad Request', 400);
        }

        // Find only Admin user by email
        const user = await prisma.user.findUnique({
            where: {
                email,
                role: "ADMIN",
            }
        });

        if (!user) {
            return sendError(res, 'User not found', 'Unauthorized', 401);
        }

        const phoneNumber = user.phoneNumber;

        const session = await prisma.loginSession.findFirst({
            where: {
                email,
                emailVerified: true,
                otpVerified: false,
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!session) {
            return sendError(
                res,
                'No valid login session found',
                'Please initiate login again.',
                401
            );
        }

        const existingOtp = await prisma.userOtp.findFirst({
            where: {
                email,
                phoneNumber,
                purpose: 'LOGIN',
            },
            orderBy: { createdAt: 'desc' },
        });

        if (existingOtp && new Date(existingOtp.createdAt).getTime() > Date.now() - 30 * 1000) {
            return sendError(
                res,
                'OTP already sent recently',
                'Please wait 30 seconds before resending.',
                429
            );
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const timezone = getTimezone(req);

        const resultEmail = await sendOTPByEmail(email, otp, expiresAt, 'LOGIN', timezone);
        const resultSms = await sendOTPBySms(phoneNumber, otp, expiresAt, 'LOGIN', timezone);

        if (!resultEmail.success && !resultSms.success) {
            return sendError(res, 'Failed to send OTP', 'Email/SMS Error', 500);
        }

        await prisma.userOtp.upsert({
            where: {
                email_phone_purpose_unique: {
                    email,
                    phoneNumber,
                    purpose: 'LOGIN',
                },
            },
            update: {
                code: otp,
                expiresAt,
                createdAt: new Date(),
            },
            create: {
                email,
                phoneNumber,
                code: otp,
                expiresAt,
                purpose: 'LOGIN',
            },
        });

        return sendSuccess(res, null, 'OTP resent to your Email/Phone Number');
    } catch (err) {
        logger.error('resendLoginOtp error:', err);
        return sendError(res, err.message, 'Failed to resend OTP', 500);
    }
}

/**
 * @swagger
 * /auth/login/verify-otp:
 *   post:
 *     tags:
 *       - auth
 *     summary: Verify login OTP
 *     description: |
 *       Verifies the OTP sent to the user's email during login. This must be done after email and password are successfully verified.  
 *       If the OTP is valid and not expired, the login session is marked as OTP verified.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       '200':
 *         description: OTP verified successfully, proceed to MFA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 message:
 *                   type: string
 *                   example: OTP verified. Proceed to MFA
 *       '400':
 *         description: Missing or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Invalid or expired OTP / Unauthorized session
 *       '500':
 *         description: Server error during OTP verification
 */
export async function verifyLoginOtp(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email?.trim() || !otp || typeof otp !== 'string') {
            return sendError(res, 'Missing Fields', 'Email and otp are required to login.', 400);
        }

        if (!validateEmail(email)) {
            return sendError(res, 'Invalid email format', 'Bad Request', 400);
        }

        const session = await prisma.loginSession.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' },
        });

        if (!session || !session.emailVerified) {
            return sendError(
                res,
                'Email/password verification not completed.',
                'Unauthorized',
                401
            );
        }

        const record = await prisma.userOtp.findFirst({
            where: {
                email,
                code: otp,
                purpose: 'LOGIN',
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!record) {
            return sendError(res, 'Invalid OTP', 'Unauthorized', 401);
        }

        if (new Date(record.expiresAt).getTime() < Date.now()) {
            await prisma.userOtp.delete({ where: { id: record.id } });
            return sendError(res, 'OTP Expired', 'Please request a new OTP.', 401);
        }

        await prisma.userOtp.delete({
            where: { id: record.id },
        });

        await prisma.loginSession.update({
            where: { id: session.id },
            data: { otpVerified: true },
        });

        return sendSuccess(res, null, 'OTP verified. Proceed to MFA');
    } catch (err) {
        logger.error('verifyLoginOtp error:', err);
        return sendError(res, err.message, 'OTP verification failed', 500);
    }
}

/**
 * @swagger
 * /auth/login/mfa-verify:
 *   post:
 *     tags:
 *       - auth
 *     summary: Final login step – Verify MFA
 *     description: |
 *       Verifies the MFA TOTP token after email/password and OTP steps are successfully completed.  
 *       Returns access and refresh tokens upon successful login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       '200':
 *         description: Login successful, tokens issued
 *         headers:
 *           Set-Cookie:
 *             description: Contains `accessToken` and `refreshToken` as HTTP-only cookies
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     refreshToken:
 *                       type: string
 *                       example: dXNlciByZWZyZXNoIHRva2Vu...
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d
 *                         email:
 *                           type: string
 *                           example: johndoe@example.com
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                 message:
 *                   type: string
 *                   example: Login successful
 *       '400':
 *         description: Missing fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized or invalid MFA token
 *       '404':
 *         description: User not found
 *       '500':
 *         description: Internal server error
 */
export async function verifyMfaAndLogin(req, res) {
    try {
        const { email, token } = req.body;

        if (!email?.trim() || !token) {
            return sendError(res, 'Missing Fields', 'Email and token are required to login.', 400);
        }

        if (!validateEmail(email)) {
            return sendError(res, 'Invalid email format', 'Bad Request', 400);
        }

        const session = await prisma.loginSession.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' },
        });

        if (!session || !session.emailVerified || !session.otpVerified) {
            return sendError(res, 'Email/password or OTP step incomplete.', 'Unauthorized', 401);
        }

        if (session.mfaVerified) {
            return sendError(res, 'MFA already verified for this session.', 'Unauthorized', 400);
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
                role: "ADMIN",
            },
            include: { profile: true },
        });

        if (!user) {
            return sendError(res, 'User not found', 'Not Found', 404);
        }

        if (!user.mfaSecret) {
            return sendError(res, 'MFA not setup for user', 'Unauthorized', 401);
        }

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (!verified) {
            return sendError(res, 'Invalid MFA token', 'Unauthorized', 401);
        }

        await prisma.loginSession.update({
            where: { id: session.id },
            data: { mfaVerified: true },
        });

        const activeSessions = await prisma.userSession.findMany({
            where: {
                userId: user.id,
                isCurrent: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        if (activeSessions.length >= 3) {
            const oldestSession = activeSessions[0];
            await prisma.userSession.delete({
                where: {
                    id: oldestSession.id,
                },
            });
        }

        const parser = new UAParser(req.headers['user-agent']);
        const ua = parser.getResult();

        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        const geo = geoip.lookup(ip);
        const timeZone = geo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const refreshToken = generateRefreshToken(user.id);
        const hashedRefreshToken = await hashToken(refreshToken);

        const newSession = await prisma.userSession.create({
            data: {
                userId: user.id,
                device: ua.device.model || 'Unknown',
                os: ua.os.name || 'Unknown',
                browser: ua.browser.name || 'Unknown',
                location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
                ipAddress: ip,
                timeZone: timeZone,
                refreshToken: hashedRefreshToken,
                refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                isCurrent: true,
            },
        });

        const accessToken = generateAccessToken(user.id, user.role, timeZone, newSession.id);

        await prisma.user.update({
            where: { email },
            data: {
                lastLogin: new Date(),
            },
        });

        setCookie(res, 'refreshToken', refreshToken, {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        setCookie(res, 'accessToken', accessToken, {
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        return sendSuccess(
            res,
            {
                accessToken,
                refreshToken,
                timeZone,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
            },
            'Login successful',
            200
        );
    } catch (err) {
        logger.error('verifyMfaAndLogin error:', err);
        return sendError(res, err.message, 'MFA verification failed', 500);
    }
}

/**
 * @swagger
 * /auth/forgot-password/init:
 *   post:
 *     tags:
 *       - auth
 *     summary: Initiate forgot password flow
 *     description: |
 *       Sends an OTP to the user's email address to begin the password reset process.  
 *       The OTP is valid for 5 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *     responses:
 *       '200':
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 message:
 *                   type: string
 *                   example: OTP sent to your email
 *       '400':
 *         description: Invalid or missing email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: User not found with the given email
 *       '500':
 *         description: Server error during forgot password initiation
 */
export async function forgotPasswordInit(req, res) {
    try {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return sendError(res, 'Invalid email', 'Bad Request', 400);
        }

        const user = await prisma.user.findUnique({ where: { email, role: "ADMIN" } });
        if (!user) {
            return sendError(res, 'No user found with this email', 'Not Found', 404);
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        const timezone = getTimezone(req);
        const resultEmail = await sendOTPByEmail(email, otp, expiresAt, 'FORGOT_PASSWORD', timezone);
        const resultSms = await sendOTPBySms(user.phoneNumber, otp, expiresAt, 'FORGOT_PASSWORD', timezone);

        if (!resultEmail.success && !resultSms.success) {
            return sendError(res, 'Failed to send OTP', 'Email/SMS Error', 500);
        }

        await prisma.userOtp.upsert({
            where: {
                email_phone_purpose_unique: {
                    email,
                    phoneNumber: user.phoneNumber,
                    purpose: 'FORGOT_PASSWORD',
                },
            },
            update: {
                code: otp,
                expiresAt,
                createdAt: new Date(),
            },
            create: {
                email,
                phoneNumber: user.phoneNumber,
                code: otp,
                expiresAt,
                purpose: 'FORGOT_PASSWORD',
            },
        });

        return sendSuccess(res, null, 'OTP sent to your email');
    } catch (err) {
        logger.error('forgotPasswordInit error:', err);
        return sendError(res, err.message, 'Failed to initiate forgot password flow', 500);
    }
}

/**
 * @swagger
 * /auth/forgot-password/resend-otp:
 *   post:
 *     tags:
 *       - auth
 *     summary: Resend forgot password OTP
 *     description: |
 *       Resends an OTP to the user's email to initiate the password reset process.  
 *       Prevents abuse by blocking requests made within 30 seconds of a previous OTP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 message:
 *                   type: string
 *                   example: OTP resent to your email
 *       400:
 *         description: Invalid email format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found with given email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests — OTP sent too recently
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error while resending OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function resendForgotPasswordOtp(req, res) {
    try {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return sendError(res, 'Invalid email format', 'Bad Request', 400);
        }

        const user = await prisma.user.findUnique({
            where: { email, role: "ADMIN" },
        });

        if (!user) {
            return sendError(res, 'No user found with this email', 'Not Found', 404);
        }

        const existingOtp = await prisma.userOtp.findFirst({
            where: {
                email,
                purpose: 'FORGOT_PASSWORD',
            },
            orderBy: { createdAt: 'desc' },
        });

        if (
            existingOtp &&
            new Date(existingOtp.createdAt).getTime() > Date.now() - 30 * 1000
        ) {
            return sendError(
                res,
                'OTP already sent recently',
                'Please wait 30 seconds before requesting again.',
                429
            );
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        const timezone = getTimezone(req);
        const resultEmail = await sendOTPByEmail(email, otp, expiresAt, 'FORGOT_PASSWORD', timezone);
        const resultSms = await sendOTPBySms(user.phoneNumber, otp, expiresAt, 'FORGOT_PASSWORD', timezone);

        if (!resultEmail.success && !resultSms.success) {
            return sendError(res, 'Failed to send OTP', 'Email/SMS Error', 500);
        }

        await prisma.userOtp.upsert({
            where: {
                email_phone_purpose_unique: {
                    email,
                    phoneNumber: user.phoneNumber,
                    purpose: 'FORGOT_PASSWORD',
                },
            },
            update: {
                code: otp,
                expiresAt,
                createdAt: new Date(),
            },
            create: {
                email,
                phoneNumber: user.phoneNumber,
                code: otp,
                expiresAt,
                purpose: 'FORGOT_PASSWORD',
            },
        });

        return sendSuccess(res, null, 'OTP resent to your email');
    } catch (err) {
        logger.error('resendForgotPasswordOtp error:', err);
        return sendError(res, err.message, 'Failed to resend OTP', 500);
    }
}

/**
 * @swagger
 * /auth/forgot-password/verify-otp:
 *   post:
 *     tags:
 *       - auth
 *     summary: Verify OTP for forgot password
 *     description: |
 *       Verifies the OTP sent during the forgot password process.  
 *       If valid and not expired, allows the user to proceed to reset their password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       '200':
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 message:
 *                   type: string
 *                   example: OTP verified. You can now reset your password
 *       '400':
 *         description: Invalid or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Invalid or expired OTP
 *       '500':
 *         description: Server error during OTP verification
 */
export async function verifyForgotPasswordOtp(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp || typeof otp !== 'string' || !validateEmail(email)) {
            return sendError(res, 'Invalid input', 'Bad Request', 400);
        }

        const user = await prisma.user.findUnique({
            where: { email, role: "ADMIN" },
        });

        if (!user) {
            return sendError(res, 'User not found', 'Unauthorized', 401);
        }

        const phoneNumber = user.phoneNumber;


        const record = await prisma.userOtp.findFirst({
            where: {
                email,
                phoneNumber,
                purpose: 'FORGOT_PASSWORD',
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!record) {
            return sendError(res, 'Reset Password Request not found.', 'Unauthorized', 401);
        }

        if (new Date(record.expiresAt) < new Date()) {
            await prisma.userOtp.delete({ where: { id: record.id } });
            return sendError(res, 'OTP expired', 'Unauthorized', 401);
        }

        await prisma.userOtp.delete({ where: { id: record.id } });

        return sendSuccess(res, null, 'OTP verified. You can now reset your password');
    } catch (err) {
        logger.error('verifyForgotPasswordOtp error:', err);
        return sendError(res, err.message, 'OTP verification failed', 500);
    }
}

/**
 * @swagger
 * /auth/forgot-password/reset:
 *   post:
 *     tags:
 *       - auth
 *     summary: Reset password
 *     description: |
 *       Resets the user's password after successful OTP verification during the forgot password flow.  
 *       Password must meet complexity requirements and be different from the old password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               newPassword:
 *                 type: string
 *                 example: MyN3wSecureP@ssw0rd
 *     responses:
 *       '200':
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       '400':
 *         description: Invalid input or weak password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: User not found
 *       '500':
 *         description: Server error during password reset
 */
export async function resetPassword(req, res) {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword || !validateEmail(email)) {
            return sendError(res, 'Invalid input', 'Bad Request', 400);
        }

        if (!validatePassword(newPassword)) {
            return sendError(res, 'Weak password', 'Password must be at least 12 characters long and include at least one letter, one number, and one special character.', 400);
        }

        const user = await prisma.user.findUnique({ where: { email, role: "ADMIN" } });

        if (!user) {
            return sendError(res, 'User not found', 'Not Found', 404);
        }

        const isSamePassword = await compareHashedToken(newPassword, user.password);
        if (isSamePassword) {
            return sendError(res, 'New password cannot be same as old password', 'Bad Request', 400);
        }

        const hashedPassword = await hashToken(newPassword);

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
            },
        });

        return sendSuccess(res, null, 'Password reset successfully');
    } catch (err) {
        logger.error('resetPassword error:', err);
        return sendError(res, err.message, 'Password reset failed', 500);
    }
}

/**
 * @swagger
 * /auth/refresh-token:
 *   get:
 *     tags:
 *       - auth
 *     summary: Refresh access token
 *     description: |
 *       Generates a new access and refresh token if the provided refresh token is valid and not expired.  
 *       The refresh token can be sent either as an HTTP-only cookie or in the `Authorization` header as a Bearer token.
 *     security:
 *       - {}
 *     responses:
 *       '200':
 *         description: New access and refresh tokens generated
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only cookies for accessToken and refreshToken
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     refreshToken:
 *                       type: string
 *                       example: new-refresh-token-value
 *                 message:
 *                   type: string
 *                   example: Token refreshed
 *       '401':
 *         description: Refresh token missing, invalid, expired, or mismatched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Server error during token refresh
 */
export async function refreshAccessToken(req, res) {
    try {
        const token = await handleRefreshToken(req, res);
        return sendSuccess(res, token, 'Token refreshed', 200);
    } catch (error) {
        logger.error('getSecurityQuestionsForRegisteration Error:', error);
        return sendError(res, error.message, 'Internal Server Error', 500);
    }
}

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Get user session history
 *     description: Retrieves a list of all login sessions for the authenticated user.
 *     tags:
 *       - auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User sessions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User sessions fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSession'
 *       401:
 *         description: Unauthorized – Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function getUserSessions(req, res) {
    try {
        const { userId } = req.user;

        console.log("user in getUserSeesion ===>>>>", userId);

        const sessions = await prisma.userSession.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return sendSuccess(res, sessions, 'User sessions fetched successfully', 200);
    } catch (err) {
        logger.error('getUserSessions error:', err);
        return sendError(res, err.message || 'Failed to fetch sessions', 'Internal Server Error', 500);
    }
}

/**
 * @swagger
 * /auth/sessions/remove:
 *   delete:
 *     summary: Remove a user session
 *     description: Deletes a specific user session by session ID, except the currently active session.
 *     tags:
 *       - auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "sess_01GZ59ZK2B6CV3TZVE6Q7GVD5V"
 *             required:
 *               - sessionId
 *     responses:
 *       200:
 *         description: Session removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Session removed successfully
 *       400:
 *         description: Missing session ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Attempt to delete active session or forbidden action
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function removeUserSession(req, res) {
    try {
        const { userId } = req.user;
        const { sessionId } = req.body;

        if (!sessionId) {
            return sendError(res, 'Missing fields', 'Session ID is required', 400);
        }

        const session = await prisma.userSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            return sendError(res, 'Session not found', 'Invalid session ID', 404);
        }

        if (session.userId !== userId) {
            return sendError(res, 'Unauthorized', 'You do not have permission to delete this session', 403);
        }

        let refreshToken;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            refreshToken = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.refreshToken) {
            refreshToken = req.cookies.refreshToken;
        }

        if (!refreshToken) {
            return sendError(res, 'Unauthorized', 'Missing refresh token', 401);
        }
        console.log(refreshToken);

        const payload = verifyRefreshToken(refreshToken);
        console.log(payload);

        if (!payload || payload.userId !== userId) {
            return sendError(res, 'Unauthorized', 'Invalid refresh token', 401);
        }

        const hashedCurrentToken = await hashToken(refreshToken);
        const currentSession = await prisma.userSession.findFirst({
            where: {
                userId,
                refreshToken: hashedCurrentToken,
            },
        });

        if (currentSession?.id === sessionId) {
            return sendError(res, 'Forbidden', 'You cannot remove your active session', 403);
        }

        await prisma.userSession.delete({
            where: { id: sessionId },
        });

        return sendSuccess(res, null, 'Session removed successfully', 200);
    } catch (err) {
        logger.error('removeUserSession error:', err);
        return sendError(res, err.message || 'Failed to remove session', 'Internal Server Error', 500);
    }
}

/**
 * @swagger
 * /auth/sessions/remove-others:
 *   delete:
 *     summary: Logout all other sessions
 *     description: Removes all user sessions except the current active one.
 *     tags:
 *       - auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All other sessions removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: All other sessions removed.
 *       401:
 *         description: Unauthorized - Missing or invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function logoutAllOtherSessions(req, res) {
    try {
        const { userId } = req.user;

        let currentRefreshToken;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            currentRefreshToken = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.refreshToken) {
            currentRefreshToken = req.cookies.refreshToken;
        }

        if (!currentRefreshToken) {
            return sendError(res, 'No refresh token found', 'Unauthorized', 401);
        }

        const payload = verifyRefreshToken(currentRefreshToken);
        if (!payload || payload.userId !== userId) {
            return sendError(res, 'Invalid refresh token', 'Unauthorized', 401);
        }

        // Fetch all user sessions
        const allSessions = await prisma.userSession.findMany({
            where: { userId },
        });

        // Identify current session (using refresh token match)
        let currentSession = null;
        for (const session of allSessions) {
            const isMatch = await bcrypt.compare(currentRefreshToken, session.refreshToken);
            if (isMatch) {
                currentSession = session;
                break;
            }
        }

        if (!currentSession) {
            return sendError(res, 'Current session not found', 'Unauthorized', 401);
        }

        // Delete all sessions except current
        await prisma.userSession.deleteMany({
            where: {
                userId,
                id: { not: currentSession.id },
            },
        });

        return sendSuccess(res, null, 'All other sessions removed.', 200);
    } catch (err) {
        logger.error('logoutAllOtherSessions error:', err);
        return sendError(res, err.message, 'Failed to logout other sessions', 500);
    }
}

export async function deleteAdminComplete(req, res) {
    try {
        const { userId } = req.user;

        // 1. Find the logged-in user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return sendError(res, "User not found", "Not Found", 404);
        }

        // 2. Check if the logged-in user is ADMIN
        if (user.role !== "ADMIN") {
            return sendError(res, "Only ADMIN users can delete their account", "Forbidden", 403);
        }

        // 3. Run delete transaction
        await prisma.$transaction(async (tx) => {
            await tx.userProfile.deleteMany({ where: { userId } });
            await tx.userSession.deleteMany({ where: { userId } });
            await tx.userSecurityQuestion.deleteMany({ where: { userId } });
            await tx.onboardingQuestionnaire.deleteMany({ where: { userId } });
            await tx.tokenHoldings.deleteMany({ where: { userId } });
            await tx.userVault.deleteMany({ where: { userId } });
            await tx.userFiatVault.deleteMany({ where: { userId } });
            await tx.fiatWithdrawalRequest.deleteMany({ where: { userId } });
            await tx.cryptoTransaction.deleteMany({ where: { userId } });
            await tx.fiatTransaction.deleteMany({ where: { userId } });
            await tx.tokenPurchase.deleteMany({ where: { userId } });
            await tx.depositAddress.deleteMany({ where: { userId } });
            await tx.userCard.deleteMany({ where: { userId } });
            await tx.userBankAccount.deleteMany({ where: { userId } });
            await tx.microDeposit.deleteMany({ where: { userId } });
            await tx.staking.deleteMany({ where: { userId } });
            await tx.cryptoWithdrawalRequest.deleteMany({ where: { userId } });
            await tx.notificationSetting.deleteMany({ where: { userId } });
            await tx.earlyWithdrawalSession.deleteMany({ where: { userId } });

            // cleanup OTPs & LoginSessions (by email)
            await tx.userOtp.deleteMany({ where: { email: user.email } });
            await tx.loginSession.deleteMany({ where: { email: user.email } });

            // finally delete the user
            await tx.user.delete({ where: { id: userId } });
        }, {
            timeout: 50000 // 50 seconds
        });

        return sendSuccess(res, null, "Admin and all related data deleted successfully.");
    } catch (err) {
        logger.error("deleteAdminComplete error:", err);
        return sendError(res, err.message, "Failed to delete admin", 500);
    }
}

export async function logout(req, res) {
  try {
    const { userId } = req.user;
    if (!userId) {
      return sendError(res, "Unauthorized", "User not logged in", 401);
    }

    let currentRefreshToken;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        currentRefreshToken = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.refreshToken) {
        currentRefreshToken = req.cookies.refreshToken;
    }

    if (!currentRefreshToken) {
        return sendError(res, 'No refresh token found', 'Unauthorized', 401);
    }
    console.log(currentRefreshToken);

    // const payload = verifyRefreshToken(currentRefreshToken);
    // if (!payload || payload.userId !== userId) {
    //     return sendError(res, 'Invalid refresh token', 'Unauthorized', 401);
    // }

    // Fetch all user sessions
    const allSessions = await prisma.userSession.findMany({
        where: { userId },
    });

    // Identify current session (using refresh token match)
    let currentSession = null;
    for (const session of allSessions) {
        const isMatch = await bcrypt.compare(currentRefreshToken, session.refreshToken);
        if (isMatch) {
            currentSession = session;
            break;
        }
    }

    if (!currentSession) {
        return sendError(res, 'Current session not found', 'Unauthorized', 401);
    }


    // Update current session isCurrent -> false
    await prisma.userSession.update({
      where: { id: currentSession.id },
      data: { isCurrent: false },
    });

    return sendSuccess(res, { message: "Logged out successfully" }, "Logout successful");
  } catch (err) {
    console.error("logout error:", err);
    return sendError(res, err.message, "Failed to logout", 500);
  }
}