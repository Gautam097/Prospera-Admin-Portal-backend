import crypto from 'crypto';

export async function encryptCardNumber(cardNumber) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', process.env.PAYMENT_ENCRYPTION_KEY);
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(cardNumber, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
}

export async function decryptCardNumber(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedCardNumber = parts[1];

    const decipher = crypto.createDecipher('aes-256-cbc', process.env.PAYMENT_ENCRYPTION_KEY);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encryptedCardNumber, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

export async function getLastFourDigits(cardNumber) {
    return cardNumber.slice(-4);
}

export async function maskCardNumber(cardNumber) {
    return '**** **** **** ' + cardNumber.slice(-4);
}

export async function sanitizeCard(card, maskedNumber) {
    return {
        id: card.id,
        userId: card.userId,
        cardNumber: maskedNumber,
        lastFourDigits: card.lastFourDigits,
        cardHolderName: card.cardHolderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        cardType: card.cardType,
        nickname: card.nickname,
        isDefault: card.isDefault,
        isVerified: card.isVerified,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
    };
}
