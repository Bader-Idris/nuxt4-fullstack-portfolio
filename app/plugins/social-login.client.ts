export default defineNuxtPlugin(async () => {
  if (import.meta.server) return;

  const config = useRuntimeConfig();
  const isCapacitor = config.public.isCapacitor;

  if (isCapacitor) {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    console.log("--- SocialLogin Plugin Initialization ---");
    try {
      await SocialLogin.initialize({
        google: {
          webClientId: config.public.googleClientId,
          iOSServerClientId: config.public.googleClientId, // Often required for iOS to match webClientId
          mode: "online", // Using online mode for easier client-side session management
        },
        facebook: {
          appId: config.public.facebookAppId as string,
        },
        // You can add apple, twitter etc. here if needed
      });
      console.log("SocialLogin initialized successfully");
    } catch (error) {
      console.error("SocialLogin initialization failed:", error);
    }
  }
});