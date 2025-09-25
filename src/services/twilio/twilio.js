import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function sendMessage(options) {
    const { to, messageBody = '' } = options;

    if (!to) {
        console.error('Error: "to" phone number is required.');
        return;
    }

    try {
        const res = await client.messages.create({
            body: messageBody,
            from: from,
            to: to
        });

        return {
            success: true,
            data: res,
            message: 'SMS sent successfully',
        };
    } catch (error) {
        console.error('Failed to send SMS:', {
            message: error.message,
            code: error.code,
            moreInfo: error.moreInfo,
        });

        return {
            success: false,
            error: error.message,
            message: 'Failed to send SMS',
        };
    }
}