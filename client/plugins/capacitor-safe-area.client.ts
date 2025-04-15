import { SafeArea } from "capacitor-plugin-safe-area";

export default defineNuxtPlugin(async () => {
  if (import.meta.server) return;

  // Check if running in Capacitor environment
  const isCapacitorDevice = await useCapacitorDevice();
  if (!isCapacitorDevice) return;

  try {
    const STATUS_BAR_HEIGHT = 25; // Fixed status bar height
    const BOTTOM_INSET_IGNORE = 50; // Amount to reduce from bottom inset

    const applySafeArea = ({ insets }) => {
      // Calculate adjusted insets
      const adjustedInsets = {
        top: STATUS_BAR_HEIGHT, // Fixed top value
        right: insets.right,
        bottom: Math.max(0, insets.bottom - BOTTOM_INSET_IGNORE), // Ensure never negative
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

    document.body.classList.add("capacitor-safe-area");
  } catch (error) {
    console.error("Safe Area Plugin Error:", error);
  }
});
