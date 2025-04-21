// https://chat.deepseek.com/a/chat/s/047e1352-014c-4977-ab48-a6ed298bdb22

export default defineNuxtPlugin(async (nuxtApp) => {
  if (!import.meta.client) return; // TODO: do we need this after making the file .client.ts ??

  const isCapacitorDevice: Promise<boolean> = useCapacitorDevice();
  if (!(await isCapacitorDevice)) return;

  const { Keyboard } = await import("@capacitor/keyboard");

  let styleElement: HTMLStyleElement | null = null;
  let keyboardHeight = 0;

  // Add dynamic styles
  const addKeyboardStyles = () => {
    styleElement = document.createElement("style");
    styleElement.innerHTML = `
      #__nuxt {
        padding-top: var(--keyboard-height);
        transition: padding-top 0.3s ease;
      }
      
      input, textarea {
        scroll-margin-top: var(--keyboard-height);
        position: sticky;
      }
    `;
    document.head.appendChild(styleElement);
  };

  // Calculate available viewport height
  const getAvailableHeight = () => {
    return window.innerHeight - keyboardHeight;
  };

  // Adjust input position
  const adjustInputPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const elementBottom = rect.bottom;
    const availableHeight = getAvailableHeight();

    if (elementBottom > availableHeight) {
      const offset = elementBottom - availableHeight;
      window.scrollBy({
        top: offset + 40, // Add 40px padding
        behavior: "smooth",
      });
    }
  };

  // Keyboard event handlers
  const showHandler = (info: { keyboardHeight: number }) => {
    keyboardHeight = info.keyboardHeight;
    document.documentElement.style.setProperty(
      "--keyboard-height",
      `${info.keyboardHeight}px`
    );
    document.documentElement.style.paddingBottom = `${keyboardHeight}px`;
  };

  const didShowHandler = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement?.matches("input, textarea")) {
      setTimeout(() => {
        adjustInputPosition(activeElement);
      }, 100); // Increased delay for better layout stability
    }
  };

  const hideHandler = () => {
    keyboardHeight = 0;
    document.documentElement.style.setProperty("--keyboard-height", "0");
    document.documentElement.style.paddingBottom = "0";
  };

  // Handle window resize (for landscape/portrait changes)
  const resizeHandler = () => {
    if (keyboardHeight > 0) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement?.matches("input, textarea")) {
        adjustInputPosition(activeElement);
      }
    }
  };

  // Initialize
  addKeyboardStyles();
  Keyboard.addListener("keyboardWillShow", showHandler);
  Keyboard.addListener("keyboardDidShow", didShowHandler);
  Keyboard.addListener("keyboardWillHide", hideHandler);
  window.addEventListener("resize", resizeHandler);

  // Cleanup
  return () => {
    Keyboard.removeAllListeners();
    window.removeEventListener("resize", resizeHandler);
    if (styleElement) {
      document.head.removeChild(styleElement);
      styleElement = null;
    }
  };
});
