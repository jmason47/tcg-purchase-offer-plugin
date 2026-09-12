import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { CreateLeadRequest, OfferEstimate } from "~/types/offer";

export interface LeadRepository {
  createLead(request: CreateLeadRequest, estimate: OfferEstimate): Promise<string>;
}

export function createLeadRepository(): LeadRepository {
  const config = useRuntimeConfig();
  const url = process.env.SUPABASE_URL;
  const key = config.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured");
  }
  return new SupabaseLeadRepository(createClient(url, key));
}

class SupabaseLeadRepository implements LeadRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createLead(request: CreateLeadRequest, estimate: OfferEstimate): Promise<string> {
    const leadId = randomUUID();
    const { error } = await this.client.rpc("create_offer_lead", {
      p_id: leadId,
      p_contact_name: request.contact.name,
      p_contact_email: request.contact.email,
      p_contact_phone: request.contact.phone ?? null,
      p_total_market_price_cents: estimate.totalMarketPriceCents,
      p_total_offer_cents: estimate.totalOfferCents,
      p_offer_rate: estimate.offerRate,
      p_priced_at: estimate.pricedAt,
      p_items: estimate.lines,
    });
    if (error) throw error;
    return leadId;
  }
}
