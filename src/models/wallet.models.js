import prisma from '../lib/prisma.js';
import logger from '../utils/winston.logger.js';

export async function getDefaultPerferedCurrency() {
    try {
        const defaultCurrency = await prisma.supportedCurrency.findFirst({
            where: { code: 'USD', isActive: true },
        });

        if (!defaultCurrency) {
            throw new Error('Default currency USD not found.');
        }

        return defaultCurrency;
    } catch (error) {
        console.error('Error fetching preferred currency:', error);
        throw new Error('Failed to fetch preferred currency');
    }
}

export async function getTokenNetwork(tokenId, networkId) {
    try {
        if (!tokenId || !networkId) {
            throw new Error('Token ID and Network ID are required');
        }

        const tokenNetwork = await prisma.tokenNetwork.findFirst({
            where: {
                tokenId,
                networkId,
            },
        });

        if (!tokenNetwork) {
            throw new Error('Token network not found');
        }

        return tokenNetwork;
    } catch (error) {
        console.error('Error fetching token network ID:', error);
        throw new Error('Failed to fetch token network ID');
    }
}

export async function getProsperaTokenprice(preferredCurrencyCode = 'USD') {
    try {
        const tokenPrice = await prisma.tokenPrice.findFirst({
            where: {
                token: { code: "PUSD" },
                quoteCurrency: { code: preferredCurrencyCode },
            },
            orderBy: {
                timestamp: 'desc',
            },
            include: {
                token: true,
                quoteCurrency: true,
            },
        });

        if (!tokenPrice) {
            throw new Error(`Token price for ${tokenCode} not found`);
        }

        return tokenPrice;
    } catch (error) {
        console.error('Error fetching Prospera token price:', error);
        throw new Error('Failed to fetch Prospera token price');
    }
}

export async function getPusdTokenNetworkId() {
    try {
        // fetch token
        const token = await prisma.supportedToken.findUnique({
            where: { code: "PUSD" },
            select: { id: true },
        });

        if (!token) {
            throw new Error("PUSD token not found");
        }

        // fetch network
        const network = await prisma.supportedNetwork.findUnique({
            where: { code: "PUSD" },
            select: { id: true },
        });

        if (!network) {
            throw new Error("PUSD network not found");
        }

        // fetch tokenNetwork
        const tokenNetwork = await prisma.tokenNetwork.findUnique({
            where: {
                tokenId_networkId: {
                    tokenId: token.id,
                    networkId: network.id,
                },
            },
            select: { id: true },
        });

        if (!tokenNetwork) {
            throw new Error("TokenNetwork for PUSD not found");
        }

        return tokenNetwork.id;
    } catch (error) {
        logger.error("Error fetching PUSD TokenNetworkId:", error);
        throw error;
    }
}

export async function getUserWallet(userId, tokenNetworkId) {
    try {
        const userVault = await prisma.userVault.findFirst({
            where: {
                userId,
            },
        });
        if (!userVault) {
            return null;
        }

        const wallet = await prisma.wallet.findUnique({
            where: {
                userVaultId_tokenNetworkId: {
                    userVaultId: userVault.id,
                    tokenNetworkId,
                },
            },
            include: {
                tokenNetwork: true, // optional if you want network details
            },
        });

        return wallet;
    } catch (error) {
        console.error('Error fetching user wallet:', error);
        throw new Error('Failed to fetch user wallet');
    }
}   

export async function getExchangeRate(currencyId, referenceCurrencyId) {
    try {
        let defaultCurrency;
        if(!referenceCurrencyId) {
            defaultCurrency = await prisma.supportedCurrency.findFirst({
                where: { code: 'USD', isActive: true },
            });

            if (!defaultCurrency) {
                throw new Error('Default currency USD not found.');
            }
            referenceCurrencyId = defaultCurrency.id;
        }
        if (currencyId === referenceCurrencyId) {
            console.log('No conversion needed');
            return 1; // No conversion needed
        }

        const exchangeRate = await prisma.currencyPrice.findFirst({
            where: {
                currencyId,
                referenceCurrencyId,
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        if (!exchangeRate) {
            throw new Error(`Exchange rate for ${currencyCode} to ${preferredCurrencyCode} not found`);
        }

        return exchangeRate.price;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        throw new Error('Failed to fetch exchange rate');
    }    
}

export async function getCryptoExchangeRate(tokenId, referenceCurrencyId) {
    try {
        let defaultCurrency;
        if(!referenceCurrencyId) {
            defaultCurrency = await prisma.supportedCurrency.findFirst({
                where: { code: 'USD', isActive: true },
            });

            if (!defaultCurrency) {
                throw new Error('Default currency USD not found.');
            }
            referenceCurrencyId = defaultCurrency.id;
        }

        const exchangeRate = await prisma.tokenPrice.findFirst({
            where: {
                tokenId,
                quoteCurrencyId: referenceCurrencyId,
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        if (!exchangeRate) {
            return 0;
            throw new Error(`Exchange rate for ${tokenId} to ${defaultCurrency?.code} not found`);
        }

        return exchangeRate.price;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        throw new Error('Failed to fetch exchange rate');
    }  
}