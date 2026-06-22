<template>
  <ClientOnly>
    <div ref="container" class="rive-container">
      <canvas ref="riveCanvas" style="width: 100%; height: 100%" />
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
const props = defineProps({
  src: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["animationStopped"]); // Define the event

const riveCanvas = ref<HTMLCanvasElement | null>(null);
const container = ref<HTMLElement | null>(null);
let riveInstance: any = null;
let safetyTimeout: any = null;

const clearSafetyTimeout = () => {
  if (safetyTimeout) {
    clearTimeout(safetyTimeout);
    safetyTimeout = null;
  }
};

onMounted(async () => {
  if (typeof window !== "undefined") {
    // Safety timeout: 4 seconds maximum for the splash screen
    safetyTimeout = setTimeout(() => {
      console.warn("Rive splash animation safety timeout triggered.");
      emit("animationStopped");
    }, 4000);

    try {
      const { Rive, RuntimeLoader } = await import("@rive-app/canvas");

      // Set WASM paths to local assets for true offline support in Capacitor/offline mode
      if (RuntimeLoader) {
        RuntimeLoader.setWasmUrl("/rive.wasm");
        RuntimeLoader.setWasmFallbackUrl("/rive_fallback.wasm");
      }

      if (riveCanvas.value && container.value) {
        riveInstance = new Rive({
          src: props.src,
          canvas: riveCanvas.value,
          autoplay: true,
          onLoad: () => {
            const dpr = window.devicePixelRatio || 1;
            riveCanvas.value.width = container.value.clientWidth * dpr;
            riveCanvas.value.height = container.value.clientHeight * dpr;
            riveInstance.resizeDrawingSurfaceToCanvas();
          },
          onStop: () => {
            clearSafetyTimeout();
            emit("animationStopped"); // Emit event when animation stops
          },
          onLoadError: (err) => {
            console.error("Rive animation load error:", err);
            clearSafetyTimeout();
            emit("animationStopped");
          },
        });

        const resizeObserver = new ResizeObserver(() => {
          if (riveInstance && riveCanvas.value && container.value) {
            const dpr = window.devicePixelRatio || 1;
            riveCanvas.value.width = container.value.clientWidth * dpr;
            riveCanvas.value.height = container.value.clientHeight * dpr;
            riveInstance.resizeDrawingSurfaceToCanvas();
          }
        });

        resizeObserver.observe(container.value);

        onUnmounted(() => {
          clearSafetyTimeout();
          resizeObserver.disconnect();
          if (riveInstance) {
            riveInstance.stop();
          }
        });
      } else {
        console.warn("Rive canvas or container references not found, skipping splash");
        clearSafetyTimeout();
        emit("animationStopped");
      }
    } catch (error) {
      console.error("Error loading Rive animation:", error);
      clearSafetyTimeout();
      // Emit the animation stopped event immediately if Rive fails to load
      // This allows the app to continue loading instead of being stuck on a black screen
      emit("animationStopped");
    }
  }
});
</script>

<style scoped lang="scss">
.rive-container {
  position: fixed;
  top: 0;
  left: 0;
  width: $full-viewport-width;
  height: $full-viewport-height;
  pointer-events: none;

  z-index: z("tooltip");
}
</style>