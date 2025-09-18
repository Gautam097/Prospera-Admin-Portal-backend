import { encryptSensitiveFields, formatBankAccountForDisplay, hashRoutingNumber, validateBankAccountData } from '../utils/bank.utils.js';
import {
    decryptCardNumber,
    encryptCardNumber,
    maskCardNumber,
    sanitizeCard,
} from '../utils/card.encryption.js';
import crypto from 'crypto';

export async function saveCard(data) {
    try {
        // ---- Basic required field validation ----
        const requiredFields = [
            'userId',
            'cardNumber',
            'cvv',
            'cardHolderName',
            'expiryMonth',
            'expiryYear',
            'cardType',
        ];

        for (const field of requiredFields) {
            if (!data[field] && data[field] !== 0) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // ---- Field format validations ----

        // Card number: digits only, length 13–19
        const cardNumberStr = String(data.cardNumber).replace(/\s+/g, '');
        if (!/^\d{13,19}$/.test(cardNumberStr)) {
            throw new Error('Invalid card number format');
        }

        // Expiry month: 1–12
        if (data.expiryMonth < 1 || data.expiryMonth > 12) {
            throw new Error('Invalid expiry month');
        }

        // Expiry year: current year or later
        const currentYear = new Date().getFullYear();
        if (data.expiryYear < currentYear) {
            throw new Error('Card expiry year cannot be in the past');
        }

        // Expiry date: must not be in the past
        const now = new Date();
        const expiryDate = new Date(data.expiryYear, data.expiryMonth - 1, 1);
        expiryDate.setMonth(expiryDate.getMonth() + 1); // move to next month
        if (expiryDate <= now) {
            throw new Error('Card is already expired');
        }

        // Cardholder name: at least 2 characters
        if (String(data.cardHolderName).trim().length < 2) {
            throw new Error('Card holder name is too short');
        }

        // ---- Duplicate check using decryption ----
        const existingCards = await prisma.userCard.findMany({
            where: { userId: data.userId, isActive: true },
        });

        for (const card of existingCards) {
            const decrypted = await getDecryptedCard(card.id);
            if (decrypted.cardNumber === cardNumberStr) {
                throw new Error('This card is already saved for the user');
            }
        }

        // ---- Encryption and saving ----
        const encryptedCardNumber = await encryptCardNumber(cardNumberStr);
        const lastFourDigits = cardNumberStr.slice(-4);
        const encryptedCvv = await encryptCardNumber(String(data.cvv));

        // If this is set as default, unset other default cards
        if (data.isDefault) {
            await prisma.userCard.updateMany({
                where: { userId: data.userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const savedCard = await prisma.userCard.create({
            data: {
                userId: data.userId,
                cardNumber: encryptedCardNumber,
                lastFourDigits,
                cvv: encryptedCvv,
                cardHolderName: data.cardHolderName.trim(),
                expiryMonth: data.expiryMonth,
                expiryYear: data.expiryYear,
                cardType: data.cardType,
                nickname: data.nickname?.trim() || null,
                isDefault: data.isDefault || false,
                seonSecurityScore: data.seonSecurityScore || null,
                isVerified: false, // Always starts as unverified
            },
        });

        return sanitizeCard(savedCard, await maskCardNumber(cardNumberStr));
    } catch (error) {
        throw new Error(`Failed to save card: ${error.message}`);
    }
}

export async function getDecryptedCard(cardId, userId) {
    const card = await prisma.userCard.findFirst({
        where: {
            id: cardId,
            userId,
            isActive: true,
        },
    });

    if (!card) return null;

    // Decrypt card number only when needed for payment
    const decryptedCardNumber = await decryptCardNumber(card.cardNumber);

    return {
        id: card.id,
        cardNumber: decryptedCardNumber,
        cardHolderName: card.cardHolderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        cardType: card.cardType,
        seonSecurityScore: card.seonSecurityScore,
        isVerified: card.isVerified,
    };
}

export async function checkDuplicateAccount(userId, accountNumber, hashedRouting) {
    // Note: This is challenging with encrypted account numbers
    // You might need to decrypt existing accounts or use a different approach
    // Alternative: Store hash of account number + routing for duplicate checking

    const accountHash = crypto
        .createHmac('sha256', process.env.ACCOUNT_HASH_KEY || 'default')
        .update(accountNumber + hashedRouting)
        .digest('hex');

    const existingUserAccount = await prisma.userBankAccount.findFirst({
        where: {
            userId,
            // You'd need to add this field to schema
            accountHash: accountHash,
            isActive: true
        }
    });

    const existingGlobalAccount = await prisma.userBankAccount.findFirst({
        where: {
            accountHash,
        }
    });

    // Return true if duplicate exists (either user-specific or global)
    return !!(existingUserAccount || existingGlobalAccount);
}


export async function addBankAccount(data) {
    try {
        // 1. Validate input data
        if (!validateBankAccountData(data)) {
            throw new Error('Invalid bank account data');
        }

        // 2. Check for duplicate account
        const hashedRouting = hashRoutingNumber(data.routingNumber);
        const existingAccount = await checkDuplicateAccount(
            data.userId,
            data.accountNumber,
            hashedRouting
        );

        if (existingAccount) {
            throw new Error('Bank account already exists');
        }

        // 3. Encrypt sensitive fields
        const encryptedData = await encryptSensitiveFields(data);

        // 4. Set as default if requested
        if (data.isDefault) {
            await prisma.userBankAccount.updateMany({
                where: { userId: data.userId, isDefault: true },
                data: { isDefault: false }
            });
        }

        const accountHash = crypto
            .createHmac('sha256', process.env.ACCOUNT_HASH_KEY || 'default')
            .update(data.accountNumber + hashedRouting)
            .digest('hex');

        // 5. Save encrypted bank account
        const savedAccount = await prisma.userBankAccount.create({
            data: {
                userId: data.userId,
                encryptedAccountNumber: encryptedData.encryptedAccountNumber,
                hashedRoutingNumber: encryptedData.hashedRoutingNumber,
                accountHash,
                accountType: data.accountType,
                bankName: data.bankName,
                accountHolderName: data.accountHolderName,
                branchName: data.branchName,
                encryptedSwiftCode: encryptedData.encryptedSwiftCode,
                encryptedIban: encryptedData.encryptedIban,
                bankAddress: data.bankAddress,
                bankCity: data.bankCity,
                bankState: data.bankState,
                bankCountry: data.bankCountry,
                bankZipCode: data.bankZipCode,
                nickname: data.nickname,
                isDefault: data.isDefault || false,
                keyVersion: encryptedData.keyVersion,
                seonSecurityScore: data.seonSecurityScore || null,
                isVerified: false, // Starts as unverified
                isNostroAccount: data.isNostroAccount || false,
                nostroBankName: data.nostroBankName || null,
                nostroBankAccountNumber: data.nostroBankAccountNumber || null,
                nostroAccountNumber: data.nostroAccountNumber || null,
                nostroBankswiftCode: data.nostroBankswiftCode || null,
                nostroBankswiftFee: data.nostroBankswiftFee || null,
                nostroBankCountry: data.nostroBankCountry || null,
                nostroBankAddress: data.nostroBankAddress || null,
            }
        });

        return {
            success: true,
            message: 'Bank account saved successfully',
            account: await formatBankAccountForDisplay(savedAccount)
        };
    } catch (error) {
        throw new Error(`Failed to save bank account: ${error.message}`);
    }
}

export async function getBankAccountsByUserId(userId) {
    try {
        const accounts = await prisma.userBankAccount.findMany({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!accounts || accounts.length === 0) {
            return [];
        }

        // Format for display
        return Promise.all(accounts.map(formatBankAccountForDisplay));
    } catch (error) {
        throw new Error(`Failed to fetch bank accounts: ${error.message}`);
    }
}

export async function getBankAccountById(accountId, userId) {
    try {
        const account = await prisma.userBankAccount.findFirst({
            where: {
                id: accountId,
                userId,
                isActive: true,
            },
        });

        if (!account) return null;

        // Format for display
        return formatBankAccountForDisplay(account);
    } catch (error) {
        throw new Error(`Failed to fetch bank account: ${error.message}`);
    }
}