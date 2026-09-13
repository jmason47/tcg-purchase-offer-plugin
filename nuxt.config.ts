import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  version?: string;
};

export default defineNuxtConfig({
  compatibilityDate: "2025-05-01",
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  runtimeConfig: {
    resendApiKey: "",
    resendFromEmail: "notifications@topdogtcg.com",
    pokewalletApiKey: "",
    pokewalletApiUrl: "https://api.pokewallet.io",
    fxApiUrl: "https://api.frankfurter.dev",
    usdToGbpRate: Number(process.env.NUXT_USD_TO_GBP_RATE ?? 0.79),
    eurToGbpRate: Number(process.env.NUXT_EUR_TO_GBP_RATE ?? 0.86),
    offerRate: Number(process.env.NUXT_OFFER_RATE ?? 0.65),
    supabaseServiceKey: "",
    public: {
      supabase: {
        url: "",
        key: "",
      },
      appUrl: "http://localhost:3000",
      appVersion: packageJson.version ?? "0.0.0",
      offerRate: Number(process.env.NUXT_OFFER_RATE ?? 0.65),
    },
  },
  modules: ["@nuxt/eslint", "@nuxtjs/tailwindcss", "@nuxtjs/supabase"],
  supabase: {
    redirectOptions: {
      login: "/admin/login",
      callback: "/admin",
      exclude: ["/", "/api/health", "/api/cards", "/api/leads"],
    },
  },
  app: {
    head: {
      title: "Sell Your Pokémon Cards | TopDog TCG",
      link: [
        { rel: "icon", type: "image/png", href: "/topdog-logo.png" },
        { rel: "apple-touch-icon", type: "image/png", href: "/topdog-logo.png" },
      ],
      meta: [
        { name: "description", content: "Get an estimated purchase offer for your Pokémon cards." },
      ],
    },
  },
  nitro: {
    routeRules: {
      "/api/health": { headers: { "Cache-Control": "no-store" } },
      "/api/cards": { headers: { "Cache-Control": "public, max-age=60" } },
      "/api/leads": { headers: { "Cache-Control": "no-store" } },
      "/_nuxt/**": { headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
    },
  },
});
