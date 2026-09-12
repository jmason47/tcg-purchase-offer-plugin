<script setup lang="ts">
import { CONDITION_MULTIPLIERS, type Card, type CardCondition, type CreateLeadResponse, type SelectedCard } from "~/types/offer";

const query = ref("");
const status = ref("");
const cards = ref<Card[]>([]);
const selected = ref(new Map<string, { card: Card; quantity: number; condition: CardCondition }>());
const contact = reactive({ name: "", email: "", phone: "" });
const submitted = ref<CreateLeadResponse | null>(null);
const conditionOptions: Array<{ value: CardCondition; label: string }> = [
  { value: "NM", label: "Near Mint (NM)" },
  { value: "LP", label: "Lightly Played (LP)" },
  { value: "MP", label: "Moderately Played (MP)" },
  { value: "HP", label: "Heavily Played (HP)" },
  { value: "DMG", label: "Damaged (DMG)" },
];
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchSequence = 0;
const busy = ref(false);
const config = useRuntimeConfig();

async function search() {
  if (searchTimer) clearTimeout(searchTimer);
  const value = query.value.trim();
  if (value.length < 2) {
    status.value = "Search must be at least 2 characters.";
    return;
  }
  const sequence = ++searchSequence;
  busy.value = true;
  status.value = "Searching…";
  try {
    const response = await $fetch<{ cards: Card[] }>("/api/cards", { query: { q: value } });
    if (sequence !== searchSequence) return;
    cards.value = response.cards;
    status.value = response.cards.length ? "" : "No cards found.";
  } catch {
    if (sequence !== searchSequence) return;
    status.value = "We couldn't search cards right now. Please try again.";
  } finally {
    if (sequence === searchSequence) busy.value = false;
  }
}

watch(query, () => {
  if (searchTimer) clearTimeout(searchTimer);
  if (query.value.trim().length < 2) {
    searchSequence += 1;
    cards.value = [];
    status.value = "";
    busy.value = false;
    return;
  }
  searchTimer = setTimeout(() => void search(), 350);
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

function add(card: Card) {
  const next = new Map(selected.value);
  const key = selectionKey(card);
  const current = next.get(key);
  next.set(key, { card, quantity: Math.min((current?.quantity ?? 0) + 1, 99), condition: current?.condition ?? "NM" });
  selected.value = next;
}

function selectionKey(card: Card) {
  return `${card.id}::${card.variant ?? "default"}`;
}

function remove(selectionId: string) {
  const next = new Map(selected.value);
  next.delete(selectionId);
  selected.value = next;
}

function updateQuantity(selectionId: string, value: string) {
  const current = selected.value.get(selectionId);
  if (!current) return;
  const next = new Map(selected.value);
  next.set(selectionId, { ...current, quantity: Math.max(1, Math.min(99, Number(value) || 1)) });
  selected.value = next;
}

function updateCondition(selectionId: string, condition: string) {
  const current = selected.value.get(selectionId);
  if (!current || !conditionOptions.some(option => option.value === condition)) return;
  const next = new Map(selected.value);
  next.set(selectionId, { ...current, condition: condition as CardCondition });
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
        cards: [...selected.value].map(([, value]): SelectedCard => ({
          cardId: value.card.id,
          quantity: value.quantity,
          variant: value.card.variant,
          condition: value.condition,
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
    (sum, line) => sum + Math.round(line.card.marketPriceCents * CONDITION_MULTIPLIERS[line.condition] * Number(config.public.offerRate)) * line.quantity,
    0,
  ),
);

function money(cents: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);
}

function readableReference(leadId: string) {
  return `TOPDOG-${leadId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
</script>

<template>
  <section v-if="submitted" class="mx-auto max-w-2xl rounded-2xl border border-emerald-800 bg-emerald-950/60 p-6 shadow-sm sm:p-8" role="status">
    <p class="text-sm font-bold uppercase tracking-[0.15em] text-emerald-400">TopDog TCG</p>
    <h2 class="mt-2 text-2xl font-bold text-emerald-100">Request submitted</h2>
    <p class="mt-2 text-emerald-200">Thanks. Your request reference is <strong>{{ readableReference(submitted.leadId) }}</strong>.</p>
    <p class="mt-1 text-sm text-emerald-300">Estimated offer: {{ money(submitted.estimate.totalOfferCents) }}</p>
    <p class="mt-2 text-sm text-emerald-300">This estimate uses aggregate marketplace data and may change after reviewing card condition or making manual corrections. For niche individual vintage cards, <a class="font-semibold underline underline-offset-2 hover:text-emerald-200" href="https://www.topdogtcg.com/contact-us" target="_blank" rel="noreferrer">contact us directly</a>.</p>
  </section>

  <section v-else class="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] lg:items-start">
    <div class="space-y-6">
    <form class="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-sm sm:p-6" @submit.prevent="search">
      <label for="card-search" class="block text-sm font-semibold text-neutral-100">Find a card</label>
      <div class="mt-2 flex gap-2">
        <input id="card-search" v-model="query" class="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-neutral-100 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" minlength="2" required placeholder="e.g. Charizard">
        <button class="rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-black transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="busy">Search</button>
      </div>
    </form>

    <p v-if="status" class="text-sm text-neutral-300" role="status" aria-live="polite">{{ status }}</p>

    <div v-if="cards.length" class="divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-sm">
      <article v-for="card in cards" :key="card.id" class="flex items-center justify-between gap-4 p-4 transition hover:bg-neutral-900 sm:p-5">
        <div>
          <h2 class="font-semibold text-neutral-100">{{ card.name }}</h2>
          <p class="text-sm text-neutral-400">
            {{ card.setName }}<template v-if="card.number"> · #{{ card.number }}</template>
            <template v-if="card.variant"> · {{ card.variant }}</template>
          </p>
          <p class="mt-1 text-sm font-medium text-neutral-300">Offer price: {{ money(Math.round(card.marketPriceCents * Number(config.public.offerRate))) }}</p>
        </div>
        <button type="button" class="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-black transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2" @click="add(card)">Add</button>
      </article>
    </div>
    </div>

    <div class="space-y-6">
    <div class="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-sm sm:p-6">
      <p class="text-sm font-bold uppercase tracking-[0.15em] text-amber-400">Your list</p>
      <h2 class="mt-1 text-xl font-bold text-neutral-100">Selected cards</h2>
      <p class="mt-2 text-sm text-amber-200">Prices are estimates based on aggregate marketplace data and may change based on card condition or manual correction. For niche or expensive vintage cards, please <a class="font-semibold underline underline-offset-2 hover:text-amber-100" href="https://www.topdogtcg.com/" target="_blank" rel="noreferrer">contact us directly</a>.</p>
      <p v-if="!selected.size" class="mt-3 text-neutral-400">No cards selected yet.</p>
      <ul v-else class="mt-3 divide-y divide-neutral-800">
        <li v-for="[selectionId, line] in selected" :key="selectionId" class="flex flex-col gap-3 py-3">
          <span class="min-w-0">
            <span class="block font-medium text-neutral-200">{{ line.card.name }}</span>
            <span class="block text-sm text-neutral-400">
              {{ line.card.setName }}<template v-if="line.card.variant"> · {{ line.card.variant }}</template>
            </span>
            <span class="block text-sm text-amber-200">Offer: {{ money(Math.round(line.card.marketPriceCents * CONDITION_MULTIPLIERS[line.condition] * Number(config.public.offerRate))) }}</span>
          </span>
          <span class="flex flex-wrap items-center gap-2">
            <select :value="line.condition" class="max-w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" :aria-label="`Condition of ${line.card.name}`" @change="updateCondition(selectionId, ($event.target as HTMLSelectElement).value)">
              <option v-for="option in conditionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <input :value="line.quantity" class="w-16 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" type="number" min="1" max="99" :aria-label="`Quantity of ${line.card.name}`" @change="updateQuantity(selectionId, ($event.target as HTMLInputElement).value)">
            <button type="button" class="text-sm font-medium text-neutral-400 underline-offset-2 hover:text-red-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" @click="remove(selectionId)">Remove</button>
          </span>
        </li>
      </ul>
      <p v-if="selected.size" class="mt-4 border-t border-neutral-800 pt-4 text-lg font-bold text-neutral-100">Estimated offer: {{ money(total) }}</p>
    </div>

    <form class="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-sm sm:p-6" @submit.prevent="submit">
      <h2 class="text-xl font-bold text-neutral-100">Your details</h2>
      <label class="block text-sm font-semibold text-neutral-300">Name<input v-model="contact.name" class="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 font-normal text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" required maxlength="100"></label>
      <label class="block text-sm font-semibold text-neutral-300">Email<input v-model="contact.email" class="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 font-normal text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" type="email" required maxlength="254"></label>
      <label class="block text-sm font-semibold text-neutral-300">Phone (optional)<input v-model="contact.phone" class="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 font-normal text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" type="tel" maxlength="30"></label>
      <button class="w-full rounded-lg bg-amber-500 px-4 py-3 font-bold text-black transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" :disabled="busy || !selected.size">Send sale request</button>
    </form>
    </div>
  </section>
</template>
