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
    viewport: 'viewport-fit=cover'
  })

  const addSafeAreaStyles = () => {
    styleElement = document.createElement("style");
    styleElement.innerHTML = `
      :root {
        /* Fallback values for capacitor */
        --safe-area-inset-top: 25px;
        /* --safe-area-inset-right: 0px; */
        --safe-area-inset-bottom: 15px;
        /* --safe-area-inset-left: 0px; */
        /* --safe-area-inset-status-bar: 25px; */
        /* --viewport-height: $full-viewport-height !important; */
        /* TODO: OMG, I need to do DRY with all heigh values of the viewport! ~25 lines */
      }

      .capacitor-safe-area {
        /* This will now include your extra 10px */
        padding-top: var(--safe-area-inset-top);
        padding-bottom: var(--safe-area-inset-bottom);
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
      const { Device } = await import('@capacitor/device');
      const deviceInfo = await Device.getInfo();
      const isAndroid = deviceInfo.platform === 'android';
      
      // Calculate adjusted insets
      let bottomInset = insets.bottom;
      if (isAndroid) {
        // For Android, ensure we have at least 15px for the bottom safe area
        bottomInset = Math.max(BOTTOM_SAFE_MARGIN, insets.bottom);
      }

      const adjustedInsets = {
        top: STATUS_BAR_HEIGHT, // Fixed top value
        right: insets.right,
        bottom: bottomInset,
        left: insets.left,
      };

      // Set CSS variables
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        `${adjustedInsets.top}px`
      );
      document.documentElement.style.setProperty(
        "--safe-area-inset-bottom",
        `${adjustedInsets.bottom}px`
      );

      // For full viewport elements
      document.documentElement.style.setProperty(
        "--viewport-height",
        `calc(100vh - ${adjustedInsets.top}px - ${adjustedInsets.bottom}px)`
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
