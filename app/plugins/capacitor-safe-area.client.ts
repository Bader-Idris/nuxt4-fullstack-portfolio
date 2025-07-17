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
        // --safe-area-inset-right: 0px;
        --safe-area-inset-bottom: 25px;
        // --safe-area-inset-left: 0px;
        // --safe-area-inset-status-bar: 50px;
        // --viewport-height: 100vh !important;
        // TODO: OMG, I need to do DRY with all heigh values of the viewport! ~25 lines
      }

      .capacitor-safe-area {
        /* This will now include your extra 10px */
        padding-top: var(--safe-area-inset-top);
        padding-bottom: var(--safe-area-inset-bottom);
      }
    `;
    document.head.appendChild(styleElement);
  };

  try {
    const STATUS_BAR_HEIGHT = 25; // Fixed status bar height
    const BOTTOM_INSET_IGNORE = -100; // Amount to reduce from bottom inset

    const applySafeArea = ({ insets }) => {
      // Calculate adjusted insets
      const adjustedInsets = {
        top: STATUS_BAR_HEIGHT, // Fixed top value
        right: insets.right,
        // bottom: Math.max(0, insets.bottom - BOTTOM_INSET_IGNORE), // Ensure never negative
        bottom: BOTTOM_INSET_IGNORE, // TODO: it adds basic safety, but changing it does not do anything after that 💢
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
        `calc(100vh - ${adjustedInsets.top}px + ${adjustedInsets.bottom}px)`
      );
    };

    // Initialize with current values
    const initSafeArea = async () => {
      const { insets } = await SafeArea.getSafeAreaInsets();
      applySafeArea({ insets });
    };

    // Listen for changes
    const setupListeners = () => {
      SafeArea.addListener("safeAreaChanged", ({ insets }) => {
        applySafeArea({ insets });
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
