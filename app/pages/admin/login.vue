<script setup lang="ts">
const client = useSupabaseClient();
const user = useSupabaseUser();
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const busy = ref(false);

if (user.value) await navigateTo("/admin");

async function login() {
  busy.value = true;
  errorMessage.value = "";
  const { error } = await client.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  busy.value = false;
  if (error) {
    errorMessage.value = "Unable to sign in with those details.";
    return;
  }
  const redirect = useRoute().query.redirect;
  await navigateTo(typeof redirect === "string" && redirect.startsWith("/admin") ? redirect : "/admin");
}
</script>

<template>
  <main class="mx-auto max-w-md px-4 py-16">
    <h1 class="text-3xl font-bold text-white">Admin sign in</h1>
    <form class="mt-6 space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm" @submit.prevent="login">
      <label class="block text-sm font-medium text-neutral-300">Email<input v-model="email" class="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" type="email" required autocomplete="email"></label>
      <label class="block text-sm font-medium text-neutral-300">Password<input v-model="password" class="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30" type="password" required autocomplete="current-password"></label>
      <p v-if="errorMessage" class="text-sm text-red-400" role="alert">{{ errorMessage }}</p>
      <button class="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50" :disabled="busy">Sign in</button>
    </form>
  </main>
</template>
