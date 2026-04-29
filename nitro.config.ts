export default defineNitroConfig({
  compatibilityDate: '2026-04-29',
  preset: 'vercel',
  runtimeConfig: {
    stripeSecretKey: '',
    botUsername: '',
    welcomeVideoUrl: '',
  },
  publicAssets: [{ dir: 'public' }],
});
