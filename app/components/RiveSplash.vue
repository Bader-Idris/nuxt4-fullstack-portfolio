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

onMounted(async () => {
  if (typeof window !== "undefined") {
    try {
      const { Rive } = await import("@rive-app/canvas");

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
            emit("animationStopped"); // Emit event when animation stops
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
          resizeObserver.disconnect();
          if (riveInstance) {
            riveInstance.stop();
          }
        });
      }
    } catch (error) {
      console.error("Error loading Rive animation:", error);
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