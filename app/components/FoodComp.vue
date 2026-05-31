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
          width: isMobile ? (isCrazyMode ? `${canvasDisplayWidth}px` : '100%') : `${canvasDisplayWidth}px`, 
          height: isMobile ? '100%' : `${canvasDisplayHeight}px`,
          transform: isMobile ? (isCrazyMode ? `translateX(-${currentSafeZone}px)` : 'none') : `translate(-${currentSafeZone}px, -${currentSafeZone}px)`
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
  if (isMobile.value) return 20;
  return isCrazyMode.value ? 10 : 35;
});

const ACCENT2 = "#43d9ad";
const ANIMATION_DURATION = 3; 

const getLayout = () => {
  if (isMobile.value) {
    if (isCrazyMode.value) {
      return { size: 6, stepX: 12, stepY: 12, rows: 6, glowMax: 14, delayFactor: 0.1, delayMod: 10, baseHeight: 80 };
    } else if (isMediumMode.value) {
      return { size: 6, stepX: 18, stepY: 22, rows: 3, glowMax: 14, delayFactor: 0.1, delayMod: 10, baseHeight: 80 };
    } else {
      return { size: 10, stepX: 38, stepY: 34, rows: 2, glowMax: 33, delayFactor: 0.4, delayMod: 10, baseHeight: 80 };
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
  // Reduce precision to save memory and computing (from 60 levels to 20)
  const intensityKey = Math.round(intensity * 20); 
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
  
  let targetWidth = cols * stepX + currentSafeZone.value * 2;
  let targetHeight = layout.baseHeight + currentSafeZone.value * 2;

  if (isMobile.value) {
    const parent = canvas.parentElement;
    if (parent) {
      if (!isCrazyMode.value) targetWidth = parent.clientWidth;
      targetHeight = parent.clientHeight;
    }
  }
  
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(targetWidth * dpr) || canvas.height !== Math.floor(targetHeight * dpr)) {
    canvas.width = Math.floor(targetWidth * dpr);
    canvas.height = Math.floor(targetHeight * dpr);
    canvasDisplayWidth.value = targetWidth;
    canvasDisplayHeight.value = targetHeight;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Disable filter on mobile to save computing
  if (!isMobile.value) {
    ctx.filter = "blur(0.5px)";
  }
  
  ctx.save();
  ctx.scale(dpr, dpr);

  if (!isMobile.value) {
    ctx.translate(currentSafeZone.value, currentSafeZone.value);
  } else if (isCrazyMode.value) {
    ctx.translate(currentSafeZone.value, 0);
  }

  const time = gsap.ticker.time;
  const parentWidth = canvas.parentElement?.clientWidth || 0;
  const viewportLeft = isCrazyMode.value && canvas.parentElement ? canvas.parentElement.scrollLeft : 0;
  const viewportRight = viewportLeft + parentWidth;

  props.foodLeft.forEach((food, index) => {
    const col = Math.floor(index / rows);
    const row = index % rows;
    let x = col * stepX + stepX / 2;
    
    // Frustum culling: Skip drawing if item is outside the visible scroll area in crazy mode
    if (isCrazyMode.value && isMobile.value && parentWidth > 0) {
       if (x + 20 < viewportLeft || x - 20 > viewportRight) return;
    }

    const gridHeight = (rows - 1) * stepY;
    let y = row * stepY + (layout.baseHeight - gridHeight) / 2;

    if (isMobile.value && !isCrazyMode.value) {
      const totalContentWidth = cols * stepX;
      x += (targetWidth - totalContentWidth) / 2;
      y = row * stepY + (targetHeight - gridHeight) / 2;
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
    height: 80px;
    top: 0;
    position: relative;
    background: rgba(1, 8, 14, 0.85);
    border: 1px solid rgba(67, 217, 173, 0.2);
    border-radius: 8px;
    padding: 5px;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;

    &.crazy-mode {
      height: 80px;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      padding: 5px 8px;
      justify-content: flex-start;
      scrollbar-width: thin;
      scrollbar-color: #{$accent2} transparent;
    }
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
      height: 80px;
      top: 0;
    }
  }

  @include tablet-to-up {
    &.crazy-mode {
      height: 140px; 
      overflow-x: auto;
      overflow-y: hidden;
      padding: 5px;
      padding-bottom: 25px; 
      top: 45%; 
      pointer-events: auto;

      scrollbar-width: thin;
      scrollbar-color: #{$accent2} transparent;
      
      canvas { 
        margin: 0; 
      }
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