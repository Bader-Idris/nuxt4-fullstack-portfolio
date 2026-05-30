<template>
  <div class="mobile-game-wrapper">
    <!-- Header: Score Display -->
    <div class="mobile-scores-header">
      <div class="score-pill">
        <span class="label">{{ $t("home.score") }}</span>
        <span class="value">{{ score }}</span>
      </div>
      <div class="difficulty-pill">
        <span class="value">{{ activeModeLabel }}</span>
      </div>
    </div>

    <!-- The Game Screen Board -->
    <div ref="board" class="mobile-game-screen">
      <div v-if="!gameStarted || gameOver" class="mobile-outcome-display">
        <CustomButton
          v-slot="{}"
          v-if="!gameStarted && !gameOver"
          button-type="ghost"
          data-game-control="start"
          @click="handleStartClick"
        >
          {{ $t("home.gameCommand") }}
        </CustomButton>

        <p
          v-if="gameOver && congratsMessage"
          class="outcome"
          :class="{ 'gold-neon': winningScore === 670, 'blue-neon': winningScore === 30 }"
        >
          {{ isWon }}
        </p>
        <div
          v-if="congratsMessage"
          class="congrats"
          @click="handleStartClick"
        >
          {{ congratsMessage }}
        </div>
      </div>

      <client-only>
        <div
          v-for="(segment, index) in snake"
          :key="index"
          class="snake"
          :style="{ gridColumn: segment.x, gridRow: segment.y }"
          :class="{ head: index === 0 }"
        />
        <div class="food" :style="{ gridColumn: food.x, gridRow: food.y }" />
      </client-only>
    </div>

    <!-- Status: Food Left Progress Indicator -->
    <div class="mobile-status-container">
      <span class="status-title">{{ $t("home.foodLeft") }}</span>
      <div class="food-box-container" :class="{ 'crazy-mode': winningScore === 670 }">
        <LazyFoodComp :food-left="foodLeft" />
      </div>
    </div>

    <!-- Difficulty Selectors (Compact Mode) -->
    <div class="mobile-mode-selector">
      <button
        :class="{ active: winningScore === 10 }"
        @click="setWinningScore(10)"
      >
        {{ $t("home.normal") }}
      </button>
      <button
        :class="{ active: winningScore === 30 }"
        @click="setWinningScore(30)"
      >
        {{ $t("home.medium") }}
      </button>
      <button
        :class="{ active: winningScore === 670 }"
        @click="setWinningScore(670)"
      >
        {{ $t("home.crazy") }}
      </button>
    </div>

    <!-- Interactive Joystick Area -->
    <div class="mobile-controls-container">
      <div class="joystick-container">
        <!-- Rive Canvas Joystick -->
        <canvas
          v-show="!showFallbackJoystick"
          ref="riveJoystickCanvas"
          class="rive-joystick-canvas"
        />

        <!-- High-Fidelity Touch Fallback Joystick -->
        <div
          v-show="showFallbackJoystick"
          ref="fallbackJoystickEl"
          class="fallback-joystick"
          @touchstart="onJoystickStart"
          @touchmove="onJoystickMove"
          @touchend="onJoystickEnd"
        >
          <div class="joystick-base">
            <div class="joystick-handle" :style="handleStyle" />
          </div>
        </div>
      </div>
      <div class="joystick-instructions">
        <span>{{ showFallbackJoystick ? '// drag joystick to slide' : '// use Rive joystick' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Howl } from "howler";
import { useI18n } from "vue-i18n";
import { useIntervalFn, useTimeoutFn } from "@vueuse/core";
import eatingSound from "@/assets/sounds/swallow.mp3";
import victorySound from "@/assets/sounds/victory.mp3";
import wallHitSound from "@/assets/sounds/wall-hit.mp3";
import snakeHissing from "@/assets/sounds/snake-hissing.mp3";
import ouch from "@/assets/sounds/ouch.mp3";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import confetti from "canvas-confetti";

// Define sound types
type SoundKeys = "snakeHissing" | "eating" | "wallHit" | "ouch" | "victory";
type SoundsMap = Record<SoundKeys, Howl | null>;

const sounds = ref<SoundsMap | null>(null);
const board = ref<HTMLElement | null>(null);
const isClient = import.meta.client;
const isElectron = Capacitor.getPlatform() === "electron";
const isCapacitorDevice = useCapacitorDevice();
const { t } = useI18n({ useScope: "global" });

// Reactive game parameters
const gridSize = ref<number>(20);
const snake = ref<{ x: number; y: number }[]>([]);
const food = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const direction = ref<string>("up");
const lastDirection = ref<string>("up");
const inputQueue = ref<string[]>([]);
const gameSpeedDelay = ref<number>(130);
const gameStarted = ref<boolean>(false);
const gameOver = ref<boolean>(false);
const congratsMessage = ref<string>("");
const score = ref<number>(0);
const winningScore = ref<number>(10);
const foodEatenRecently = ref<boolean>(false);

// Active Mode Label computed property
const activeModeLabel = computed(() => {
  if (winningScore.value === 670) return t("home.crazy");
  if (winningScore.value === 30) return t("home.medium");
  return t("home.normal");
});

// Food progress tracking reactive array
const foodLeft = ref<{ eaten: boolean }[]>(
  Array.from({ length: winningScore.value }, () => ({ eaten: false }))
);

// Initialize food Left tracking array when winning score changes
watch(winningScore, (newVal) => {
  foodLeft.value = Array.from({ length: newVal }, () => ({ eaten: false }));
});

// Rive state and canvas refs
const riveJoystickCanvas = ref<HTMLCanvasElement | null>(null);
const showFallbackJoystick = ref<boolean>(true);
let riveInstance: any = null;

// Fallback Joystick drag coordinates
const joystickPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const isDraggingJoystick = ref<boolean>(false);
const fallbackJoystickEl = ref<HTMLElement | null>(null);
const joystickCenter = ref<{ x: number; y: number }>({ x: 0, y: 0 });

// Handle styling calculation for the fallback joystick knob
const handleStyle = computed(() => {
  return {
    transform: `translate(${joystickPos.value.x}px, ${joystickPos.value.y}px)`,
    transition: isDraggingJoystick.value ? "none" : "transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)"
  };
});

// Sound initialization on interaction
const initializeSounds = () => {
  if (isClient && !sounds.value) {
    sounds.value = {
      snakeHissing: new Howl({ src: [snakeHissing], preload: true }),
      ouch: new Howl({ src: [ouch] }),
      eating: new Howl({ src: [eatingSound], preload: true }),
      wallHit: new Howl({ src: [wallHitSound] }),
      victory: new Howl({ src: [victorySound] }),
    };
  }
};

const playSound = (key: SoundKeys) => {
  if (!isClient || !sounds.value?.[key]) return;
  try {
    sounds.value[key]!.stop();
    sounds.value[key]!.play();
  } catch (error) {
    console.error(`Error playing sound "${key}":`, error);
  }
};

// Formatted win outcome computed string
const isWon = computed(() => {
  if (score.value >= winningScore.value) {
    if (winningScore.value === 670) return t("home.hasWonCrazy");
    if (winningScore.value === 30) return t("home.hasWonMedium");
    return t("home.hasWon");
  }
  return t("home.hasNotWon");
});

// Local notifications wrapper
async function showNotification(message: string) {
  if (!isClient) return;

  if (isElectron) {
    const granted = await Notification.requestPermission();
    if (granted === "granted") {
      const notification = new Notification("Victory!", {
        body: message,
        icon: "/pwa-192x192.png",
        tag: "victory",
      });
      setTimeout(() => notification.close(), 3000);
    }
  } else if ((await isCapacitorDevice) || Capacitor.getPlatform() === "web") {
    const granted = await LocalNotifications.requestPermissions();
    if (granted.display === "granted") {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: t("home.gameCongratsTitle"),
            body: message,
            id: 1,
            schedule: { at: new Date(Date.now() + 100) },
            sound: "",
            largeIcon: "/pwa-192x192.png",
            smallIcon: "/favicon-16x16.png",
            silent: false,
            actionTypeId: "",
            extra: null,
          },
        ],
      });
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  }
}

// Game core logic loop
const { pause, resume } = useIntervalFn(
  () => {
    move();
    checkCollision();
  },
  gameSpeedDelay,
  { immediate: false }
);

// Watchers for food timing
const foodEatenRecentlyTimeout = useTimeoutFn(() => {
  foodEatenRecently.value = false;
}, 300, { immediate: false });

watch(foodEatenRecently, (newVal) => {
  if (newVal && isClient) {
    foodEatenRecentlyTimeout.start();
  }
});

// Check win criteria
function checkWinCondition() {
  if (score.value >= winningScore.value) {
    playSound("victory");
    if (isClient) {
      if (winningScore.value === 670) {
        launchConfetti(12000, ["#43d9ad", "#4d5bce", "#ffd700", "#ffffff"]);
        launchConfettiInMiddle();
        setTimeout(() => launchConfettiInMiddle(), 3000);
        setTimeout(() => launchConfettiInMiddle(), 6000);
      } else if (winningScore.value === 30) {
        launchConfetti(7000, ["#43d9ad", "#4d5bce", "#ffffff"]);
        launchConfettiInMiddle();
      } else {
        launchConfetti(5000, ["#43d9ad", "#ffffff"]);
        launchConfettiInMiddle();
      }
    }
    stopGame("Play-again");
    if (isClient) {
      let congratsMsg = t("home.gameCongrats");
      if (winningScore.value === 30) congratsMsg = t("home.gameCongratsMedium");
      else if (winningScore.value === 670) congratsMsg = t("home.gameCongratsCrazy");
      showNotification(congratsMsg);
    }
  }
}

// Confetti effects
function launchConfettiInMiddle() {
  if (!isClient) return;
  const count = 150;
  const defaults = { origin: { y: 0.6 } };
  const fire = (particleRatio: number, opts: Record<string, any>) => {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  };
  fire(0.25, { spread: 26, startVelocity: 45 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 80, decay: 0.92, scalar: 0.8 });
  fire(0.1, { spread: 100, startVelocity: 25, decay: 0.93, scalar: 1.2 });
  fire(0.1, { spread: 100, startVelocity: 35 });
}

function launchConfetti(durationMs: number = 5000, customColors: string[] = ["#bb0000", "#ffffff"]) {
  if (!isClient) return;
  const end = Date.now() + durationMs;
  (function frame() {
    confetti({ particleCount: 2, angle: 60, spread: 50, origin: { x: 0 }, colors: customColors });
    confetti({ particleCount: 2, angle: 120, spread: 50, origin: { x: 1 }, colors: customColors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// Coordinate food generator
function generateFood(): { x: number; y: number } {
  const x = Math.floor(Math.random() * gridSize.value) + 1;
  const y = Math.floor(Math.random() * (gridSize.value + 14)) + 1;
  return { x, y };
}

// Handle inputs
function handleInput(nextDir: string) {
  if (!gameStarted.value || gameOver.value) return;

  // Cap input queue size to 2 to prevent control lag
  if (inputQueue.value.length < 2) {
    const lastQueuedDir = inputQueue.value.length > 0 
      ? inputQueue.value[inputQueue.value.length - 1] 
      : lastDirection.value;

    if (nextDir !== lastQueuedDir) {
      const isOpposite = 
        (nextDir === "up" && lastQueuedDir === "down") ||
        (nextDir === "down" && lastQueuedDir === "up") ||
        (nextDir === "left" && lastQueuedDir === "right") ||
        (nextDir === "right" && lastQueuedDir === "left");

      if (!isOpposite) {
        inputQueue.value.push(nextDir);
      }
    }
  }
}

// Core move logic
function move(): void {
  if (!isClient) return;

  if (inputQueue.value.length > 0) {
    direction.value = inputQueue.value.shift()!;
  }

  const head = { ...snake.value[0] };

  if (
    (lastDirection.value === "up" && direction.value === "down") ||
    (lastDirection.value === "down" && direction.value === "up") ||
    (lastDirection.value === "left" && direction.value === "right") ||
    (lastDirection.value === "right" && direction.value === "left")
  ) {
    direction.value = lastDirection.value;
  } else {
    lastDirection.value = direction.value;
  }

  switch (direction.value) {
    case "up": head.y--; break;
    case "down": head.y++; break;
    case "left": head.x--; break;
    case "right": head.x++; break;
  }

  snake.value.unshift(head);

  if (head.x === food.value.x && head.y === food.value.y) {
    food.value = generateFood();
    
    // Update food indicator array
    if (score.value < winningScore.value) {
      foodLeft.value[score.value].eaten = true;
    }
    
    increaseSpeed();
    score.value++;
    foodEatenRecently.value = true;
    playSound("eating");
    if (Capacitor.isNativePlatform()) Haptics.vibrate({ duration: 40 });
  } else {
    snake.value.pop();
  }

  checkWinCondition();
}

function increaseSpeed(): void {
  if (gameSpeedDelay.value > 50) {
    gameSpeedDelay.value -= 10;
  }
}

function checkCollision(): void {
  if (!isClient) return;
  const head = snake.value[0];
  if (
    head.x < 1 ||
    head.x > gridSize.value ||
    head.y < 1 ||
    head.y > gridSize.value + 14
  ) {
    playSound("wallHit");
    if (Capacitor.isNativePlatform()) Haptics.vibrate({ duration: 90 });
    stopGame(t("home.again"));
    return;
  }
  for (let i = 1; i < snake.value.length; i++) {
    if (head.x === snake.value[i].x && head.y === snake.value[i].y) {
      playSound("ouch");
      if (Capacitor.isNativePlatform()) Haptics.vibrate({ duration: 90 });
      stopGame(t("home.again"));
      return;
    }
  }
}

function stopGame(message: string): void {
  gameOver.value = true;
  gameStarted.value = false;
  gameSpeedDelay.value = 130;
  direction.value = "up";
  lastDirection.value = "up";
  congratsMessage.value = message;
  pause();
  inputQueue.value = [];
}

function setWinningScore(scoreValue: number): void {
  if (winningScore.value === scoreValue) return;
  winningScore.value = scoreValue;
  resetGame();
}

function handleStartClick() {
  initializeSounds();
  startGame();
}

function startGame(): void {
  if (!isClient) return;
  resetGame();
  playSound("snakeHissing");
  resume();
}

function resetGame(): void {
  gameStarted.value = true;
  gameOver.value = false;
  congratsMessage.value = "";
  score.value = 0;
  snake.value = Array.from({ length: 10 }, (_, index) => ({
    x: 10,
    y: 20 + index,
  }));
  food.value = generateFood();
  
  // Reset food list state
  foodLeft.value = Array.from({ length: winningScore.value }, () => ({ eaten: false }));
  
  pause();
  inputQueue.value = [];
}

// Fallback touch joystick drag event handlers
const onJoystickStart = (e: TouchEvent) => {
  initializeSounds();
  isDraggingJoystick.value = true;
  const rect = fallbackJoystickEl.value?.getBoundingClientRect();
  if (rect) {
    joystickCenter.value = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    console.log(`[Fallback Joystick] Touch Start. Center coordinates: (${joystickCenter.value.x.toFixed(1)}, ${joystickCenter.value.y.toFixed(1)})`);
  }
};

const onJoystickMove = (e: TouchEvent) => {
  if (!isDraggingJoystick.value) return;
  e.preventDefault(); // Lock mobile drag actions
  
  const touch = e.touches[0];
  const dx = touch.clientX - joystickCenter.value.x;
  const dy = touch.clientY - joystickCenter.value.y;
  
  const maxRadius = 38; // Circular clamping radius
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    joystickPos.value = { x: 0, y: 0 };
    return;
  }
  
  const angle = Math.atan2(dy, dx);
  const clampedRadius = Math.min(distance, maxRadius);
  const x = Math.cos(angle) * clampedRadius;
  const y = Math.sin(angle) * clampedRadius;
  
  joystickPos.value = { x, y };
  
  console.log(`[Fallback Joystick] Touch Dragging. Offset: (${dx.toFixed(1)}, ${dy.toFixed(1)}), Clamped: (${x.toFixed(1)}, ${y.toFixed(1)}), Distance: ${distance.toFixed(1)}`);
  
  // Vector threshold before mapping to directions
  const threshold = 12;
  if (distance > threshold) {
    processCoords(x, y);
  } else {
    console.log(`[Fallback Joystick] Drag distance ${distance.toFixed(1)} below threshold ${threshold}`);
  }
};

const onJoystickEnd = () => {
  console.log("[Fallback Joystick] Touch End. Resetting joystick position to center.");
  isDraggingJoystick.value = false;
  joystickPos.value = { x: 0, y: 0 };
};

const processCoords = (x: number, y: number) => {
  const threshold = 12; // Universal deadzone threshold
  const distance = Math.sqrt(x * x + y * y);
  
  console.log(`[Joystick Coords] Raw input: (${x.toFixed(1)}, ${y.toFixed(1)}), Distance: ${distance.toFixed(1)}`);
  
  if (distance < threshold) {
    console.log(`[Joystick Coords] Ignored coordinate: distance ${distance.toFixed(1)} is inside deadzone threshold ${threshold}`);
    return;
  }
  
  // Calculate angle in degrees (0 to 360)
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  
  let nextDir = "";
  // Divide into 4 clean 90-degree quadrant segments centered on the axes:
  // Right: 315° to 45°
  // Down: 45° to 135°
  // Left: 135° to 225°
  // Up: 225° to 315°
  if (angle >= 315 || angle < 45) {
    nextDir = "ArrowRight";
  } else if (angle >= 45 && angle < 135) {
    nextDir = "ArrowDown";
  } else if (angle >= 135 && angle < 225) {
    nextDir = "ArrowLeft";
  } else if (angle >= 225 && angle < 315) {
    nextDir = "ArrowUp";
  }
  
  console.log(`[Joystick Coords] Angle: ${angle.toFixed(1)}° -> Mapped Direction: ${nextDir}`);
  handleInput(nextDir);
};

// Mount hook: load Rive joystick or fallback
onMounted(async () => {
  if (!isClient) return;

  // Set initial snake coordinates
  snake.value = Array.from({ length: 10 }, (_, index) => ({
    x: 10,
    y: 20 + index,
  }));
  food.value = generateFood();

  // Attempt to load Rive Canvas Joystick
  try {
    console.log("[Rive Joystick] Attempting to import Rive runtime and load /joystick.riv...");
    const { Rive } = await import("@rive-app/canvas");
    if (riveJoystickCanvas.value) {
      riveInstance = new Rive({
        src: "/joystick.riv", // Tries to load from public assets
        canvas: riveJoystickCanvas.value,
        autoplay: true,
        stateMachines: "State Machine 1",
        onLoad: () => {
          console.log("[Rive Joystick] Loaded /joystick.riv successfully. Hiding fallback touch controls.");
          showFallbackJoystick.value = false;
          
          // Access inputs on load
          const inputs = riveInstance.stateMachineInputs("State Machine 1");
          console.log("[Rive Joystick] State Machine 1 Inputs discovered:", inputs.map((i: any) => i.name));
          
          const xInput = inputs.find((i: any) => i.name === "x" || i.name === "joystickX" || i.name === "X");
          const yInput = inputs.find((i: any) => i.name === "y" || i.name === "joystickY" || i.name === "Y");
          
          if (xInput || yInput) {
            console.log(`[Rive Joystick] Coordinate inputs registered. X: "${xInput?.name}", Y: "${yInput?.name}"`);
            // Check coordinates periodically in game loop
            useIntervalFn(() => {
              const rx = xInput ? xInput.value : 0;
              const ry = yInput ? yInput.value : 0;
              
              if (rx !== 0 || ry !== 0) {
                console.log(`[Rive Joystick] Raw state values polled -> X: ${rx.toFixed(1)}, Y: ${ry.toFixed(1)}`);
                processCoords(rx, ry);
              }
            }, 50);
          } else {
            console.warn("[Rive Joystick] No suitable x/y inputs found in Rive state machine!");
          }
        },
        onLoadError: () => {
          console.error("[Rive Joystick] Failed to load /joystick.riv from public assets. Falling back to Touch Joystick.");
          showFallbackJoystick.value = true;
        }
      });
    }
  } catch (err) {
    console.error("[Rive Joystick] Error loading Rive runtime:", err);
    showFallbackJoystick.value = true;
  }
});

onUnmounted(() => {
  if (riveInstance) {
    riveInstance.stop();
  }
  pause();
});
</script>

<style lang="scss">
.mobile-game-wrapper {
  position: absolute;
  top: -60px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: calc(100% - 10px);
  box-sizing: border-box;
  font-family: $main-font;
  padding: 10px 15px 20px;
  background: #01080e; // Full theme background overlay to hide everything behind it
  z-index: 10;

  .mobile-scores-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 250px;
    margin-bottom: 8px;

    .score-pill {
      background: rgba(1, 8, 14, 0.65);
      border: 1px solid rgba(67, 217, 173, 0.2);
      border-radius: 20px;
      padding: 4px 12px;
      display: flex;
      gap: 6px;
      font-size: 11px;
      color: $secondary1;

      .label {
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .value {
        color: $accent1;
        font-weight: bold;
      }
    }

    .difficulty-pill {
      background: rgba(1, 8, 14, 0.65);
      border: 1px solid rgba(67, 217, 173, 0.2);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: bold;
      color: $accent2;
    }
  }

  .mobile-game-screen {
    width: 240px;
    height: 408px;
    box-shadow: inset 1px 5px 11px 0 #02121b;
    background-color: rgba(1, 8, 14, 0.75);
    border: 1px solid rgba(67, 217, 173, 0.25);
    border-radius: 8px;
    display: grid;
    grid-template-columns: repeat(20, 12px);
    grid-template-rows: repeat(34, 12px);
    position: relative;
    overflow: hidden;

    .mobile-outcome-display {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: z("tooltip");
      background-color: rgba(1, 8, 14, 0.75);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

      .outcome {
        padding: 12px;
        width: 100%;
        text-align: center;
        background-color: rgba(0, 0, 0, 0.8);
        color: $gradients2;
        font-size: 16px;
        text-transform: uppercase;
        margin-bottom: 20px;

        &.gold-neon {
          color: #ffd700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
          border-top: 1px solid rgba(255, 215, 0, 0.3);
          border-bottom: 1px solid rgba(255, 215, 0, 0.3);
        }

        &.blue-neon {
          color: #4d5bce;
          text-shadow: 0 0 10px rgba(77, 91, 206, 0.8);
          border-top: 1px solid rgba(77, 91, 206, 0.3);
          border-bottom: 1px solid rgba(77, 91, 206, 0.3);
        }
      }

      .congrats {
        color: $secondary1;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        padding: 8px 16px;
        border: 1px solid rgba(67, 217, 173, 0.4);
        border-radius: 4px;
        background: rgba(1, 8, 14, 0.9);
      }
    }
  }

  .mobile-status-container {
    width: 250px;
    margin: 8px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;

    .status-title {
      font-size: 11px;
      color: $secondary1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .food-box-container {
      background: rgba(1, 8, 14, 0.85);
      border: 1px solid rgba(67, 217, 173, 0.2);
      border-radius: 8px;
      padding: 10px 12px;
      width: 100%;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
      box-sizing: border-box;
      
      // Horizontal scrolling for Crazy Mode
      &.crazy-mode {
        overflow-x: auto !important;
        overflow-y: hidden !important;
        white-space: nowrap !important;
        padding: 12px;
        height: 48px;

        &::-webkit-scrollbar {
          height: 4px;
        }
        &::-webkit-scrollbar-thumb {
          background: $accent2;
          border-radius: 2px;
        }
      }

      .food-left {
        position: static !important;
        height: auto !important;
        min-height: auto !important;
        display: grid !important;
        grid-template-columns: repeat(10, 1fr) !important;
        gap: 6px !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;

        &.crazy-mode {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          gap: 6px !important;
          width: max-content !important;
          height: 100% !important;
          align-items: center !important;
        }

        & > span {
          width: 12px !important;
          height: 12px !important;
          margin: 0 !important;
          background-color: $accent2;
          border-radius: 3px !important;
          box-shadow: 0 0 4px rgba(67, 217, 173, 0.3) !important;
          transition: all 0.3s ease;
          animation: none !important;
          flex-shrink: 0 !important;

          &.eaten {
            background-color: rgba(67, 217, 173, 0.1) !important;
            border: 1px dashed rgba(67, 217, 173, 0.2) !important;
            box-shadow: none !important;
            opacity: 0.3;
          }
        }
      }
    }
  }

  .mobile-mode-selector {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    background: rgba(0, 0, 0, 0.4);
    padding: 3px;
    border-radius: 6px;
    border: 1px solid rgba(67, 217, 173, 0.2);
    width: 250px;
    margin-bottom: 12px;

    button {
      flex: 1;
      background: transparent;
      border: none;
      color: $secondary1;
      font-size: 9px;
      padding: 6px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      text-transform: uppercase;
      transition: all 0.3s ease;

      &.active {
        background: $accent2;
        color: $primary1;
        box-shadow: 0 0 6px rgba(67, 217, 173, 0.5);
      }
    }
  }

  .mobile-controls-container {
    display: flex;
    flex-direction: column;
    align-items: center;

    .joystick-container {
      width: 100px;
      height: 100px;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;

      .rive-joystick-canvas {
        width: 100%;
        height: 100%;
      }

      .fallback-joystick {
        width: 90px;
        height: 90px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(1, 8, 14, 0.45) 0%, rgba(2, 18, 27, 0.7) 100%);
        border: 2px solid rgba(67, 217, 173, 0.25);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), inset 0 2px 5px rgba(255, 255, 255, 0.05);
        display: flex;
        justify-content: center;
        align-items: center;
        touch-action: none;

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
    }

    .joystick-instructions {
      margin-top: 4px;
      font-size: 9px;
      color: rgba($secondary1, 0.65);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}
</style>
