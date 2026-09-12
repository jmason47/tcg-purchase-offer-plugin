<script setup lang="ts">
import type { Card, CreateLeadResponse, SelectedCard } from "~/types/offer";

const query = ref("");
const status = ref("");
const cards = ref<Card[]>([]);
const selected = ref(new Map<string, { card: Card; quantity: number }>());
const contact = reactive({ name: "", email: "", phone: "" });
const submitted = ref<CreateLeadResponse | null>(null);
const busy = ref(false);
const config = useRuntimeConfig();

async function search() {
  const value = query.value.trim();
  if (value.length < 2) {
    status.value = "Search must be at least 2 characters.";
    return;
  }
  busy.value = true;
  status.value = "Searching…";
  try {
    const response = await $fetch<{ cards: Card[] }>("/api/cards", { query: { q: value } });
    cards.value = response.cards;
    status.value = response.cards.length ? "" : "No cards found.";
  } catch {
    status.value = "We couldn't search cards right now. Please try again.";
  } finally {
    busy.value = false;
  }
}

function add(card: Card) {
  const next = new Map(selected.value);
  const current = next.get(card.id);
  next.set(card.id, { card, quantity: Math.min((current?.quantity ?? 0) + 1, 99) });
  selected.value = next;
}

function remove(cardId: string) {
  const next = new Map(selected.value);
  next.delete(cardId);
  selected.value = next;
}

function updateQuantity(cardId: string, value: string) {
  const current = selected.value.get(cardId);
  if (!current) return;
  const next = new Map(selected.value);
  next.set(cardId, { ...current, quantity: Math.max(1, Math.min(99, Number(value) || 1)) });
  selected.value = next;
}

async function submit() {
  if (!selected.value.size) {
    status.value = "Select at least one card.";
    return;
  }
  busy.value = true;
  status.value = "";
  try {
    submitted.value = await $fetch<CreateLeadResponse>("/api/leads", {
      method: "POST",
      body: {
        contact: { ...contact, phone: contact.phone || undefined },
        cards: [...selected.value].map(([cardId, value]): SelectedCard => ({
          cardId,
          quantity: value.quantity,
        })),
      },
    });
  } catch {
    status.value = "We couldn't submit your request. Please try again.";
  } finally {
    busy.value = false;
  }
}

const total = computed(() =>
  [...selected.value.values()].reduce(
    (sum, line) => sum + Math.round(line.card.marketPriceCents * Number(config.public.offerRate)) * line.quantity,
    0,
  ),
);

function money(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}
</script>

<template>
  <section v-if="submitted" class="rounded-xl border border-emerald-200 bg-emerald-50 p-6" role="status">
    <h2 class="text-xl font-semibold text-emerald-900">Request submitted</h2>
    <p class="mt-2 text-emerald-800">Thanks. Your request reference is <strong>{{ submitted.leadId }}</strong>.</p>
    <p class="mt-1 text-sm text-emerald-700">Estimated offer: {{ money(submitted.estimate.totalOfferCents) }}</p>
  </section>

  <section v-else class="space-y-6">
    <form class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" @submit.prevent="search">
      <label for="card-search" class="block text-sm font-medium text-gray-700">Card name</label>
      <div class="mt-2 flex gap-2">
        <input id="card-search" v-model="query" class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2" minlength="2" required placeholder="e.g. Charizard">
        <button class="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white disabled:opacity-50" :disabled="busy">Search</button>
      </div>
    </form>

    <p v-if="status" class="text-sm text-gray-600" role="status" aria-live="polite">{{ status }}</p>

    <div v-if="cards.length" class="divide-y rounded-xl border border-gray-200 bg-white">
      <article v-for="card in cards" :key="card.id" class="flex items-center justify-between gap-4 p-4">
        <div>
          <h2 class="font-semibold text-gray-900">{{ card.name }}</h2>
          <p class="text-sm text-gray-500">{{ card.setName }}<template v-if="card.number"> · #{{ card.number }}</template></p>
          <p class="text-sm text-gray-500">Market price: {{ money(card.marketPriceCents) }}</p>
        </div>
        <button type="button" class="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white" @click="add(card)">Add</button>
      </article>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 class="text-xl font-semibold text-gray-900">Selected cards</h2>
      <p v-if="!selected.size" class="mt-3 text-gray-500">No cards selected yet.</p>
      <ul v-else class="mt-3 divide-y">
        <li v-for="[cardId, line] in selected" :key="cardId" class="flex items-center justify-between gap-3 py-3">
          <span>{{ line.card.name }}</span>
          <span class="flex items-center gap-2">
            <input :value="line.quantity" class="w-16 rounded border px-2 py-1" type="number" min="1" max="99" :aria-label="`Quantity of ${line.card.name}`" @change="updateQuantity(cardId, ($event.target as HTMLInputElement).value)">
            <button type="button" class="text-sm text-red-600" @click="remove(cardId)">Remove</button>
          </span>
        </li>
      </ul>
      <p v-if="selected.size" class="mt-4 text-lg font-semibold">Estimated offer: {{ money(total) }}</p>
    </div>

    <form class="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm" @submit.prevent="submit">
      <h2 class="text-xl font-semibold text-gray-900">Your details</h2>
      <label class="block text-sm font-medium text-gray-700">Name<input v-model="contact.name" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" required maxlength="100"></label>
      <label class="block text-sm font-medium text-gray-700">Email<input v-model="contact.email" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" type="email" required maxlength="254"></label>
      <label class="block text-sm font-medium text-gray-700">Phone (optional)<input v-model="contact.phone" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2" type="tel" maxlength="30"></label>
      <button class="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50" :disabled="busy || !selected.size">Send sale request</button>
    </form>
  </section>
</template>
