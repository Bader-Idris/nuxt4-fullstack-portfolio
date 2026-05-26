<template>
  <Transition name="fade">
    <button
      v-show="y > threshold"
      class="scroll-to-top"
      aria-label="Scroll to top"
      @click="scrollToTop"
    >
      <Icon name="mdi:chevron-up" width="30" height="30" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { useScroll } from '@vueuse/core';

const props = defineProps({
  target: {
    type: Object as () => HTMLElement | null,
    default: null,
  },
  threshold: {
    type: Number,
    default: 300,
  },
});

// If target is null, use window
const { y } = useScroll(props.target ? ref(props.target) : undefined);

const scrollToTop = () => {
  if (props.target) {
    props.target.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
</script>

<style lang="scss" scoped>
.scroll-to-top {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: $accent1;
  color: $primary1;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  transition: transform 0.2s, background-color 0.2s;

  &:hover {
    transform: scale(1.1);
    background-color: lighten($accent1, 10%);
  }

  &:active {
    transform: scale(0.9);
  }

  @include mobile {
    bottom: 80px; // Above mobile bottom bar if any
    right: 15px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
