// src/services/priceUpdater.ts
import axios from "axios";
import prisma from "../../lib/prisma.js";
import 'dotenv/config';
import { getSupportedAssets } from "../fireblock/index.js";

const API_KEY = process.env.EXCHANGE_RATE_API_KEY; // store your API key in .env

export async function updateCurrencyPrices() {
    try {
        console.log("🔄 Updating currency prices (ExchangeRate API)...");

        // 1. Fetch rates from API
        const { data } = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);

        if (data.result !== "success") {
            throw new Error("ExchangeRate API returned error");
        }

        const rates = data.conversion_rates;

        // 2. Find reference currency (USD)
        const usdCurrency = await prisma.supportedCurrency.findUnique({
            where: { code: "USD" },
        });

        if (!usdCurrency) {
            throw new Error("USD not found in supported_currencies table");
        }

        // 3. Fetch all supported currencies
        const supportedCurrencies = await prisma.supportedCurrency.findMany({
            where: { isActive: true },
        });

        // console.log(`Found ${supportedCurrencies.length} active supported currencies.`, supportedCurrencies);

        if (supportedCurrencies.length === 0) {
            console.log("No active supported currencies to update.");
            return;
        }


        // 4. Loop through and update
        for (const currency of supportedCurrencies) {
            if (!rates[currency.code]) {
                console.log(`⚠️ No rate found for ${currency.code}`);
                continue;
            }

            const price = rates[currency.code];
            let priceInUSD;
            if (currency.code === "USD") {
                priceInUSD = 1; // USD = 1 USD
            } else {
                // API gives: 1 USD = rates[currency.code] (e.g., 88.21 INR)
                // We want: 1 currency = ? USD → inverse
                priceInUSD = 1 / rates[currency.code];
            }

            console.log(`Updating ${currency.code} price to ${priceInUSD} USD`);

            await prisma.currencyPrice.upsert({
                where: {
                    currencyId_referenceCurrencyId: {
                        currencyId: currency.id,
                        referenceCurrencyId: usdCurrency.id,
                    },
                },
                update: {
                    price: priceInUSD,
                    timestamp: new Date(),
                },
                create: {
                    currencyId: currency.id,
                    referenceCurrencyId: usdCurrency.id,
                    price: priceInUSD,
                },
            });
        }

        console.log("✅ Currency prices updated successfully.");
    } catch (error) {
        console.error("❌ Error updating currency prices:", error);
    }
}

export async function updateTokenPrices() {
    try {
        console.log("🔄 Updating token prices...");

        // 1. Fetch active tokens
        const tokens = await prisma.supportedToken.findMany({
            where: { isActive: true },
        });

        if (!tokens.length) {
            console.log("⚠️ No active tokens found.");
            return;
        }

        // 2. Fetch reference currency (USD)
        const usdCurrency = await prisma.supportedCurrency.findUnique({
            where: { code: "USD" },
        });

        if (!usdCurrency) {
            throw new Error("USD not found in supported_currencies");
        }

        // 3. Map token codes to CoinGecko IDs
        // ⚠️ NOTE: You may need a mapping table because your DB codes (`ETH_TEST5`, `PUSD`) may not exist on CoinGecko
        const tokenMap = {
            ETH_TEST5: "ethereum",       // replace with real coingecko id
            USDC_NOBLE_TEST: "usd-coin",
            PUSD: "tether",              // fallback stablecoin
        };

        const ids = Object.values(tokenMap).join(",");

        // 4. Fetch prices from CoinGecko (all in USD)
        const { data } = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
        );

        // 5. Loop through tokens and save prices
        for (const token of tokens) {
            const coingeckoId = tokenMap[token.code];
            if (!coingeckoId) {
                console.log(`⚠️ No mapping found for ${token.code}`);
                continue;
            }

            const price = data[coingeckoId]?.usd;
            if (!price) {
                console.log(`⚠️ No price found for ${token.code}`);
                continue;
            }

            
            await prisma.tokenPrice.upsert({
                where: {
                    tokenId_quoteCurrencyId: {
                        tokenId: token.id,
                        quoteCurrencyId: usdCurrency.id,
                    },
                },
                update: {
                    price,
                    timestamp: new Date(),
                },
                create: {
                    tokenId: token.id,
                    quoteCurrencyId: usdCurrency.id,
                    price,
                },
            });
            console.log(`Updating ${token.code} price to ${price} USD`);
        }

        console.log("✅ Token prices updated successfully.");
    } catch (error) {
        console.error("❌ Error updating token prices:", error);
    }
}

export async function updateTokenListings() {
    const assets = await getSupportedAssets(); // <- your Fireblocks call

    for (const asset of assets) {
        try {
            await addAsset(asset);
        } catch (err) {
            console.error(`Error adding asset ${asset.displaySymbol}:`, err.message);
        }
    }
    console.log("✅ Token Listing updated successfully.");
}

async function addAsset(asset) {
    const tokenCode = asset.displaySymbol; // e.g. MATIC_T
    const tokenName = asset.displayName;   // e.g. MATIC (Goerli)
    const tokenSymbol = (asset.onchain && asset.onchain.symbol) || asset.displaySymbol;
    const isDeprecated = asset.metadata && asset.metadata.deprecated === true;
    const tokenIsActive = !isDeprecated;

    // Fireblocks asset ID
    const fbAssetId = asset.legacyId;

    if (isDeprecated) {
        const existingToken = await prisma.supportedToken.findUnique({
            where: { code: tokenCode },
        });
        if (existingToken) {
            await prisma.tokenNetwork.deleteMany({ where: { tokenId: existingToken.id } });
            await prisma.supportedToken.delete({ where: { code: tokenCode } });
            console.log(`Removed deprecated asset: ${tokenCode}`);
        }
        return;
    }

    // Extract network name/symbol safely
    const networkName = asset.onchain?.name || "UNKNOWN";
    const networkCode = asset.onchain?.symbol || tokenCode;
    const networkFireblocksSuffix = asset.displaySymbol;
    const networkIsActive = tokenIsActive;

    // --- SupportedToken ---
    let token = await prisma.supportedToken.findUnique({
        where: { code: tokenCode },
    });

    if (token) {
        // Only update if something actually changed
        if (
            token.name !== tokenName ||
            token.symbol !== tokenSymbol
        ) {
            token = await prisma.supportedToken.update({
                where: { code: tokenCode },
                data: {
                    name: tokenName,
                    symbol: tokenSymbol,
                    logoUrl: null,
                },
            });
            console.log(`Updated token: ${tokenCode}`);
        }
    } else {
        token = await prisma.supportedToken.create({
            data: {
                code: tokenCode,
                name: tokenName,
                symbol: tokenSymbol,
                logoUrl: null,
                isActive: false,
            },
        }); 
        console.log(`Created token: ${tokenCode}`);
    }

    // --- SupportedNetwork ---
    const network = await prisma.supportedNetwork.upsert({
        where: { code: networkCode },
        update: {
            name: networkName,
            fireblocksAssetSuffix: networkFireblocksSuffix,
            logoUrl: null,
            isActive: networkIsActive,
        },
        create: {
            code: networkCode,
            name: networkName,
            fireblocksAssetSuffix: networkFireblocksSuffix,
            logoUrl: null,
            isActive: networkIsActive,
        },
    });

    // --- TokenNetwork ---
    const existingTokenNetwork = await prisma.tokenNetwork.findFirst({
        where: {
            tokenId: token.id,
            networkId: network.id,
        },
    });

    if (existingTokenNetwork) {
        await prisma.tokenNetwork.update({
            where: { id: existingTokenNetwork.id },
            data: {
                fireblocksAssetId: fbAssetId,
                isActive: tokenIsActive,
            },
        });
    } else {
        await prisma.tokenNetwork.create({
            data: {
                tokenId: token.id,
                networkId: network.id,
                fireblocksAssetId: fbAssetId,
                isActive: tokenIsActive,
            },
        });
    }

    console.log(`Seeded: ${tokenCode} on ${networkCode}`);
}
