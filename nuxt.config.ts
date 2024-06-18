// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],
  runtimeConfig: {
    public: {
      posthogPublicKey: "phc_pz4u2FxpKnE15iVzI7fRYe9QClKm0tI9xVtkCVioThk",
      posthogHost: "https://betterwhen2meet.com/ingest",
    },
  },
  routeRules: {
    "/ingest/static/**": { proxy: "https://us-assets.i.posthog.com/static/**" },
    "/ingest/**": { proxy: "https://us.i.posthog.com/**" },
  },
});
