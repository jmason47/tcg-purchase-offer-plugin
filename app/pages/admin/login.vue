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
    <h1 class="text-3xl font-bold text-gray-900">Admin sign in</h1>
    <form class="mt-6 space-y-4 rounded-xl border bg-white p-6 shadow-sm" @submit.prevent="login">
      <label class="block text-sm font-medium text-gray-700">Email<input v-model="email" class="mt-1 block w-full rounded-lg border px-3 py-2" type="email" required autocomplete="email"></label>
      <label class="block text-sm font-medium text-gray-700">Password<input v-model="password" class="mt-1 block w-full rounded-lg border px-3 py-2" type="password" required autocomplete="current-password"></label>
      <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
      <button class="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white disabled:opacity-50" :disabled="busy">Sign in</button>
    </form>
  </main>
</template>
