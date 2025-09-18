import prisma from '../lib/prisma.js';
import { Decimal } from '@prisma/client/runtime/library.js';

export async function createTransaction(data) {
    const {
        userId,
        vaultId,
        tokenNetworkId,
        type,
        status = 'PENDING',
        amount,
        fireblocksTransactionId = null,
        txHash = null,
        sourceAddress = null,
        destinationAddress = null,
        fee = null,
        metadata = {},
    } = data;

    try {
        const transaction = await prisma.cryptoTransaction.create({
            data: {
                userId,
                vaultId,
                tokenNetworkId,
                type,
                status,
                amount: new Decimal(amount),
                fee,
                fireblocksTransactionId,
                txHash,
                sourceAddress,
                destinationAddress,
                metadata,
            },
        });


        return transaction;
    } catch (error) {
        console.error('Failed to create transaction:', error);
        throw new Error('Transaction creation failed');
    }
}

export async function createFiatTransaction(data) {
    const {
        userId,
        vaultId,
        type = 'DEPOSIT',
        status = 'PENDING',
        amount,
        currencyId,
        paymentMethod,
        referenceId = null,
        metadata = {},
    } = data;

    try {
        const transaction = await prisma.fiatTransaction.create({
            data: {
                userId,
                vaultId,
                type,
                status,
                amount: new Decimal(amount),
                currencyId,
                paymentMethod,
                referenceId,
                metadata,
            },
        });


        return transaction;
    } catch (error) {
        console.error('Failed to create transaction:', error);
        throw new Error('Transaction creation failed');
    }
}