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
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div><p class="text-sm font-semibold uppercase tracking-wide text-amber-600">Internal</p><h1 class="text-3xl font-bold text-gray-900">Sales requests</h1></div>
      <button type="button" class="rounded-lg border px-3 py-2 text-sm" @click="logout">Sign out</button>
    </header>
    <div class="mt-8 flex flex-wrap gap-2">
      <button v-for="value in ['', 'pending', 'accepted', 'rejected']" :key="value" type="button" class="rounded-lg px-3 py-2 text-sm" :class="filter === value ? 'bg-gray-900 text-white' : 'border'" @click="setFilter(value)">{{ value || 'All' }}</button>
    </div>
    <p v-if="error" class="mt-6 text-red-600" role="alert">Unable to load sales requests.</p>
    <p v-else-if="pending" class="mt-6 text-gray-500">Loading sales…</p>
    <p v-else-if="!data?.leads.length" class="mt-6 rounded-xl border border-dashed p-8 text-center text-gray-500">No sales requests found.</p>
    <div v-else class="mt-6 overflow-x-auto rounded-xl border bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b bg-gray-50"><tr><th class="p-3">Submitted</th><th class="p-3">Contact</th><th class="p-3">Offer</th><th class="p-3">Status</th><th class="p-3" /></tr></thead>
        <tbody class="divide-y">
          <tr v-for="lead in data.leads" :key="lead.id">
            <td class="p-3">{{ new Date(lead.created_at).toLocaleString() }}</td>
            <td class="p-3"><div class="font-medium">{{ lead.contact_name }}</div><div class="text-gray-500">{{ lead.contact_email }}</div></td>
            <td class="p-3 font-medium">{{ money(lead.total_offer_cents) }}</td>
            <td class="p-3 capitalize">{{ lead.status }}</td>
            <td class="p-3 text-right"><button type="button" class="text-amber-700 underline" @click="showLead(lead.id)">View</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedLead" class="mt-8 rounded-xl border bg-white p-6">
      <div class="flex justify-between gap-4"><h2 class="text-xl font-semibold">Sale details</h2><button type="button" class="text-gray-500" @click="selectedLead = null">Close</button></div>
      <pre class="mt-4 overflow-auto rounded bg-gray-50 p-3 text-xs">{{ JSON.stringify(selectedLead, null, 2) }}</pre>
      <div v-if="selectedLead.lead.status === 'pending'" class="mt-4 space-y-3">
        <textarea v-model="note" class="block w-full rounded-lg border px-3 py-2" maxlength="2000" placeholder="Internal note (optional)" />
        <div class="flex gap-2">
          <button type="button" class="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50" :disabled="!!busyId" @click="reviewSelected('accepted')">Accept</button>
          <button type="button" class="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50" :disabled="!!busyId" @click="reviewSelected('rejected')">Reject</button>
        </div>
      </div>
    </div>
  </main>
</template>
