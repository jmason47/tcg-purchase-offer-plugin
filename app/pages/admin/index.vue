<script setup lang="ts">
definePageMeta({ middleware: "admin" });

interface LeadSummary {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  total_offer_cents: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  reviewed_at?: string | null;
}

interface LeadDetail extends LeadSummary {
  total_market_price_cents: number;
  offer_rate: number;
  priced_at: string;
  reviewed_by?: string | null;
  internal_note?: string | null;
  offer_lead_items: Array<{
    id: number;
    card_id: string;
    card_name: string;
    card_variant?: string | null;
    card_condition: "NM" | "LP" | "MP" | "HP" | "DMG";
    quantity: number;
    market_price_cents: number;
    offer_price_cents: number;
  }>;
}

const client = useSupabaseClient();
const filter = ref<"pending" | "accepted" | "rejected" | "">("pending");
const selectedLead = ref<{ lead: LeadDetail } | null>(null);
const note = ref("");
const busyId = ref("");
const { data, pending, error, refresh } = await useFetch<{ leads: LeadSummary[]; total: number }>("/api/admin/leads", {
  query: computed(() => filter.value ? { status: filter.value } : {}),
});

async function review(lead: LeadSummary, status: "accepted" | "rejected") {
  busyId.value = lead.id;
  try {
    await $fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      body: { status, internalNote: note.value || undefined },
    });
    note.value = "";
    await refresh();
    if (selectedLead.value && selectedLead.value.lead.id === lead.id) selectedLead.value = null;
  } finally {
    busyId.value = "";
  }
}

async function showLead(id: string) {
  selectedLead.value = await $fetch<{ lead: LeadDetail }>(`/api/admin/leads/${id}`);
}

function setFilter(value: string) {
  if (value === "" || value === "pending" || value === "accepted" || value === "rejected") {
    filter.value = value;
  }
}

async function reviewSelected(status: "accepted" | "rejected") {
  if (selectedLead.value) await review(selectedLead.value.lead, status);
}

async function logout() {
  await client.auth.signOut();
  await navigateTo("/admin/login");
}

function money(cents: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);
}

function readableReference(leadId: string) {
  return `TOPDOG-${leadId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function conditionLabel(condition: string) {
  return ({
    NM: "Near Mint",
    LP: "Lightly Played",
    MP: "Moderately Played",
    HP: "Heavily Played",
    DMG: "Damaged",
  } as Record<string, string>)[condition] ?? condition;
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div><p class="text-sm font-semibold uppercase tracking-wide text-amber-400">Internal</p><h1 class="text-3xl font-bold text-white">Sales requests</h1></div>
      <button type="button" class="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" @click="logout">Sign out</button>
    </header>
    <div class="mt-8 flex flex-wrap gap-2">
      <button v-for="value in ['', 'pending', 'accepted', 'rejected']" :key="value" type="button" class="rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" :class="filter === value ? 'bg-amber-500 font-semibold text-black' : 'border border-neutral-700 text-neutral-300 hover:bg-neutral-900'" @click="setFilter(value)">{{ value || 'All' }}</button>
    </div>
    <p v-if="error" class="mt-6 text-red-400" role="alert">Unable to load sales requests.</p>
    <p v-else-if="pending" class="mt-6 text-neutral-400">Loading sales…</p>
    <p v-else-if="!data?.leads.length" class="mt-6 rounded-xl border border-dashed border-neutral-800 p-8 text-center text-neutral-400">No sales requests found.</p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-neutral-800 bg-neutral-900 text-neutral-200"><tr><th class="p-3">Submitted</th><th class="p-3">Contact</th><th class="p-3">Offer</th><th class="p-3">Status</th><th class="p-3" /></tr></thead>
        <tbody class="divide-y divide-neutral-800 text-neutral-300">
          <tr v-for="lead in data.leads" :key="lead.id">
            <td class="p-3">{{ new Date(lead.created_at).toLocaleString() }}</td>
            <td class="p-3"><div class="font-medium text-neutral-100">{{ lead.contact_name }}</div><div class="text-neutral-400">{{ lead.contact_email }}</div></td>
            <td class="p-3 font-medium">{{ money(lead.total_offer_cents) }}</td>
            <td class="p-3 capitalize">{{ lead.status }}</td>
            <td class="p-3 text-right"><button type="button" class="text-amber-400 underline hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" @click="showLead(lead.id)">View</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedLead" class="mt-8 rounded-xl border border-neutral-800 bg-neutral-950 p-6">
      <div class="flex justify-between gap-4"><h2 class="text-xl font-semibold text-neutral-100">Sale details</h2><button type="button" class="text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" @click="selectedLead = null">Close</button></div>
      <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p class="text-xs uppercase tracking-wide text-neutral-500">Reference</p><p class="mt-1 font-semibold text-neutral-100">{{ readableReference(selectedLead.lead.id) }}</p></div>
        <div><p class="text-xs uppercase tracking-wide text-neutral-500">Status</p><p class="mt-1 font-semibold capitalize text-neutral-100">{{ selectedLead.lead.status }}</p></div>
        <div><p class="text-xs uppercase tracking-wide text-neutral-500">Submitted</p><p class="mt-1 text-neutral-200">{{ new Date(selectedLead.lead.created_at).toLocaleString() }}</p></div>
        <div><p class="text-xs uppercase tracking-wide text-neutral-500">Offer rate</p><p class="mt-1 text-neutral-200">{{ Math.round(selectedLead.lead.offer_rate * 100) }}%</p></div>
      </div>
      <div class="mt-5 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h3 class="font-semibold text-neutral-100">Contact</h3>
        <p class="mt-2 text-neutral-200">{{ selectedLead.lead.contact_name }}</p>
        <p class="text-neutral-400">{{ selectedLead.lead.contact_email }}</p>
        <p v-if="selectedLead.lead.contact_phone" class="text-neutral-400">{{ selectedLead.lead.contact_phone }}</p>
      </div>
      <div class="mt-5 overflow-hidden rounded-lg border border-neutral-800">
        <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-neutral-900 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400"><span>Card</span><span>Qty</span><span>Offer</span></div>
        <div v-for="item in selectedLead.lead.offer_lead_items" :key="item.id" class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-t border-neutral-800 px-4 py-3 text-sm">
          <div><p class="font-medium text-neutral-100">{{ item.card_name }}<template v-if="item.card_variant"> · {{ item.card_variant }}</template></p><p class="text-neutral-400">{{ conditionLabel(item.card_condition) }}</p></div>
          <span class="text-neutral-300">{{ item.quantity }}</span>
          <span class="font-medium text-neutral-100">{{ money(item.offer_price_cents * item.quantity) }}</span>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap justify-end gap-x-6 gap-y-2 text-sm">
        <span class="text-neutral-400">Market reference: <strong class="text-neutral-200">{{ money(selectedLead.lead.total_market_price_cents) }}</strong></span>
        <span class="font-bold text-amber-400">Estimated offer: {{ money(selectedLead.lead.total_offer_cents) }}</span>
      </div>
      <details class="mt-5 rounded-lg border border-neutral-800 bg-neutral-900">
        <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-neutral-300">View full payload</summary>
        <pre class="overflow-auto border-t border-neutral-800 p-4 text-xs text-neutral-300">{{ JSON.stringify(selectedLead, null, 2) }}</pre>
      </details>
      <div v-if="selectedLead.lead.status === 'pending'" class="mt-4 space-y-3">
        <textarea v-model="note" class="block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-400" maxlength="2000" placeholder="Internal note (optional)" />
        <div class="flex gap-2">
          <button type="button" class="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50" :disabled="!!busyId" @click="reviewSelected('accepted')">Accept</button>
          <button type="button" class="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50" :disabled="!!busyId" @click="reviewSelected('rejected')">Reject</button>
        </div>
      </div>
    </div>
  </main>
</template>
