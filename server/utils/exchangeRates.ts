interface FrankfurterRate {
  base: string;
  quote: string;
  rate: number;
}

export interface ExchangeRates {
  eurToGbp: number;
  usdToGbp: number;
}

interface CachedRates {
  rates: ExchangeRates;
  expiresAt: number;
}

let cachedRates: CachedRates | undefined;

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  if (cachedRates && cachedRates.expiresAt > now) return cachedRates.rates;

  const config = useRuntimeConfig();
  const fallback = {
    eurToGbp: Number(config.eurToGbpRate),
    usdToGbp: Number(config.usdToGbpRate),
  };

  try {
    const url = new URL("/v2/rates", config.fxApiUrl);
    url.searchParams.set("providers", "ECB");
    url.searchParams.set("base", "EUR");
    url.searchParams.set("quotes", "GBP,USD");
    const response = await $fetch<FrankfurterRate[]>(url.toString(), { timeout: 5_000 });
    const eurToGbp = response.find(rate => rate.quote === "GBP")?.rate;
    const eurToUsd = response.find(rate => rate.quote === "USD")?.rate;
    if (!eurToGbp || !eurToUsd || eurToGbp <= 0 || eurToUsd <= 0) throw new Error("Incomplete exchange-rate response");

    const rates = { eurToGbp, usdToGbp: eurToGbp / eurToUsd };
    cachedRates = { rates, expiresAt: now + 24 * 60 * 60 * 1000 };
    return rates;
  } catch (error) {
    console.warn("Unable to fetch live exchange rates; using configured fallback rates", error);
    cachedRates = { rates: fallback, expiresAt: now + 5 * 60 * 1000 };
    return fallback;
  }
}
