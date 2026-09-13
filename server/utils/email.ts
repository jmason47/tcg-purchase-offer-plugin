import { Resend } from "resend";
import type { CreateLeadRequest, EstimateLine, OfferEstimate } from "~/types/offer";
import { createClient } from "@supabase/supabase-js";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);
}

function conditionLabel(condition: EstimateLine["condition"]) {
  return ({
    NM: "Near Mint",
    LP: "Lightly Played",
    MP: "Moderately Played",
    HP: "Heavily Played",
    DMG: "Damaged",
  })[condition];
}

async function getRecipients() {
  const config = useRuntimeConfig();
  const url = process.env.SUPABASE_URL;
  const key = config.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");

  const client = createClient(url, key);
  const { data, error } = await client
    .from("notification_settings")
    .select("recipient_emails")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data.recipient_emails as string[];
}

function lineText(line: EstimateLine) {
  const variant = line.variant ? `, ${line.variant}` : "";
  return `${line.quantity} x ${line.name}${variant} (${conditionLabel(line.condition)}): market ${money(line.marketPriceCents)} each, offer ${money(line.offerPriceCents)} each, total ${money(line.totalOfferCents)}`;
}

export async function sendLeadNotification(
  request: CreateLeadRequest,
  estimate: OfferEstimate,
  leadId: string,
) {
  const config = useRuntimeConfig();
  if (!config.resendApiKey) {
    console.warn("NUXT_RESEND_API_KEY is not configured; skipping lead notification");
    return;
  }

  const recipients = await getRecipients();
  const appUrl = String(config.public.appUrl).replace(/\/$/, "");
  const adminUrl = `${appUrl}/admin?lead=${encodeURIComponent(leadId)}`;
  const reference = `TOPDOG-${leadId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const lines = estimate.lines.map(lineText);
  const subject = `New purchase request ${reference} from ${request.contact.name}`;
  const text = [
    "A new Pokémon card purchase request has been submitted.",
    "",
    `Reference: ${reference}`,
    `Name: ${request.contact.name}`,
    `Email: ${request.contact.email}`,
    `Phone: ${request.contact.phone || "Not provided"}`,
    "",
    "Cards:",
    ...lines.map(line => `- ${line}`),
    "",
    `Market reference total: ${money(estimate.totalMarketPriceCents)}`,
    `Estimated offer total: ${money(estimate.totalOfferCents)}`,
    `Offer rate: ${Math.round(estimate.offerRate * 100)}%`,
    "",
    `Open this request in the admin panel: ${adminUrl}`,
  ].join("\n");
  const htmlLines = estimate.lines.map(line => `<li>${escapeHtml(lineText(line))}</li>`).join("");
  const html = `
    <h2>New Pokémon card purchase request</h2>
    <p>A new request has been submitted.</p>
    <p><strong>Reference:</strong> ${escapeHtml(reference)}<br>
    <strong>Name:</strong> ${escapeHtml(request.contact.name)}<br>
    <strong>Email:</strong> ${escapeHtml(request.contact.email)}<br>
    <strong>Phone:</strong> ${escapeHtml(request.contact.phone || "Not provided")}</p>
    <h3>Cards</h3>
    <ul>${htmlLines}</ul>
    <p><strong>Market reference total:</strong> ${money(estimate.totalMarketPriceCents)}<br>
    <strong>Estimated offer total:</strong> ${money(estimate.totalOfferCents)}<br>
    <strong>Offer rate:</strong> ${Math.round(estimate.offerRate * 100)}%</p>
    <p><a href="${escapeHtml(adminUrl)}">Open this request in the admin panel</a></p>
  `;

  const resend = new Resend(config.resendApiKey);
  const { error } = await resend.emails.send({
    from: String(config.resendFromEmail),
    to: recipients,
    replyTo: request.contact.email,
    subject,
    text,
    html,
  });
  if (error) throw error;
}
