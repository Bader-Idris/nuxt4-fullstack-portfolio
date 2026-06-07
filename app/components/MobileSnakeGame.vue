<template>
  <div 
    class="mobile-game-overlay" 
    @touchstart="onScreenTouchStart" 
    @touchmove="onScreenTouchMove" 
    @touchend="onScreenTouchEnd"
  >
    <!-- Close Button -->
    <button class="close-game-btn" @click="$emit('close')">
      {{ $t("home.close") }}
    </button>

    <div class="mobile-game-container">
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
            @click.stop="handleStartClick"
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
            @click.stop="handleStartClick"
          >
            {{ congratsMessage === 'Play-again' ? $t('home.again') : congratsMessage }}
          </div>
        </div>

        <client-only>
          <div
            v-for="(segment, index) in snake"
            :key="index"
            class="snake"
            :style="[
              { gridColumn: segment.x, gridRow: segment.y },
              index === 0 ? headStyle : {}
            ]"
            :class="{ head: index === 0 }"
          />
          <div class="food" :style="{ gridColumn: food.x, gridRow: food.y }" />
        </client-only>
      </div>

      <!-- Status: Food Left Progress Indicator -->
      <div class="mobile-status-container">
        <span class="status-title">{{ $t("home.foodLeft") }}</span>
        <LazyFoodComp :food-left="foodLeft" />
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
    </div>
    
    <!-- Floating Joystick Area -->
    <MobileJoystick 
      ref="joystickRef"
      :is-hint="!gameStarted"
      @move="handleInput"
      @start="initializeSounds"
    />
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

// --- Emits ---
const emit = defineEmits(['close']);

const joystickRef = ref<any>(null);

const onScreenTouchStart = (e: TouchEvent) => {
  if (joystickRef.value) {
    joystickRef.value.handleTouchStart(e);
  }
};

const onScreenTouchMove = (e: TouchEvent) => {
  if (joystickRef.value) {
    joystickRef.value.handleTouchMove(e);
  }
};

const onScreenTouchEnd = () => {
  if (joystickRef.value) {
    joystickRef.value.handleTouchEnd();
  }
};

const sounds = ref<SoundsMap | null>(null);
const board = ref<HTMLElement | null>(null);
const isClient = import.meta.client;
const isElectron = Capacitor.getPlatform() === "electron";
const isCapacitorDevice = useCapacitorDevice();
const { t } = useI18n({ useScope: "global" });
type SoundKeys = "snakeHissing" | "eating" | "wallHit" | "ouch" | "victory";
type SoundsMap = Record<SoundKeys, Howl | null>;

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

const activeModeLabel = computed(() => {
  if (winningScore.value === 670) return t("home.crazy");
  if (winningScore.value === 30) return t("home.medium");
  return t("home.normal");
});

const headStyle = computed(() => {
  switch (direction.value) {
    case "up": return { borderRadius: "10px 10px 0 0" };
    case "down": return { borderRadius: "0 0 10px 10px" };
    case "left": return { borderRadius: "10px 0 0 10px" };
    case "right": return { borderRadius: "0 10px 10px 0" };
    default: return { borderRadius: "10px 10px 0 0" };
  }
});

const foodLeft = ref<{ eaten: boolean }[]>(Array.from({ length: winningScore.value }, () => ({ eaten: false })));

watch(winningScore, (newVal) => {
  foodLeft.value = Array.from({ length: newVal }, () => ({ eaten: false }));
});

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

const isWon = computed(() => {
  if (score.value >= winningScore.value) {
    if (winningScore.value === 670) return t("home.hasWonCrazy");
    if (winningScore.value === 30) return t("home.hasWonMedium");
    return t("home.hasWon");
  }
  return t("home.hasNotWon");
});

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

const { pause, resume } = useIntervalFn(() => { move(); checkCollision(); }, gameSpeedDelay, { immediate: false });

const foodEatenRecentlyTimeout = useTimeoutFn(() => { foodEatenRecently.value = false; }, 300, { immediate: false });

watch(foodEatenRecently, (newVal) => { if (newVal && isClient) foodEatenRecentlyTimeout.start(); });

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

function launchConfettiInMiddle() {
  if (!isClient) return;
  const count = 150;
  const defaults = { origin: { y: 0.6 }, zIndex: 9999 };
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
    confetti({ particleCount: 2, angle: 60, spread: 50, origin: { x: 0 }, colors: customColors, zIndex: 9999 });
    confetti({ particleCount: 2, angle: 120, spread: 50, origin: { x: 1 }, colors: customColors, zIndex: 9999 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

function generateFood(): { x: number; y: number } {
  const x = Math.floor(Math.random() * gridSize.value) + 1;
  const y = Math.floor(Math.random() * (gridSize.value + 14)) + 1;
  return { x, y };
}

function handleInput(nextDir: string) {
  if (!gameStarted.value || gameOver.value) return;
  if (inputQueue.value.length < 2) {
    const lastQueuedDir = inputQueue.value.length > 0 ? inputQueue.value[inputQueue.value.length - 1] : lastDirection.value;
    if (nextDir !== lastQueuedDir) {
      const isOpposite = (nextDir === "up" && lastQueuedDir === "down") || (nextDir === "down" && lastQueuedDir === "up") || (nextDir === "left" && lastQueuedDir === "right") || (nextDir === "right" && lastQueuedDir === "left");
      if (!isOpposite) inputQueue.value.push(nextDir);
    }
  }
}

function move(): void {
  if (!isClient) return;
  if (inputQueue.value.length > 0) direction.value = inputQueue.value.shift()!;
  const head = { ...snake.value[0] };
  if ((lastDirection.value === "up" && direction.value === "down") || (lastDirection.value === "down" && direction.value === "up") || (lastDirection.value === "left" && direction.value === "right") || (lastDirection.value === "right" && direction.value === "left")) {
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
    if (score.value < winningScore.value) foodLeft.value[score.value].eaten = true;
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
  const decrement = winningScore.value === 10 ? 5 : 10;
  const minDelay = winningScore.value === 10 ? 80 : 50;
  if (gameSpeedDelay.value > minDelay) gameSpeedDelay.value -= decrement;
}

function checkCollision(): void {
  if (!isClient) return;
  const head = snake.value[0];
  if (head.x < 1 || head.x > gridSize.value || head.y < 1 || head.y > gridSize.value + 14) {
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

function handleStartClick() { initializeSounds(); startGame(); }

function startGame(): void {
  if (!isClient) return;
  resetGame();
  gameStarted.value = true;
  playSound("snakeHissing");
  resume();
}

function resetGame(): void {
  gameStarted.value = false;
  gameOver.value = false;
  congratsMessage.value = "";
  score.value = 0;
  snake.value = Array.from({ length: 10 }, (_, index) => ({ x: 10, y: 20 + index }));
  food.value = generateFood();
  foodLeft.value = Array.from({ length: winningScore.value }, () => ({ eaten: false }));
  pause();
  inputQueue.value = [];
}

onMounted(() => {
  snake.value = Array.from({ length: 10 }, (_, index) => ({ x: 10, y: 20 + index }));
  food.value = generateFood();
});

onUnmounted(() => { pause(); });
</script>

<style lang="scss">
.mobile-game-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100dvw;
  height: 100dvh;
  padding: 10px;
  box-sizing: border-box;
  background: rgba(1, 8, 14, 0.95);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  touch-action: none;
}

.close-game-btn {
  position: absolute;
  top: 60px;
  right: 50px;
  background: rgba(67, 217, 173, 0.2);
  color: $secondary1;
  border: 1px solid $accent1;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  z-index: 1002;
  font-size: 12px;
}

.mobile-game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  justify-content: space-evenly;
}

.mobile-scores-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 250px;
    margin-bottom: 4px;

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
    width: 90dvw;
    max-width: 300px;
    height: 60dvh;
    box-shadow: inset 1px 5px 11px 0 #02121b, 0 0 15px rgba(67, 217, 173, 0.15);
    background-color: rgba(1, 8, 14, 0.8);
    border: 2px solid rgba(67, 217, 173, 0.3);
    border-radius: 12px;
    display: grid;
    grid-template-columns: repeat(20, 1fr);
    grid-template-rows: repeat(34, 1fr);
    position: relative;
    overflow: hidden;
    margin: 10px 0;

    .mobile-outcome-display {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 100;
      background-color: rgba(1, 8, 14, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
      transform: scale(1.1);


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
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
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
    margin: 4px 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start; /* Align children to the left */
    position: relative;
    transform: translateY(-30px);

    .status-title {
      font-size: 11px;
      color: $secondary1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      align-self: flex-start; /* Ensure title is left-aligned */
    }
  }

  .mobile-mode-selector {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    background: rgba(0, 0, 0, 0.4);
    padding: 2px;
    border-radius: 6px;
    border: 1px solid rgba(67, 217, 173, 0.2);
    width: 250px;
    margin-bottom: 6px;

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
</style>