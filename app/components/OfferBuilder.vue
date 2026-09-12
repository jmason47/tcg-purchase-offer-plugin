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
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let searchSequence = 0;
const busy = ref(false);
const config = useRuntimeConfig();
const selectionNotice = ref("");
const listPanel = ref<HTMLElement | null>(null);
const pendingCard = ref<Card | null>(null);
const pendingCondition = ref<CardCondition | "">("");

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

function clearSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchSequence += 1;
  query.value = "";
  cards.value = [];
  status.value = "";
  busy.value = false;
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
  if (noticeTimer) clearTimeout(noticeTimer);
});

function openAddDialog(card: Card) {
  pendingCard.value = card;
  pendingCondition.value = "";
}

function cancelAdd() {
  pendingCard.value = null;
  pendingCondition.value = "";
}

function add(card: Card, condition: CardCondition) {
  const next = new Map(selected.value);
  const key = selectionKey(card);
  const current = next.get(key);
  next.set(key, { card, quantity: Math.min((current?.quantity ?? 0) + 1, 99), condition });
  selected.value = next;
  selectionNotice.value = `${card.name}${card.variant ? ` · ${card.variant}` : ""} added to your list.`;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    selectionNotice.value = "";
  }, 4000);
}

function confirmAdd() {
  if (!pendingCard.value || !pendingCondition.value) return;
  const card = pendingCard.value;
  const condition = pendingCondition.value;
  cancelAdd();
  add(card, condition);
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

function scrollToList() {
  clearSearch();
  listPanel.value?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    <details open class="group overflow-hidden rounded-2xl border border-amber-500/40 bg-neutral-950 shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between border-b border-neutral-800 bg-neutral-900 p-5 font-bold text-neutral-100 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:p-6">
      <span><span class="block">Search and add cards</span><span class="block text-sm font-normal text-neutral-400">Find a card to add to your list</span></span>
      <span class="flex items-center text-amber-300"><span class="sr-only group-open:hidden">Expand search section</span><span class="sr-only hidden group-open:inline">Collapse search section</span><span class="text-lg transition-transform group-open:rotate-180" aria-hidden="true">⌄</span></span>
    </summary>
    <form class="p-5 sm:p-6" @submit.prevent="search">
      <label for="card-search" class="block text-sm font-semibold text-neutral-100">Find a card</label>
      <div class="mt-2 flex gap-2">
        <input id="card-search" v-model="query" class="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-neutral-100 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" minlength="2" required placeholder="e.g. Charizard">
        <button v-if="query" type="button" class="rounded-lg border border-neutral-700 px-3 py-2.5 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" aria-label="Clear card search" @click="clearSearch">Clear</button>
        <button class="rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-black transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="busy">Search</button>
      </div>
    </form>

    <p v-if="status" class="px-5 py-3 text-sm text-neutral-300 sm:px-6" role="status" aria-live="polite">{{ status }}</p>

    <div v-if="cards.length" class="mx-5 mb-5 divide-y divide-neutral-800 overflow-hidden border-y border-neutral-800 sm:mx-6">
      <article v-for="card in cards" :key="card.id" class="flex items-center justify-between gap-4 p-4 transition hover:bg-neutral-900 sm:p-5">
        <div>
          <h2 class="font-semibold text-neutral-100">{{ card.name }}</h2>
          <p class="text-sm text-neutral-400">
            {{ card.setName }}<template v-if="card.number"> · #{{ card.number }}</template>
            <template v-if="card.variant"> · {{ card.variant }}</template>
          </p>
          <p class="mt-1 text-sm font-medium text-neutral-300">Offer price: {{ money(Math.round(card.marketPriceCents * Number(config.public.offerRate))) }}</p>
        </div>
        <button type="button" class="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-black transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2" @click="openAddDialog(card)">Add</button>
      </article>
    </div>
    </details>

    <div class="space-y-6">
    <div ref="listPanel" class="scroll-mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-sm sm:p-6">
      <p class="text-sm font-bold uppercase tracking-[0.15em] text-amber-400">Your list</p>
      <h2 class="mt-1 flex items-center gap-2 text-xl font-bold text-neutral-100">Selected cards <span v-if="selected.size" class="rounded-full bg-amber-500/20 px-2 py-0.5 text-sm font-semibold text-amber-300">{{ selected.size }}</span></h2>
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
  <div v-if="pendingCard" class="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="condition-dialog-title">
    <form class="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-950 p-5 shadow-xl sm:p-6" @submit.prevent="confirmAdd">
      <h2 id="condition-dialog-title" class="text-xl font-bold text-neutral-100">Choose card condition</h2>
      <p class="mt-2 text-sm text-neutral-400">{{ pendingCard.name }}<template v-if="pendingCard.variant"> · {{ pendingCard.variant }}</template></p>
      <label class="mt-4 block text-sm font-semibold text-neutral-300">Condition
        <select v-model="pendingCondition" class="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" required>
          <option disabled value="">Select a condition</option>
          <option v-for="option in conditionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="rounded-lg border border-neutral-700 px-4 py-2 font-semibold text-neutral-300 hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" @click="cancelAdd">Cancel</button>
        <button type="submit" class="rounded-lg bg-amber-500 px-4 py-2 font-bold text-black hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!pendingCondition">Add card</button>
      </div>
    </form>
  </div>
  <div v-if="selectionNotice" class="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-3 text-sm text-emerald-100 shadow-lg" role="status" aria-live="polite" aria-atomic="true">
    <span>{{ selectionNotice }}</span>
    <button type="button" class="shrink-0 font-semibold text-emerald-300 underline underline-offset-2 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:hidden" @click="scrollToList">View list</button>
  </div>
</template>
