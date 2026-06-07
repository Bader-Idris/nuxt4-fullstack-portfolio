<template>
  <div 
    v-if="isJoystickActive || isHint"
    class="floating-joystick"
    :class="{ 'active': isJoystickActive, 'is-hint': isHint && !isJoystickActive }"
    :style="isJoystickActive ? { top: `${joystickCenter.y - 45}px`, left: `${joystickCenter.x - 45}px` } : {}"
  >
    <div class="joystick-base">
      <div class="joystick-handle" :style="handleStyle" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isHint?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isHint: false
});

const emit = defineEmits<{
  (e: 'move', direction: string): void;
  (e: 'start'): void;
  (e: 'end'): void;
}>();

const isJoystickActive = ref(false);
const joystickPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const joystickCenter = ref<{ x: number; y: number }>({ x: 0, y: 0 });

const handleStyle = computed(() => {
  return {
    transform: `translate(${joystickPos.value.x}px, ${joystickPos.value.y}px)`,
    transition: isJoystickActive.value ? "none" : "transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)"
  };
});

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  isJoystickActive.value = true;
  joystickCenter.value = { x: touch.clientX, y: touch.clientY };
  emit('start');
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isJoystickActive.value) return;
  const touch = e.touches[0];
  const dx = touch.clientX - joystickCenter.value.x;
  const dy = touch.clientY - joystickCenter.value.y;
  
  const maxRadius = 38;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const clampedRadius = Math.min(distance, maxRadius);
  const angle = Math.atan2(dy, dx);
  
  joystickPos.value = {
    x: Math.cos(angle) * clampedRadius,
    y: Math.sin(angle) * clampedRadius
  };
  
  processCoords(dx, dy);
};

const handleTouchEnd = () => {
  isJoystickActive.value = false;
  joystickPos.value = { x: 0, y: 0 };
  emit('end');
};

const processCoords = (x: number, y: number) => {
  const threshold = 12;
  const distance = Math.sqrt(x * x + y * y);
  
  if (distance < threshold) return;
  
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  
  let nextDir = "";
  if (angle >= 315 || angle < 45) nextDir = "right";
  else if (angle >= 45 && angle < 135) nextDir = "down";
  else if (angle >= 135 && angle < 225) nextDir = "left";
  else if (angle >= 225 && angle < 315) nextDir = "up";
  
  if (nextDir) {
    emit('move', nextDir);
  }
};

// Expose methods for parent to call
defineExpose({
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd
});
</script>

<style lang="scss" scoped>
.floating-joystick {
  position: fixed;
  display: flex;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(1, 8, 14, 0.45) 0%, rgba(2, 18, 27, 0.7) 100%);
  border: 2px solid rgba(67, 217, 173, 0.25);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), inset 0 2px 5px rgba(255, 255, 255, 0.05);
  justify-content: center;
  align-items: center;
  touch-action: none;
  z-index: 9999;
  transition: transform 0.1s;
  pointer-events: none; // Let events pass through to parent which calls the methods

  &.active {
    display: flex !important;
  }
  
  &.is-hint {
    display: flex;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.6;
    animation: pulse 2s infinite;
  }

  .joystick-base {
    width: 80px;
    height: 80px;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;

    .joystick-handle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(67, 217, 173, 0.85) 0%, rgba(77, 91, 206, 0.9) 100%);
      box-shadow: 0 2px 8px rgba(67, 217, 173, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.15);
      position: absolute;
      cursor: pointer;
      z-index: 10;
    }
  }
}

@keyframes pulse {
  0% { transform: translateX(-50%) scale(0.95); opacity: 0.4; }
  50% { transform: translateX(-50%) scale(1.05); opacity: 0.7; }
  100% { transform: translateX(-50%) scale(0.95); opacity: 0.4; }
}
</style>