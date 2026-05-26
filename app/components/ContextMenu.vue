<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="menuRef"
      class="custom-context-menu"
      :style="positionStyle"
      @click.stop
      @contextmenu.prevent
    >
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
}>();

const emit = defineEmits(["close"]);

const menuRef = ref<HTMLElement | null>(null);
const adjustedPos = reactive({ x: 0, y: 0 });

const close = () => {
  emit("close");
};

const positionStyle = computed(() => ({
  top: `${adjustedPos.y}px`,
  left: `${adjustedPos.x}px`,
  position: 'fixed' as const,
  zIndex: 9999,
  visibility: adjustedPos.x === 0 && adjustedPos.y === 0 ? 'hidden' : 'visible' as any
}));

const updatePosition = () => {
  if (!menuRef.value) return;
  
  const { innerWidth, innerHeight } = window;
  const { offsetWidth, offsetHeight } = menuRef.value;

  let nx = props.x;
  let ny = props.y;

  // Viewport constraints
  if (nx + offsetWidth > innerWidth) nx = innerWidth - offsetWidth - 10;
  if (ny + offsetHeight > innerHeight) ny = innerHeight - offsetHeight - 10;
  if (nx < 10) nx = 10;
  if (ny < 10) ny = 10;

  adjustedPos.x = nx;
  adjustedPos.y = ny;
};

// Handle showing and animating
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    // Reset pos for fresh calculation
    adjustedPos.x = 0;
    adjustedPos.y = 0;
    
    nextTick(() => {
      updatePosition();
      if (menuRef.value) {
        useGSAP().timeline().from(menuRef.value, {
          scale: 0.9,
          autoAlpha: 0,
          y: -10,
          duration: 0.2,
          ease: "power2.out",
          transformOrigin: "top left"
        });
      }
    });
  }
});

// Update position if props change while visible
watch(() => [props.x, props.y], () => {
  if (props.show) {
    nextTick(updatePosition);
  }
});

// Close on click outside or escape
onMounted(() => {
  window.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("click", close);
});
</script>

<style lang="scss" scoped>
.custom-context-menu {
  background: var(--bg-secondary);
  border: 1px solid var(--lines-color);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  padding: 6px;
  min-width: 160px;
  backdrop-filter: blur(10px);

  :deep(button) {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 6px;
    font-size: 0.9rem;
    text-align: left;
    transition: background 0.2s;

    &:hover {
      background: var(--bg-primary-hovered);
      color: var(--accent-primary);
    }

    &.delete {
      color: var(--accent-error);
      &:hover {
        background: rgba(var(--accent-error), 0.1);
      }
    }

    .icon {
      font-size: 1.1rem;
    }

    &.is-active {
      color: var(--accent-primary);
      background: var(--bg-primary-hovered);
    }
  }
}
</style>
