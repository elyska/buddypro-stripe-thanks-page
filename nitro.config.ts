export default defineNitroConfig({
  compatibilityDate: '2026-04-29',
  preset: 'vercel',
  runtimeConfig: {
    stripeSecretKey: '',
    botUsername: '',
  },
  publicAssets: [{ dir: 'public' }],
});
