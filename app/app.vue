<template>
  <div class="min-h-screen bg-black text-neutral-100">
    <header class="border-b border-neutral-800 bg-black text-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <NuxtLink to="/" class="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
          <img
            src="/topdog-logo.png"
            alt="TopDog TCG"
            class="h-12 w-auto max-w-[11rem] object-contain"
          >
        </NuxtLink>
        <span class="hidden text-sm font-medium text-neutral-300 sm:block">Pokémon card buying</span>
      </div>
    </header>
    <NuxtPage />
    <footer class="border-t border-neutral-800 bg-black">
      <div class="mx-auto max-w-6xl px-4 py-6 text-sm text-neutral-400 sm:px-6">
        TopDog TCG · Pokémon, Magic: The Gathering and Gundam singles
      </div>
    </footer>
  </div>
</template>
