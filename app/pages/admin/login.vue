<script setup lang="ts">
const client = useSupabaseClient();
const user = useSupabaseUser();
const errorMessage = ref("");
const busy = ref(false);

if (user.value) await navigateTo("/admin");

async function loginWithGoogle() {
  busy.value = true;
  errorMessage.value = "";
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/admin`,
    },
  });
  busy.value = false;
  if (error) {
    errorMessage.value = "Unable to sign in with Google. Please try again.";
  }
}
</script>

<template>
  <main class="mx-auto max-w-md px-4 py-16">
    <h1 class="text-3xl font-bold text-white">Admin sign in</h1>
    <div class="mt-6 space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm">
      <p class="text-sm text-neutral-400">Use your authorized Google account to access the admin panel.</p>
      <p v-if="errorMessage" class="text-sm text-red-400" role="alert">{{ errorMessage }}</p>
      <button type="button" class="flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-3 font-semibold text-black hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50" :disabled="busy" @click="loginWithGoogle">{{ busy ? "Redirecting…" : "Continue with Google" }}</button>
    </div>
  </main>
</template>
