import { SendEmailCommand, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from '../../config/aws.js';

export const sendEmail = async (options) => {
    const { to, subject, htmlBody, textBody = '', cc = [], bcc = [] } = options;

    const fromEmail = process.env.FROM_EMAIL;

    const params = {
        Source: fromEmail,
        Destination: {
            ToAddresses: Array.isArray(to) ? to : [to],
            CcAddresses: cc,
            BccAddresses: bcc,
        },
        Message: {
            Subject: {
                Data: subject,
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: htmlBody,
                    Charset: 'UTF-8',
                },
                Text: {
                    Data: textBody || htmlBody.replace(/<[^>]+>/g, ''), // fallback plain text
                    Charset: 'UTF-8',
                },
            },
        },
    };

    try {
        const command = new SendEmailCommand(params);
        const result = await sesClient.send(command);

        console.log('Email sent successfully:', result.MessageId);
        return {
            success: true,
            messageId: result.MessageId,
            message: 'Email sent successfully',
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            error: error.message,
            code: error.name,
        };
    }
};

export const sendTemplatedEmail = async (templateName, to, templateData) => {
    const fromEmail = process.env.FROM_EMAIL;

    const params = {
        Source: fromEmail,
        Destination: {
            ToAddresses: Array.isArray(to) ? to : [to],
        },
        Template: templateName,
        TemplateData: JSON.stringify(templateData),
    };

    try {
        const command = new SendTemplatedEmailCommand(params);
        const result = await sesClient.send(command);

        console.log('Templated email sent successfully:', result.MessageId);
        return {
            success: true,
            messageId: result.MessageId,
            message: 'Templated email sent successfully',
        };
    } catch (error) {
        console.error('Error sending templated email:', error);
        return {
            success: false,
            error: error.message,
            code: error.name,
        };
    }
};

export const sendBulkEmail = async (recipients, subject, htmlBody, textBody = '') => {
    const results = [];

    for (const recipient of recipients) {
        const result = await sendEmail({
            to: recipient,
            subject,
            htmlBody,
            textBody,
        });
        results.push({ recipient, ...result });
    }

    return results;
};
