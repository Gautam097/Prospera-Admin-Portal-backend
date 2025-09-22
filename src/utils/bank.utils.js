import crypto from 'crypto';

export async function validateAccountNumber(accountNumber, accountType) {
    // Remove spaces and special characters
    const cleaned = accountNumber.replace(/[\s-]/g, '');

    // Basic validation rules
    const rules = {
        'CHECKING': /^\d{8,17}$/,          // 8-17 digits
        'SAVINGS': /^\d{8,17}$/,           // 8-17 digits
        'BUSINESS_CHECKING': /^\d{8,20}$/, // 8-20 digits
        'BUSINESS_SAVINGS': /^\d{8,20}$/,  // 8-20 digits
        'MONEY_MARKET': /^\d{8,17}$/,      // 8-17 digits
    };

    const pattern = rules[accountType] || /^\d{8,20}$/;
    return pattern.test(cleaned);
}

export async function validateRoutingNumber(routingNumber) {
    // US routing number validation (9 digits + checksum)
    if (!/^\d{9}$/.test(routingNumber)) return false;

    // ABA routing number checksum validation
    const digits = routingNumber.split('').map(Number);
    const checksum = (
        3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        (digits[2] + digits[5] + digits[8])
    ) % 10;

    return checksum === 0;
}


export async function encryptField(data, keyVersion = 1) {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', process.env.PAYMENT_ENCRYPTION_KEY);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Format: keyVersion:iv:encryptedData
        return `${keyVersion}:${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

export async function decryptField(encryptedData) {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [keyVersion, ivHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');

        // Use appropriate key based on version (for key rotation)
        const key = await getKeyByVersion(parseInt(keyVersion));

        const decipher = crypto.createDecipher('aes-256-cbc', key);
        decipher.setAutoPadding(true);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

export async function hashRoutingNumber(routingNumber) {
    const salt = process.env.ROUTING_SALT || 'default-salt';
    return crypto.createHmac('sha256', salt).update(routingNumber).digest('hex');
}

export async function maskAccountNumber(accountNumber) {
    if (accountNumber.length <= 4) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
}

export async function getKeyByVersion(version) {
    // In production, store multiple keys for rotation
    const keys = {
        1: process.env.PAYMENT_ENCRYPTION_KEY,
        2: process.env.PAYMENT_ENCRYPTION_KEY_V2 || process.env.PAYMENT_ENCRYPTION_KEY,
        3: process.env.PAYMENT_ENCRYPTION_KEY_V3 || process.env.PAYMENT_ENCRYPTION_KEY,
    };

    return keys[version] || process.env.PAYMENT_ENCRYPTION_KEY;
}

export async function encryptSensitiveFields(data) {
    const currentKeyVersion = 1; // Increment for key rotation

    return {
        encryptedAccountNumber: await encryptField(
            data.accountNumber,
            currentKeyVersion
        ),
        hashedRoutingNumber: await hashRoutingNumber(data.routingNumber),
        encryptedIban: data.iban ?
            await encryptField(data.iban, currentKeyVersion) : undefined,
        encryptedSwiftCode: data.swiftCode ?
            await encryptField(data.swiftCode, currentKeyVersion) : undefined,
        keyVersion: currentKeyVersion
    };
}

export async function formatBankAccountForDisplay(account) {
    let decryptedAccountNumber = null;
    let decryptedSwiftCode = null;
    try {
        decryptedAccountNumber = await decryptField(account.encryptedAccountNumber);
        decryptedSwiftCode = await decryptField(account.encryptedSwiftCode);
    } catch (e) {
        decryptedAccountNumber = null; // or log error
    }

    // Masked version (****1234)
    const maskedAccountNumber = decryptedAccountNumber
        ? `****${decryptedAccountNumber.slice(-4)}`
        : null;

    return {
        id: account.id,
        nickname: account.nickname,
        bankName: account.bankName,
        accountType: account.accountType,
        accountHolderName: account.accountHolderName,
        // Show only last 4 digits of account number
        maskedAccountNumber,
        swiftCode: decryptedSwiftCode,
        // Show partial routing info (first 4 digits if needed)
        bankInfo: `${account.bankName} - ${account.bankCity || 'N/A'}`,
        bankAddress: account.bankAddress,
        branchName: account.branchName,
        isDefault: account.isDefault,
        isActive: account.isActive,
        seonSecurityScore: account.seonSecurityScore,
        isVerified: account.isVerified,
        isNostroAccount: account.isNostroAccount || false,
        nostroBankName: account.nostroBankName || null,
        nostroBankAccountNumber: account.nostroBankAccountNumber || null,
        nostroAccountNumber: account.nostroAccountNumber || null,
        nostroBankswiftCode: account.nostroBankswiftCode || null,
        nostroBankswiftFee: account.nostroBankswiftFee || null,
        nostroBankCountry: account.nostroBankCountry || null,
        nostroBankAddress: account.nostroBankAddress || null,
        verifiedAt: account.verifiedAt,
        createdAt: account.createdAt
    };
}

export async function validateBankAccountData(data) {
    if (!validateAccountNumber(data.accountNumber, data.accountType)) {
        return false;
    }

    if (data.bankCountry === 'US' && !validateRoutingNumber(data.routingNumber)) {
        return false;
    }

    if (!data.accountHolderName || !data.bankName || !data.accountNumber) {
        return false;
    }

    return true;
}