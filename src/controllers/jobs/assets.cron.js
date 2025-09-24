import cron from "node-cron";
import { updateCurrencyPrices, updateTokenListings, updateTokenPrices } from "../services/assets/priceUpdater.js";

// Every 15 minutes
cron.schedule("*/15 * * * *", async () => {
    await updateCurrencyPrices();
    await updateTokenPrices();
});

cron.schedule("0 0 * * *", async () => {
    await updateTokenListings();
});
