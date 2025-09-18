import { sendEmail } from '../services/email/index.js';
import { createCryptoWithdrawalOtpTemplate, createFiatWithdrawalOtpTemplate, createForgotPasswordOtpTemplate, createLoginOtpTemplate, createMfaUpdateOtpTemplate, createNewEmailOtpTemplate, createPasswordResetOtpTemplate, createRegistrationEmailOtpTemplate } from '../services/email/templates/index.js';
import { sendMessage } from '../services/twilio/twilio.js';
import prisma from '../lib/prisma.js';

// Generate a unique 5-digit stakeId
export async function generateUniqueStakeId() {
  let stakeId;
  let exists = true;

  while (exists) {
    // Generate random 5 digit number (10000–99999)
    stakeId = Math.floor(10000 + Math.random() * 90000).toString();

    // Check if stakeId already exists
    const stake = await prisma.staking.findUnique({
      where: { stakeId }
    });

    exists = !!stake;
  }

  console.log("stakeId unique ==>>>",stakeId);

  return stakeId;
}

export function generateOTP(length = 6) {
    return Math.floor(100000 + Math.random() * 900000)
        .toString()
        .slice(0, length);
}

export async function sendOTPByEmail(email, otp, expiresAt, purpose = 'REGISTER') {
    try {
        console.log(`Sending OTP ${otp} to ${email} for ${purpose}`);

        let template;

        switch (purpose) {
            case 'LOGIN':
                template = await createLoginOtpTemplate(otp, expiresAt);
                break;
            case 'FORGOT_PASSWORD':
                template = await createForgotPasswordOtpTemplate(otp, expiresAt);
                break;
            case 'PASSWORD_RESET':
                template = await createPasswordResetOtpTemplate(otp, expiresAt);
                break;
            case 'MFA_UPDATE':
                template = await createMfaUpdateOtpTemplate(otp, expiresAt);
                break;
            case 'EMAIL_UPDATE':
                template = await createNewEmailOtpTemplate(otp, expiresAt);
                break;
            case 'CRYPTO_WITHDRAWAL':
                template = await createCryptoWithdrawalOtpTemplate(otp, expiresAt);
                break;
            case 'FIAT_WITHDRAWAL':
                template = await createFiatWithdrawalOtpTemplate(otp, expiresAt);
                break;
            case 'REGISTER':
            default:
                template = await createRegistrationEmailOtpTemplate(otp, expiresAt);
                break;
        }

        const result = await sendEmail({
            to: email,
            subject: template.subject,
            textBody: template.textBody,
            htmlBody: template.htmlBody,
        });

        return {
            success: result.success,
            messageId: result.messageId,
        };
    } catch (err) {
        console.error('sendOTPByEmail error:', err);
        return {
            success: false,
            error: err,
        };
    }
}

export async function sendOTPBySms(phoneNumber, otp, expiresAt, purpose = 'REGISTER') {
    try {
        console.log(`Sending OTP ${otp} to ${phoneNumber} via SMS for ${purpose}`);

        let messageBody;

        switch (purpose) {
            case 'LOGIN':
                messageBody = `Your login OTP is ${otp}. It expires at ${expiresAt}.`;
                break;
            case 'FORGOT_PASSWORD':
                messageBody = `Use ${otp} to reset your password. OTP expires at ${expiresAt}.`;
                break;
            case 'PASSWORD_RESET':
                messageBody = `Use OTP ${otp} to confirm your password change. Expires at ${expiresAt}.`;
                break;
            case 'REGISTER':
            default:
                messageBody = `Welcome! Your registration OTP is ${otp}. It expires at ${expiresAt}.`;
                break;
        }

        const result = await sendMessage({
            to: phoneNumber,
            messageBody,
        });

        return {
            success: result.success,
            message: result.message,
            sid: result?.message?.sid,
        };
    } catch (error) {
        console.error('sendOTPBySms error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}
