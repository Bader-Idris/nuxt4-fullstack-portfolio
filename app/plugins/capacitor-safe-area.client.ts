export default defineNuxtPlugin(async () => {
  if (import.meta.server) return;

  // Check if running in Capacitor environment
  const isCapacitorDevice = await useCapacitorDevice();
  if (!isCapacitorDevice) return;

  const { SafeArea } = await import("capacitor-plugin-safe-area");
  let styleElement: HTMLStyleElement | null = null;

  // Cap specific for ios
  // ! Using this directly forces the option of Desktop site checklist to be true on mobiles!
  useSeoMeta({
    viewport: "viewport-fit=cover",
  });

  const addSafeAreaStyles = () => {
    styleElement = document.createElement("style");
    styleElement.innerHTML = `
      :root {
        /* Fallback values for capacitor */
        --safe-area-inset-top: 25px;
        --safe-area-inset-bottom: 15px;
      }

      html, body {
        height: 100dvh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden;
        box-sizing: border-box;
      }

      .capacitor-safe-area {
        /* Use padding to create the safe zone without expanding the container */
        padding-top: var(--safe-area-inset-top) !important;
        padding-bottom: var(--safe-area-inset-bottom) !important;
        height: 100dvh !important;
        box-sizing: border-box !important;
      }

      /* Override #__nuxt to fit exactly within the padded body */
      #__nuxt {
        margin: 0 !important;
        height: 100% !important;
        width: 100% !important;
        max-height: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Android specific handling for bottom safe area */
      .android-bottom-safe-area {
        padding-bottom: var(--safe-area-inset-bottom) !important;
        margin-bottom: 0 !important;
      }
    `;
    document.head.appendChild(styleElement);
  };

  try {
    const STATUS_BAR_HEIGHT = 25; // Fixed status bar height
    const BOTTOM_SAFE_MARGIN = 15; // Standard bottom safe area margin for Android

    const applySafeArea = async ({ insets }) => {
      // Detect if running on Android
      const { Device } = await import("@capacitor/device");
      const deviceInfo = await Device.getInfo();
      const isAndroid = deviceInfo.platform === "android";

      // Calculate adjusted insets
      // Force bottom to be 10% less as requested to prevent "too much" space
      let bottomInset = insets.bottom * 0.9;
      
      if (isAndroid) {
        // For Android, ensure we have at least 15px for the bottom safe area
        bottomInset = Math.max(BOTTOM_SAFE_MARGIN, bottomInset);
      }

      const adjustedInsets = {
        top: STATUS_BAR_HEIGHT, // Fixed top value
        right: insets.right,
        bottom: Math.floor(bottomInset),
        left: insets.left,
      };

      // Set CSS variables
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        `${adjustedInsets.top}px`,
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-bottom",
        `${adjustedInsets.bottom}px`,
      );

      // Ensure --full-viewport-height doesn't double-count insets
      // We set it to 100dvh because we handle insets via body padding + border-box
      document.documentElement.style.setProperty(
        "--full-viewport-height",
        "100dvh"
      );

      // For full viewport elements
      document.documentElement.style.setProperty(
        "--viewport-height",
        `calc(100dvh - ${adjustedInsets.top}px - ${adjustedInsets.bottom}px)`,
      );

      // Add Android-specific class if needed
      if (isAndroid) {
        document.body.classList.add("android-bottom-safe-area");
      } else {
        // Remove Android class if on other platforms
        document.body.classList.remove("android-bottom-safe-area");
      }
    };

    // Initialize with current values
    const initSafeArea = async () => {
      const { insets } = await SafeArea.getSafeAreaInsets();
      await applySafeArea({ insets });
    };

    // Listen for changes
    const setupListeners = () => {
      SafeArea.addListener("safeAreaChanged", async ({ insets }) => {
        await applySafeArea({ insets });
      });
    };

    await SafeArea.removeAllListeners();
    await initSafeArea();
    setupListeners();

    addSafeAreaStyles();

    document.body.classList.add("capacitor-safe-area");
  } catch (error) {
    console.error("Safe Area Plugin Error:", error);
  }
});