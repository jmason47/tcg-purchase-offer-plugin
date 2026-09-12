import type { Card } from "~/types/offer";

interface PokewalletCardResponse {
  id?: string;
  card_info?: { name?: string; set_name?: string; card_number?: string };
  images?: { small?: string; large?: string };
  imageUrl?: string;
  tcgplayer?: { prices?: Array<{ market_price?: number | string }> } | null;
  cardmarket?: { prices?: Array<{ avg?: number | string | null; trend?: number | string | null }> } | null;
}

export async function searchPokewallet(query: string, signal?: AbortSignal): Promise<Card[]> {
  const config = useRuntimeConfig();
  const url = new URL("/search", config.pokewalletApiUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");
  const response = await $fetch<{ results?: PokewalletCardResponse[] }>(url.toString(), {
    headers: config.pokewalletApiKey ? { "X-API-Key": config.pokewalletApiKey } : undefined,
    signal,
    timeout: 10_000,
  });
  return (response.results ?? []).flatMap(record => {
    const card = normalizeCard(record);
    return card ? [card] : [];
  });
}

function normalizeCard(record: PokewalletCardResponse): Card | null {
  const rawPrice =
    record.tcgplayer?.prices?.[0]?.market_price ??
    record.cardmarket?.prices?.find(price => price.avg != null)?.avg ??
    record.cardmarket?.prices?.find(price => price.trend != null)?.trend;
  const marketPrice = Number(rawPrice);
  const id = record.id;
  const name = record.card_info?.name;
  if (!id || !name || !Number.isFinite(marketPrice) || marketPrice < 0) return null;
  return {
    id,
    name,
    setName: record.card_info?.set_name ?? "Unknown set",
    number: record.card_info?.card_number,
    imageUrl: record.imageUrl ?? record.images?.small ?? record.images?.large,
    marketPriceCents: Math.round(marketPrice * 100),
  };
}
