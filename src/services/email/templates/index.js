import { convertUTCToTimezone } from "../../../utils/index.js";

export async function createForgotPasswordOtpTemplate(otp, expiresAt, timezone) {
	const formattedExpiry = convertUTCToTimezone(expiresAt, timezone);

	const message = `Your OTP to reset your password is ${otp}. It is valid until ${formattedExpiry}.`;

	return {
		subject: 'Reset Password OTP Code',
		textBody: message,
		htmlBody: `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8" />
				<title>Password Reset OTP</title>
			</head>
			<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
				<div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<h2 style="color: #2c3e50;">Reset Your Password</h2>
					<p style="font-size: 16px; color: #333;">
						Use the following OTP to reset your password:
					</p>
					<p style="font-size: 28px; font-weight: bold; color: #007BFF; margin: 20px 0;">
						${otp}
					</p>
					<p style="font-size: 14px; color: #555;">
						This OTP is valid until <strong>${formattedExpiry}</strong>.
						Please do not share it with anyone.
					</p>
					<hr style="margin: 30px 0;" />
					<p style="font-size: 14px; color: #999;">If you did not request a password reset, please ignore this email.</p>
					<p style="font-size: 14px; margin-top: 30px;">Best regards,<br /><strong>The Team</strong></p>
				</div>
			</body>
		</html>
		`,
	};
}

export async function createLoginOtpTemplate(otp, expiresAt, timezone) {
	const formattedExpiry = convertUTCToTimezone(expiresAt, timezone);

	const message = `Your Login OTP is ${otp}. It is valid until ${formattedExpiry}.`;

	return {
		subject: 'Your Login OTP Code',
		textBody: message,
		htmlBody: `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8" />
				<title>Login OTP</title>
			</head>
			<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
				<div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<h2 style="color: #2c3e50;">Login Verification</h2>
					<p style="font-size: 16px; color: #333;">
						Use the following OTP to complete your login:
					</p>
					<p style="font-size: 28px; font-weight: bold; color: #007BFF; margin: 20px 0;">
						${otp}
					</p>
					<p style="font-size: 14px; color: #555;">
						This OTP is valid until <strong>${formattedExpiry}</strong>.
						Please do not share it with anyone.
					</p>
					<hr style="margin: 30px 0;" />
					<p style="font-size: 14px; color: #999;">If you did not request this login, please secure your account.</p>
					<p style="font-size: 14px; margin-top: 30px;">Best regards,<br /><strong>The Team</strong></p>
				</div>
			</body>
		</html>
		`,
	};
}

export async function createMfaUpdateOtpTemplate(otp, expiresAt, timezone) {
	const formattedExpiry = convertUTCToTimezone(expiresAt, timezone);

	const message = `You requested to reset your MFA Device. Confirm the change using the OTP: ${otp}. It is valid until ${formattedExpiry}.`;

	return {
		subject: 'Confirm Your MFA Device Reset OTP',
		textBody: message,
		htmlBody: `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8" />
				<title>MFA Device Reset Confirmation</title>
			</head>
			<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
				<div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<h2 style="color: #2c3e50;">Confirm MFA Device Change</h2>
					<p style="font-size: 16px; color: #333;">
						Use the following OTP to confirm your MFA device change:
					</p>
					<p style="font-size: 28px; font-weight: bold; color: #007BFF; margin: 20px 0;">
						${otp}
					</p>
					<p style="font-size: 14px; color: #555;">
						This OTP is valid until <strong>${formattedExpiry}</strong>.
						Please do not share it with anyone.
					</p>
					<hr style="margin: 30px 0;" />
					<p style="font-size: 14px; color: #999;">If you did not initiate this MFA Device reset, your current MFA Device is still safe.</p>
					<p style="font-size: 14px; margin-top: 30px;">Best regards,<br /><strong>The Team</strong></p>
				</div>
			</body>
		</html>
		`,
	};
}

export async function createNewEmailOtpTemplate(otp, expiresAt, timezone) {
	const formattedExpiry = convertUTCToTimezone(expiresAt, timezone);

	const message = `You requested to change your registered email address. Use the OTP: ${otp}. It is valid until ${formattedExpiry}.`;

	return {
		subject: 'Verify Your New Email Address',
		textBody: message,
		htmlBody: `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8" />
                <title>Verify New Email</title>
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
                <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="color: #2c3e50;">Verify Your New Email Address</h2>
                    <p style="font-size: 16px; color: #333;">
                        Use the following OTP to verify your new email address:
                    </p>
                    <p style="font-size: 28px; font-weight: bold; color: #007BFF; margin: 20px 0;">
                        ${otp}
                    </p>
                    <p style="font-size: 14px; color: #555;">
                        This OTP is valid until <strong>${formattedExpiry}</strong>.
                        Please do not share it with anyone.
                    </p>
                    <hr style="margin: 30px 0;" />
                    <p style="font-size: 14px; color: #999;">If you did not request an email change, please ignore this message.</p>
                    <p style="font-size: 14px; margin-top: 30px;">Best regards,<br /><strong>The Prospera Team</strong></p>
                </div>
            </body>
        </html>
        `,
	};
}

export async function createPasswordResetOtpTemplate(otp, expiresAt, timezone) {
	const formattedExpiry = convertUTCToTimezone(expiresAt, timezone);

	const message = `You requested to reset your password. Confirm the change using the OTP: ${otp}. It is valid until ${formattedExpiry}.`;

	return {
		subject: 'Confirm Your Password Reset OTP',
		textBody: message,
		htmlBody: `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8" />
				<title>Password Reset Confirmation</title>
			</head>
			<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
				<div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<h2 style="color: #2c3e50;">Confirm Password Change</h2>
					<p style="font-size: 16px; color: #333;">
						Use the following OTP to confirm your password change:
					</p>
					<p style="font-size: 28px; font-weight: bold; color: #007BFF; margin: 20px 0;">
						${otp}
					</p>
					<p style="font-size: 14px; color: #555;">
						This OTP is valid until <strong>${formattedExpiry}</strong>.
						Please do not share it with anyone.
					</p>
					<hr style="margin: 30px 0;" />
					<p style="font-size: 14px; color: #999;">If you did not initiate this password reset, your current password is still safe.</p>
					<p style="font-size: 14px; margin-top: 30px;">Best regards,<br /><strong>The Team</strong></p>
				</div>
			</body>
		</html>
		`,
	};
}