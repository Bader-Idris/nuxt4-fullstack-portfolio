<template>
  <div
    class="food-left"
    :class="{ 'medium-mode': isMediumMode, 'crazy-mode': isCrazyMode }"
    role="img"
    :aria-label="`Food items: ${foodLeft.filter(f => !f.eaten).length} remaining`"
  >
    <client-only>
      <canvas
        ref="canvasRef"
        :style="{ 
          width: `${canvasDisplayWidth}px`, 
          height: `${canvasDisplayHeight}px`,
          transform: `translate(-${currentSafeZone}px, -${currentSafeZone}px)`
        }"
      />
    </client-only>
  </div>
</template>

<script setup lang="ts">
import { gsap } from 'gsap';

interface FoodItem {
  eaten: boolean;
}

const props = defineProps<{
  foodLeft: FoodItem[];
}>();

const isMobile = useMobile();
const isMediumMode = computed(() => props.foodLeft.length === 30);
const isCrazyMode = computed(() => props.foodLeft.length > 30);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasDisplayWidth = ref(0);
const canvasDisplayHeight = ref(70);

const currentSafeZone = computed(() => {
  if (isMobile.value) return isCrazyMode.value ? 5 : 20;
  return isCrazyMode.value ? 10 : 35;
});

const ACCENT2 = "#43d9ad";
const ANIMATION_DURATION = 3; 

const getLayout = () => {
  if (isMobile.value) {
    if (isCrazyMode.value) {
      return { size: 4, stepX: 7, stepY: 10, rows: 6, glowMax: 4, delayFactor: 0.05, delayMod: 20, baseHeight: 60 };
    } else if (isMediumMode.value) {
      return { size: 6, stepX: 22, stepY: 20, rows: 3, glowMax: 10, delayFactor: 0.1, delayMod: 10, baseHeight: 70 };
    } else {
      return { size: 10, stepX: 50, stepY: 30, rows: 2, glowMax: 20, delayFactor: 0.4, delayMod: 10, baseHeight: 70 };
    }
  }

  // Original PC Layouts
  if (isCrazyMode.value) {
    return { size: 4, stepX: 7, stepY: 16, rows: 6, glowMax: 4, delayFactor: 0.05, delayMod: 20, baseHeight: 110 };
  } else if (isMediumMode.value) {
    return { size: 6, stepX: 18, stepY: 22, rows: 3, glowMax: 14, delayFactor: 0.1, delayMod: 10, baseHeight: 80 };
  } else {
    return { size: 10, stepX: 38, stepY: 34, rows: 2, glowMax: 33, delayFactor: 0.4, delayMod: 10, baseHeight: 80 };
  }
};

const glowCache = new Map<string, HTMLCanvasElement>();

const getGlowFrame = (intensity: number, layout: any) => {
  const { size, glowMax } = layout;
  const intensityKey = Math.round(intensity * 60); 
  const cacheKey = `${size}-${glowMax}-${intensityKey}`;
  
  if (glowCache.has(cacheKey)) return glowCache.get(cacheKey)!;
  
  const cacheCanvas = document.createElement("canvas");
  const padding = glowMax * 2.5; 
  cacheCanvas.width = size + padding * 2;
  cacheCanvas.height = size + padding * 2;
  const cctx = cacheCanvas.getContext("2d")!;
  
  const centerX = cacheCanvas.width / 2;
  const centerY = cacheCanvas.height / 2;
  
  cctx.shadowColor = "rgba(67, 217, 173, 0.2)";
  cctx.shadowBlur = intensity * glowMax * 1.6;
  cctx.fillStyle = `rgba(67, 217, 173, ${intensity * 0.07})`;
  cctx.beginPath();
  cctx.arc(centerX, centerY, (size / 2) + (intensity * glowMax * 0.35), 0, Math.PI * 2);
  cctx.fill();

  cctx.shadowColor = "rgba(67, 217, 173, 0.4)";
  cctx.shadowBlur = intensity * glowMax * 0.7;
  cctx.fillStyle = `rgba(67, 217, 173, ${intensity * 0.11})`;
  cctx.beginPath();
  cctx.arc(centerX, centerY, (size / 2) + (intensity * glowMax * 0.18), 0, Math.PI * 2);
  cctx.fill();
  
  cctx.shadowBlur = intensity * (glowMax / 2);
  cctx.fillStyle = `rgba(67, 217, 173, ${intensity * 0.2})`;
  cctx.beginPath();
  cctx.arc(centerX, centerY, (size / 2) + (intensity * glowMax * 0.05), 0, Math.PI * 2);
  cctx.fill();
  
  cctx.shadowBlur = 0;
  cctx.fillStyle = ACCENT2;
  cctx.beginPath();
  cctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  cctx.fill();
  
  glowCache.set(cacheKey, cacheCanvas);
  return cacheCanvas;
};

const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const layout = getLayout();
  const { stepX, stepY, rows, delayFactor, delayMod } = layout;
  const cols = Math.ceil(props.foodLeft.length / rows);
  
  const targetWidth = cols * stepX + currentSafeZone.value * 2;
  const targetHeight = layout.baseHeight + currentSafeZone.value * 2;
  
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(targetWidth * dpr) || canvas.height !== Math.floor(targetHeight * dpr)) {
    canvas.width = Math.floor(targetWidth * dpr);
    canvas.height = Math.floor(targetHeight * dpr);
    canvasDisplayWidth.value = targetWidth;
    canvasDisplayHeight.value = targetHeight;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = "blur(0.5px)";
  
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(currentSafeZone.value, currentSafeZone.value);

  const time = gsap.ticker.time;

  props.foodLeft.forEach((food, index) => {
    const col = Math.floor(index / rows);
    const row = index % rows;
    const x = col * stepX + stepX / 2;
    
    let y = 0;
    if (isMobile.value) {
      const gridHeight = rows * stepY;
      y = row * stepY + stepY / 2 + (layout.baseHeight - gridHeight) / 2;
    } else {
      // Original PC math
      const gridHeight = (rows - 1) * stepY;
      y = row * stepY + (layout.baseHeight - gridHeight) / 2;
    }

    if (food.eaten) {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = ACCENT2;
      ctx.beginPath();
      ctx.arc(x, y, layout.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      return;
    }

    const delay = (index % delayMod) * delayFactor;
    const phase = (time + delay) % ANIMATION_DURATION;
    const progress = phase / ANIMATION_DURATION;
    const intensity = (Math.sin(progress * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    
    const glowFrame = getGlowFrame(intensity, layout);
    ctx.drawImage(
      glowFrame, 
      x - glowFrame.width / 2, 
      y - glowFrame.height / 2, 
      glowFrame.width, 
      glowFrame.height
    );
  });

  ctx.restore();
  ctx.filter = "none";
};

onMounted(() => {
  gsap.ticker.add(draw);
});

onUnmounted(() => {
  gsap.ticker.remove(draw);
  glowCache.clear();
});

watch([isMediumMode, isCrazyMode], () => {
  glowCache.clear();
});
</script>

<style lang="scss">
@keyframes smooth-glow {
  0% { box-shadow: 0 0 0px 0px rgba(67, 217, 173, 0.3), 0 0 0px 0px rgba(67, 217, 173, 0.2); }
  50% { box-shadow: 0 0 20px 10px rgba(67, 217, 173, 0.6), 0 0 40px 20px rgba(67, 217, 173, 0.4); }
  100% { box-shadow: 0 0 0px 0px rgba(67, 217, 173, 0.3), 0 0 0px 0px rgba(67, 217, 173, 0.2); }
}

.food-left {
  width: 100%;
  height: 80px;
  position: absolute;
  top: 50%;
  overflow: visible; 
  padding: 0;
  box-sizing: border-box;
  pointer-events: none;

  @include mobile {
    height: 100%;
    top: 0;
  }

  canvas {
    display: block;
    margin: 0 auto;
    position: relative;
    z-index: z("default");
  }

  &.medium-mode {
    height: 80px;
    top: 50%;

    @include mobile {
      height: 100%;
      top: 0;
    }
  }

  &.crazy-mode {
    height: 140px; 
    overflow-x: auto;
    overflow-y: hidden;
    padding: 5px;
    padding-bottom: 25px; 
    top: 45%; 
    pointer-events: auto;

    @include mobile {
      height: 100%;
      padding-bottom: 5px;
      top: 0;
    }

    scrollbar-width: thin;
    scrollbar-color: #{$accent2} transparent;
    
    canvas { 
      margin: 0; 
    }
  }
}

html[lang="es-ES"] {
  .food-left { top: 50%; }
}

.snake { width: 100%; height: 100%; background: $accent2; }

.food {
  width: 100%;
  height: 100%;
  background-color: $accent2;
  border-radius: 50%;
  animation: smooth-glow 3s ease-in-out infinite;
  box-shadow: 0 0 0px 0px rgba(67, 217, 173, 0.3), 0 0 0px 0px rgba(67, 217, 173, 0.2);
}
</style>
