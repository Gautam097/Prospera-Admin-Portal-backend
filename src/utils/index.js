import { randomUUID } from "crypto";
import crypto from 'crypto';

export function formatTransactionType(type) {
    switch (type) {
        case 'PURCHASE':
            return 'Purchase';
        case 'BANK_TRANSFER':
            return 'Bank Transfer';
        case 'SELL':
            return 'Sell';
        case 'CRYPTO_SEND':
            return 'Crypto Send';
        case 'CRYPTO_RECEIVE':
            return 'Crypto Receive';
        case 'FIAT_DEPOSIT':
            return 'Fiat Deposit';
        case 'FIAT_WITHDRAW':
            return 'Fiat Withdraw';
        default:
            return type;
    }
}

export function formatStatus(status) {
    switch (status) {
        case 'COMPLETED':
            return 'Completed';
        case 'PENDING':
            return 'Pending';
        case 'FAILED':
            return 'Failed';
        default:
            return status;
    }
}

export async function generateProsperaId(name) {
    // sanitize name: lowercase, remove spaces
    let baseId = name.replace(/\s+/g, "").toLowerCase();
    let prosperaId = `${baseId}@pusd.global`;

    let counter = 1;

    // keep checking until we find a unique prosperaId
    while (true) {
        const existing = await prisma.user.findUnique({
            where: { prosperaId },
        });

        if (!existing) {
            return prosperaId; // unique, return it
        }

        // regenerate with number suffix
        prosperaId = `${baseId}${counter}@pusd`;
        counter++;
    }
    return prosperaId;
}

export function generateTxHash() {
    return '0x' + crypto.randomBytes(32).toString('hex');
}

