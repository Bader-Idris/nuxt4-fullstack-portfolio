<template>
  <div ref="board" class="game-screen">
    <div class="scores">
      <p v-if="gameStarted || gameOver">
        {{ formattedScore }}
      </p>
    </div>
    <div v-if="!gameStarted || gameOver" class="outcome-display">
      <CustomButton
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
        :class="{ 'gold-neon': winningScore === 200, 'blue-neon': winningScore === 30 }"
      >
        {{ isWon }}
      </p>
      <div
        v-if="congratsMessage"
        ref="congratsEl"
        class="congrats"
        @click="handleStartClick"
        @keydown.space="handleStartClick"
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
      />
      <div class="food" :style="{ gridColumn: food.x, gridRow: food.y }" />
    </client-only>
  </div>
</template>

<script setup lang="ts">
import { Howl } from "howler";
import { useI18n } from "vue-i18n";
import { useIntervalFn, useEventListener, useTimeoutFn } from "@vueuse/core";
import eatingSound from "@/assets/sounds/swallow.mp3";
import victorySound from "@/assets/sounds/victory.mp3";
import wallHitSound from "@/assets/sounds/wall-hit.mp3";
import snakeHissing from "@/assets/sounds/snake-hissing.mp3";
import ouch from "@/assets/sounds/ouch.mp3";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import confetti from "canvas-confetti";

// Define the shape of the `sounds` object
type SoundKeys = "snakeHissing" | "eating" | "wallHit" | "ouch" | "victory";
type SoundsMap = Record<SoundKeys, Howl | null>;

// Initialize `sounds` as a reactive object
const sounds = ref<SoundsMap | null>(null);
const board = ref<HTMLElement | null>(null);
// const startButtonEl = ref<any>(null);
const congratsEl = ref<HTMLElement | null>(null);
const isClient = import.meta.client;

// Function to initialize sounds (called on user interaction)
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

// Function to play a sound by key
const playSound = (key: SoundKeys) => {
  if (!isClient || !sounds.value?.[key]) return;
  try {
    sounds.value[key]!.stop();
    sounds.value[key]!.play();
  } catch (error) {
    console.error(`Error playing sound "${key}":`, error);
  }
};

// Electron's Notification API
const isElectron = Capacitor.getPlatform() === "electron";
const { t } = useI18n({ useScope: "global" });

const isCapacitorDevice = useCapacitorDevice();
const { proxy } = useScriptGoogleTagManager();

// Define props with proper types
const props = defineProps<{
  foodLeft: { eaten: boolean }[];
  updateFoodLeft: () => void;
  triggerSignal?: { code: string; timestamp: number };
  winningScore?: number;
}>();

// Watch for external trigger signals
watch(
  () => props.triggerSignal,
  (signal) => {
    if (signal && isClient) {
      handleInput(signal.code);
    }
  },
);

// Emit types
const emit = defineEmits<{
  (e: "foodEaten", score: number): void;
  (e: "gameOver"): void;
}>();

// Reactive variables with types
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
const winningScore = computed(() => props.winningScore ?? 10);
const foodEatenRecently = ref<boolean>(false);

// Initialize snake and food on client side
if (isClient) {
  snake.value = Array.from({ length: 10 }, (_, index) => ({
    x: 10,
    y: 20 + index,
  }));
  food.value = generateFood();
}

// Formatted score for singular/plural
const formattedScore = computed(() =>
  score.value === 1
    ? `${t("home.score")}: ${score.value}`
    : `${t("home.scores")}: ${score.value}`,
);

// Computed property for win condition
const isWon = computed(() => {
  if (score.value >= winningScore.value) {
    if (winningScore.value === 200) {
      return t("home.hasWonCrazy");
    }
    if (winningScore.value === 30) {
      return t("home.hasWonMedium");
    }
    return t("home.hasWon");
  }
  return t("home.hasNotWon");
});

// UseIntervalFn for game loop
const { pause, resume } = useIntervalFn(
  () => {
    move();
    checkCollision();
  },
  gameSpeedDelay,
  { immediate: false },
);

// Client-side setup
onMounted(() => {
  if (!isClient) return;

  food.value = generateFood();

  // Update snake head style
  nextTick(() => {
    const snakeHead = board.value?.querySelector(".snake");
    if (snakeHead instanceof HTMLElement) {
      snakeHead.style.borderRadius = "10px 10px 0 0";
    }
  });
});

const foodEatenRecentlyTimeout = useTimeoutFn(
  () => {
    foodEatenRecently.value = false;
  },
  300,
  { immediate: false },
);

// Watch for recent food eaten to reset animation after a delay
watch(foodEatenRecently, (newVal) => {
  if (newVal && isClient) {
    foodEatenRecentlyTimeout.start();
  }
});

// Function to show notification
async function showNotification(message: string) {
  if (!isClient) return;

  if (isElectron) {
    const granted = await Notification.requestPermission();
    if (granted === "granted") {
      const notification = new Notification("Victory!", {
        body: message,
        icon: "../../assets/icon-only.png",
        tag: "victory",
      });
      // this is not a reactive one, so we don't have to use vueUse composable for it as in food one!
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
            schedule: { at: new Date(Date.now() + 3000) },
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
  } else {
    console.log("Platform not supported for notifications");
  }
}

// Game logic
function checkWinCondition() {
  if (score.value >= winningScore.value) {
    playSound("victory");
    if (isClient) {
      if (winningScore.value === 200) {
        // Massive golden/emerald confetti celebration for Crazy mode!
        launchConfetti(12000, ["#43d9ad", "#4d5bce", "#ffd700", "#ffffff"]);
        launchConfettiInMiddle();
        setTimeout(() => { launchConfettiInMiddle(); }, 3000);
        setTimeout(() => { launchConfettiInMiddle(); }, 6000);
      } else if (winningScore.value === 30) {
        // Medium emerald/blue confetti celebration
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
      if (winningScore.value === 30) {
        congratsMsg = t("home.gameCongratsMedium");
      } else if (winningScore.value === 200) {
        congratsMsg = t("home.gameCongratsCrazy");
      }
      showNotification(congratsMsg);
    }
  }
}

function updateHeadStyle(element: HTMLElement): void {
  switch (direction.value) {
    case "up":
      element.style.borderRadius = "10px 10px 0 0";
      break;
    case "down":
      element.style.borderRadius = "0 0 10px 10px";
      break;
    case "left":
      element.style.borderRadius = "10px 0 0 10px";
      break;
    case "right":
      element.style.borderRadius = "0 10px 10px 0";
      break;
  }
}

function generateFood(): { x: number; y: number } {
  const x = Math.floor(Math.random() * gridSize.value) + 1;
  const y = Math.floor(Math.random() * (gridSize.value + 14)) + 1;
  return { x, y };
}

function move(): void {
  if (!isClient) return;

  // Consume next direction from input queue if available
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

  // Update snake head position
  switch (direction.value) {
    case "up":
      head.y--;
      break;
    case "down":
      head.y++;
      break;
    case "left":
      head.x--;
      break;
    case "right":
      head.x++;
      break;
  }

  // Update the snake's head style
  const headElement = board.value?.querySelector(".snake");
  if (headElement instanceof HTMLElement) {
    headElement.classList.add("head");
    updateHeadStyle(headElement);
  }

  snake.value.unshift(head);

  // Check if the snake ate the food
  if (head.x === food.value.x && head.y === food.value.y) {
    food.value = generateFood();
    emit("foodEaten", score.value + 1);
    increaseSpeed();
    score.value++;
    foodEatenRecently.value = true;
    playSound("eating");
    if (Capacitor.isNativePlatform()) Haptics.vibrate({ duration: 50 });
  } else {
    snake.value.pop();
  }

  checkWinCondition();
}

function triggerStartAnimation(element: any) {
  if (!element) return;

  // A ref on a component might be the instance, so we try to get its root element ($el).
  // We fall back to the element itself if it's a direct DOM ref.
  const targetEl = element.$el || element;

  // Ensure we have a valid DOM element to animate.
  if (!targetEl || typeof targetEl.style === "undefined") {
    console.warn("GSAP animation target is not a valid DOM element:", element);
    // If we can't animate, we shouldn't start the game, as it would be immediate.
    // This respects the user's expectation of an animation delay.
    return;
  }
  useGSAP().to(targetEl, {
    scale: 0.9,
    duration: 0.1,
    yoyo: true,
    repeat: 1,
    onComplete: () => {
      useGSAP().set(targetEl, { clearProps: "all" });
      startGame();
    },
  });
}

function handleStartClick(event: MouseEvent) {
  initializeSounds();
  triggerStartAnimation(event.currentTarget as HTMLElement);
}

function startGame(): void {
  if (!isClient) return;

  proxy.dataLayer.push({ event: "start_game_pc" });

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
  pause();
  emit("gameOver");
  inputQueue.value = [];
}

function launchConfettiInMiddle() {
  if (!isClient) return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
  };

  function fire(particleRatio: number, opts: Record<string, any>) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

function launchConfetti(durationMs: number = 5000, customColors: string[] = ["#bb0000", "#ffffff"]) {
  if (!isClient) return;

  const end = Date.now() + durationMs; // Confetti lasts for custom duration
  // Custom colors
  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 60,
      origin: { x: 0 },
      colors: customColors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 60,
      origin: { x: 1 },
      colors: customColors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame); // Continue the confetti animation
    }
  })();
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
    if (Capacitor.isNativePlatform()) Haptics.vibrate({ duration: 100 });
    stopGame(t("home.again"));
    return;
  }
  for (let i = 1; i < snake.value.length; i++) {
    if (head.x === snake.value[i].x && head.y === snake.value[i].y) {
      playSound("ouch");
      if (Capacitor.isNativePlatform()) Haptics.vibrate({ duration: 100 });
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

// Handle input from keyboard or external controls
function handleInput(code: string) {
  if (!isClient) return;

  if ((gameOver.value || !gameStarted.value) && code === "Space") {
    initializeSounds();
    triggerStartAnimation(board.value);
  } else if (gameStarted.value) {
    let nextDir = "";
    switch (
      code // event.key is too specific and bad with i18n, requires you to use these two for one keyCode
    ) {
      //  ["س ", "s"]
      case "ArrowUp":
      case "KeyW":
        nextDir = "up";
        break;
      case "ArrowDown":
      case "KeyS":
        nextDir = "down";
        break;
      case "ArrowLeft":
      case "KeyA":
        nextDir = "left";
        break;
      case "ArrowRight":
      case "KeyD":
        nextDir = "right";
        break;
    }

    if (nextDir) {
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
  }
}

// Key event listener using useEventListener
useEventListener(document, "keydown", (event: KeyboardEvent) => {
  handleInput(event.code);
});

defineExpose({
  handleInput,
});
</script>

<style lang="scss">
.game-screen {
  margin: 30px 5px 30px 33px;
  box-shadow: inset 1px 5px 11px 0 #02121b;
  background-color: rgb(1, 8, 14, 50%);
  z-index: z("default");
  display: grid;
  grid-template-columns: repeat(20, 12px);
  // grid-template-rows: repeat(20, 12px);
  grid-template-rows: repeat(34, 12px);
  position: relative;

  .scores {
    position: absolute;
    bottom: -40px;
    width: 100%;
    text-align: center;
    color: $accent1;
    font-weight: bold;
    text-transform: uppercase;
  }

  .outcome-display {
    display: relative;
    button {
      background-color: $accent1;
      color: $primary1;
      border: none;
      border-radius: 8px;
      padding: 15px;
      font-family: $main-font;
      position: absolute;
      bottom: 20%;
      box-shadow: 0px 5px 5px 3px #00000052;
      user-select: none;
      left: 50%;
      cursor: pointer;
      transform: translateX(-50%);

      &:hover {
        opacity: 0.7;
      }

      &.hide {
        display: none;
      }
    }

    .outcome {
      position: absolute;
      top: 65%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 20px;
      width: 100%;
      text-align: center;
      box-shadow: inset 0px 2px 15px 9px #0000007d;
      background-color: #0000007d;
      color: $gradients2;
      font-size: 20px;
      text-transform: uppercase;

      &.gold-neon {
        color: #ffd700;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.4);
        box-shadow: inset 0px 2px 15px 9px rgba(255, 215, 0, 0.15);
        border-top: 1px solid rgba(255, 215, 0, 0.3);
        border-bottom: 1px solid rgba(255, 215, 0, 0.3);
      }

      &.blue-neon {
        color: #4d5bce;
        text-shadow: 0 0 10px rgba(77, 91, 206, 0.8), 0 0 20px rgba(77, 91, 206, 0.4);
        box-shadow: inset 0px 2px 15px 9px rgba(77, 91, 206, 0.15);
        border-top: 1px solid rgba(77, 91, 206, 0.3);
        border-bottom: 1px solid rgba(77, 91, 206, 0.3);
      }

      &::before {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        background: $btn1-clr;
        left: 0;
        top: 0;
        z-index: z("below");
      }
    }

    .congrats {
      position: absolute;
      bottom: 15%;
      left: 50%;
      transform: translateX(-50%);
      color: $secondary1;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }
  }
}

html[lang="es-ES"] {
  .outcome-display {
    .congrats {
      font-size: $code-snippets-size;
      width: 150px;
      text-align: center;
    }
  }
}

.snake {
  &.head {
    border-radius: 10px;
  }
}
</style>