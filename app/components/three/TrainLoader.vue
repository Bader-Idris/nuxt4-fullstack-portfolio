<template>
  <Transition name="fade">
    <div v-if="loading" class="train-loader">
      <div class="loader-content">
        <div class="icon-wrapper" ref="iconWrapper">
          <Icon name="raphael:train" size="80" class="train-icon" />
        </div>
        <div class="progress-container">
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill"
              :style="{ width: animatedProgress + '%' }"
            ></div>
          </div>
          <div class="progress-text">{{ Math.round(animatedProgress) }}%</div>
        </div>
        <div class="loading-status">{{ statusText }}</div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  loading: boolean;
  progress: number;
}>();

const animatedProgress = ref(0);
const iconWrapper = ref<HTMLElement | null>(null);
const statusText = ref("Preparing heavy machinery...");

const statusMessages = [
  "Firing up the boiler...",
  "Oiling the wheels...",
  "Checking the pressure...",
  "Clearing the tracks...",
  "Almost ready for departure...",
];

// Smoothly animate the progress value
watch(
  () => props.progress,
  (newVal) => {
    useGSAP().to(animatedProgress, {
      value: newVal,
      duration: 0.5,
      ease: "power2.out",
    });

    // Update status text based on progress
    const index = Math.floor((newVal / 101) * statusMessages.length);
    statusText.value =
      statusMessages[index] || statusMessages[statusMessages.length - 1];
  },
);

onMounted(() => {
  if (iconWrapper.value) {
    useGSAP().to(iconWrapper.value, {
      x: 20,
      repeat: -1,
      yoyo: true,
      duration: 1.5,
      ease: "power1.inOut",
    });
  }
});
</script>

<style lang="scss" scoped>
.train-loader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  width: 100%;
  max-width: 300px;
}

.icon-wrapper {
  filter: drop-shadow(0 0 15px rgba(0, 200, 83, 0.4));
}

.train-icon {
  color: #00c853;
}

.progress-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.progress-bar-bg {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00c853, #64ffda);
  box-shadow: 0 0 10px rgba(0, 200, 83, 0.6);
  transition: width 0.1s linear;
}

.progress-text {
  color: #00c853;
  font-family: "JetBrains Mono", monospace;
  font-size: 18px;
  font-weight: bold;
}

.loading-status {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-style: italic;
  text-align: center;
  height: 20px;
}

.fade-leave-active {
  transition: opacity 0.8s ease;
}

.fade-leave-to {
  opacity: 0;
}
</style>