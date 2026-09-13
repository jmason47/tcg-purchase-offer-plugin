# Pokémon Purchase Offers

A standalone Nuxt application for searching Pokémon cards, calculating an
estimated purchase offer at 65% of the PokéWallet market price, and submitting
a sale lead.

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. PokéWallet search requires
`NUXT_POKEWALLET_API_KEY` when the upstream API is configured to require one.
Supabase credentials are needed to submit leads.

## Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run db:push
```

The production server is generated in `.output/` and runs with:

```bash
node .output/server/index.mjs
```

## Admin sales review

The public form does not require an account. Admins sign in at
`/admin/login` using Supabase Auth and can review submitted sales at `/admin`.

After applying the migrations:

1. Create an email/password user in Supabase Authentication.
2. Copy that user's UUID.
3. Add it to the new project's `admin_users` table:

```sql
insert into public.admin_users (user_id)
values ('<auth-user-uuid>');
```

Only allowlisted users can read sales or change a sale from `pending` to
`accepted` or `rejected`. Review metadata is stored for future notification
integrations; this version does not send email.

## Architecture

- `app/` contains the standalone Vue experience.
- `server/api/` contains Nitro routes for search, health, and lead submission.
- `server/utils/` contains server-only pricing, PokéWallet, and Supabase logic.
- `supabase/migrations/` contains the offer-lead schema.

The browser never submits a trusted price. The server resolves selected cards
again through PokéWallet, calculates the estimate, and persists the lead and
its line items with server-only Supabase credentials.

## Environment

See `.env.example`. `NUXT_OFFER_RATE` defaults to `0.65`.
Exchange rates are fetched daily from Frankfurter using ECB reference rates.
`NUXT_USD_TO_GBP_RATE` and `NUXT_EUR_TO_GBP_RATE` remain as fallback values if
the rate service is unavailable. Supabase service credentials must never be
exposed through `NUXT_PUBLIC_*` variables.

## Email notifications

New purchase requests are emailed through Resend. Set these Vercel environment
variables:

```bash
NUXT_RESEND_API_KEY=<resend-api-key>
NUXT_RESEND_FROM_EMAIL=notifications@topdogtcg.com
NUXT_PUBLIC_APP_URL=https://<production-domain>
```

The `topdogtcg.com` domain must be verified in Resend before using
`notifications@topdogtcg.com` as the sender. Apply the Supabase migrations,
including `00006_notification_settings.sql`, to create the default recipient
`contact@topdogtcg.com`. Authenticated admins can add or remove recipients
from the Email notifications section of the admin page.
