alter table public.offer_lead_items
  add column card_condition text not null default 'NM'
  check (card_condition in ('NM', 'LP', 'MP', 'HP', 'DMG'));

create or replace function public.create_offer_lead(
  p_id uuid,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_total_market_price_cents integer,
  p_total_offer_cents integer,
  p_offer_rate numeric,
  p_priced_at timestamptz,
  p_items jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.offer_leads (
    id, contact_name, contact_email, contact_phone,
    total_market_price_cents, total_offer_cents, offer_rate, priced_at
  ) values (
    p_id, p_contact_name, p_contact_email, p_contact_phone,
    p_total_market_price_cents, p_total_offer_cents, p_offer_rate, p_priced_at
  );

  insert into public.offer_lead_items (
    lead_id, card_id, card_name, card_condition, quantity,
    market_price_cents, offer_price_cents
  )
  select
    p_id, item->>'cardId', item->>'name', coalesce(item->>'condition', 'NM'),
    (item->>'quantity')::integer,
    (item->>'marketPriceCents')::integer,
    (item->>'offerPriceCents')::integer
  from jsonb_array_elements(p_items) item;
end;
$$;
