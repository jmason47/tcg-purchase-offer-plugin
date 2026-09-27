import type { Card } from "~/types/offer";
import { getExchangeRates, type ExchangeRates } from "./exchangeRates";

interface PokewalletCardResponse {
  id?: string;
  card_info?: { name?: string; set_name?: string; card_number?: string };
  images?: { small?: string; large?: string };
  imageUrl?: string;
  tcgplayer?: { url?: string; prices?: Array<{ sub_type_name?: string; market_price?: number | string }> } | null;
  cardmarket?: { product_url?: string; prices?: Array<{ avg?: number | string | null; avg7?: number | string | null; avg30?: number | string | null; trend?: number | string | null; variant_type?: string }> } | null;
}

export async function searchPokewallet(query: string, signal?: AbortSignal): Promise<Card[]> {
  const config = useRuntimeConfig();
  const rates = await getExchangeRates();
  const response = await fetchPokewalletResults(query, config, signal);
  let results = response.results ?? [];
  for (const fallbackQuery of broadenSearchQueries(query)) {
    if (results.length) break;
    results = (await fetchPokewalletResults(fallbackQuery, config, signal)).results ?? [];
  }
  return normalizeRecords(results, rates);
}

export async function getPokewalletCard(id: string, signal?: AbortSignal): Promise<Card[]> {
  const config = useRuntimeConfig();
  const rates = await getExchangeRates();
  const url = new URL(`/cards/${encodeURIComponent(id)}`, config.pokewalletApiUrl);
  const record = await $fetch<PokewalletCardResponse>(url.toString(), {
    headers: config.pokewalletApiKey ? { "X-API-Key": config.pokewalletApiKey } : undefined,
    signal,
    timeout: 10_000,
  });
  return normalizeRecords([record], rates);
}

function normalizeRecords(records: PokewalletCardResponse[], rates: ExchangeRates): Card[] {
  const cards = records.flatMap(record => {
    if (record.tcgplayer?.prices?.length) {
      const matchedCardMarketVariants = new Set<string>();
      const cards = record.tcgplayer.prices.flatMap(price => {
        const card = normalizeCard(record, price, findMatchingCardMarketPrice(record, price.sub_type_name), rates);
        const matchedPrice = findMatchingCardMarketPrice(record, price.sub_type_name);
        if (matchedPrice?.variant_type) matchedCardMarketVariants.add(matchedPrice.variant_type);
        return card ? [card] : [];
      });
      const hasHolofoilTcgPrice = record.tcgplayer.prices.some(price =>
        price.sub_type_name?.toLowerCase().includes("holo"),
      );
      if (!hasHolofoilTcgPrice) {
        cards.push(...(record.cardmarket?.prices ?? [])
          .filter(price => price.variant_type === "holo" && !matchedCardMarketVariants.has("holo"))
          .flatMap(price => {
            const card = normalizeCard(record, undefined, price, rates);
            return card ? [card] : [];
          }));
      }
      return cards;
    }
    if (record.cardmarket?.prices?.length) {
      return record.cardmarket.prices.flatMap(price => {
        const card = normalizeCard(record, undefined, price, rates);
        return card ? [card] : [];
      });
    }
    const card = normalizeCard(record, undefined, undefined, rates);
    return card ? [card] : [];
  });
  return [...new Map(cards.map(card => [`${card.id}::${card.variant ?? "default"}`, card])).values()];
}

async function fetchPokewalletResults(
  query: string,
  config: ReturnType<typeof useRuntimeConfig>,
  signal?: AbortSignal,
) {
  const url = new URL("/search", config.pokewalletApiUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "100");
  return await $fetch<{ results?: PokewalletCardResponse[] }>(url.toString(), {
    headers: config.pokewalletApiKey ? { "X-API-Key": config.pokewalletApiKey } : undefined,
    signal,
    timeout: 10_000,
  });
}

function broadenSearchQueries(query: string): string[] {
  const terms = query.trim().split(/\s+/);
  return Array.from({ length: Math.max(terms.length - 2, 0) }, (_, index) =>
    terms.slice(0, terms.length - index - 1).join(" "),
  );
}

function findMatchingCardMarketPrice(
  record: PokewalletCardResponse,
  tcgVariant?: string,
) {
  const prices = record.cardmarket?.prices ?? [];
  const cardMarketVariant = tcgVariant?.toLowerCase().includes("holo") ? "holo" : "normal";
  return prices.find(price => price.variant_type === cardMarketVariant && hasUsableCardMarketPrice(price)) ??
    prices.find(price => hasUsableCardMarketPrice(price));
}

function hasUsableCardMarketPrice(price: {
  avg7?: number | string | null;
  avg30?: number | string | null;
  avg?: number | string | null;
  trend?: number | string | null;
}): boolean {
  return [price.avg7, price.avg30, price.avg, price.trend]
    .some(value => value != null && Number(value) > 0);
}

export function normalizeCard(
  record: PokewalletCardResponse,
  tcgPlayerEntry = record.cardmarket?.prices?.length ? undefined : record.tcgplayer?.prices?.[0],
  cardMarketEntry = record.cardmarket?.prices?.find(price => price.avg7 != null) ??
    record.cardmarket?.prices?.find(price => price.avg30 != null) ??
    record.cardmarket?.prices?.find(price => price.avg != null) ??
    record.cardmarket?.prices?.find(price => price.trend != null),
  rates?: ExchangeRates,
): Card | null {
  const tcgPlayerPrice = tcgPlayerEntry?.market_price;
  const cardMarketPrice = conservativeCardMarketPrice(cardMarketEntry);
  const rawPrice = cardMarketPrice ?? tcgPlayerPrice;
  const config = useRuntimeConfig();
  const exchangeRates = rates ?? {
    eurToGbp: Number(config.eurToGbpRate),
    usdToGbp: Number(config.usdToGbpRate),
  };
  const exchangeRate = cardMarketPrice != null
    ? exchangeRates.eurToGbp
    : exchangeRates.usdToGbp;
  const marketPrice = Number(rawPrice) * exchangeRate;
  const id = record.id;
  const name = record.card_info?.name;
  if (!id || !name || !Number.isFinite(marketPrice) || marketPrice <= 0) return null;
  return {
    id,
    name,
    setName: record.card_info?.set_name ?? "Unknown set",
    number: record.card_info?.card_number,
    variant: tcgPlayerEntry?.sub_type_name ?? formatCardMarketVariant(cardMarketEntry?.variant_type),
    tcgplayerUrl: record.tcgplayer?.url,
    cardmarketUrl: record.cardmarket?.product_url,
    imageUrl: record.imageUrl ?? record.images?.small ?? record.images?.large,
    marketPriceCents: Math.round(marketPrice * 100),
  };
}

function conservativeCardMarketPrice(price?: {
  avg7?: number | string | null;
  avg30?: number | string | null;
  avg?: number | string | null;
  trend?: number | string | null;
}): number | undefined {
  if (!price) return undefined;
  // Short-term averages can be distorted by a small number of high-value sales.
  // Use the lowest valid signal so the purchase estimate does not overstate value.
  const values = [price.avg7, price.avg30, price.avg, price.trend]
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : undefined;
}

function formatCardMarketVariant(variant?: string): string | undefined {
  if (!variant) return undefined;
  if (variant === "normal") return "Normal";
  if (variant === "holo") return "Holofoil";
  return variant;
}
