import { useState } from "#app";

const fontReadyPromise = new Promise<void>((resolve) => {
  if (import.meta.client) {
    // Explicitly wait for the "Fira Code" font and the document.fonts.ready event.
    Promise.all([document.fonts.load('1rem "Fira Code"'), document.fonts.ready])
      .then(() => {
        resolve();
      })
      .catch((error) => {
        console.error("Font loading error:", error);
        // Resolve anyway to not block the app, though warnings might persist.
        resolve();
      });
  } else {
    resolve(); // Resolve immediately on the server
  }
});

export const useFontLoader = () => {
  const areFontsLoaded = useState<boolean>("areFontsLoaded", () => false);

  fontReadyPromise.then(() => {
    areFontsLoaded.value = true;
  });

  return {
    areFontsLoaded,
    fontReadyPromise,
  };
};