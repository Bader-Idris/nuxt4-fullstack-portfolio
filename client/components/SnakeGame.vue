<template>
  <div
    ref="board"
    class="game-screen"
  >
    <div class="scores">
      <p v-if="gameStarted || !gameOver">
        {{ formattedScore }}
      </p>
    </div>
    <div
      v-if="!gameStarted || gameOver"
      class="outcome-display"
    >
      <CustomButtons
        v-if="!gameStarted && !gameOver"
        button-type="ghost"
        @click="startGame"
      >
        {{ $t('home.gameCommand') }}
      </CustomButtons>

      <p
        v-if="gameOver && congratsMessage"
        class="outcome"
      >
        {{ isWon }}
      </p>
      <div
        v-if="congratsMessage"
        class="congrats"
        @click="startGame"
        @keydown.space="startGame"
      >
        {{ congratsMessage }}
      </div>
    </div>
    <div
      v-for="(segment, index) in snake"
      :key="index"
      class="snake"
      :style="{ gridColumn: segment.x, gridRow: segment.y }"
    />
    <div
      class="food"
      :style="{ gridColumn: food.x, gridRow: food.y }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { Howl, Howler } from 'howler'
import confetti from 'canvas-confetti'
import { useI18n } from 'vue-i18n'
// import { useInterval } from '@vueuse/core'
import eatingSound from '@/assets/sounds/swallow.wav'
import victorySound from '@/assets/sounds/victory.wav'
import wallHitSound from '@/assets/sounds/wall-hit.wav'
import snakeHissing from '@/assets/sounds/snake-hissing.wav'
import ouch from '@/assets/sounds/ouch.wav'

// Define the shape of the `sounds` object
type SoundKeys = 'snakeHissing' | 'eating' | 'wallHit' | 'ouch' | 'victory'
type SoundsMap = Record<SoundKeys, Howl | null>

// Initialize `sounds` as a reactive object
let sounds: SoundsMap | null = null

// Function to initialize sounds (called on user interaction)
const initializeSounds = () => {
  if (!sounds) {
    sounds = {
      snakeHissing: new Howl({ src: [snakeHissing], html5: true }),
      ouch: new Howl({ src: [ouch], html5: true }),
      eating: new Howl({ src: [eatingSound], html5: true }),
      wallHit: new Howl({ src: [wallHitSound], html5: true }),
      victory: new Howl({ src: [victorySound], html5: true }),
    }
  }
}

// Function to play a sound by key
const playSound = (key: SoundKeys) => {
  if (!sounds) {
    console.error('Sounds not initialized yet.')
    return
  }

  const sound = sounds[key]
  if (sound) {
    try {
      sound.stop() // Stop any existing playback to avoid overlapping
      sound.play() // Play the sound
    }
    catch (error) {
      console.error(`Error playing sound "${key}":`, error)
    }
  }
  else {
    console.error(`Sound key "${key}" not found.`)
  }
}

// Electron's Notification API
const isElectron = Capacitor.getPlatform() === 'electron'
const { t } = useI18n({ useScope: 'global' })

// Define props with proper types
defineProps<{
  foodLeft: { eaten: boolean }[]
  updateFoodLeft: () => void
}>()

// Emit types
const emit = defineEmits<{
  (e: 'foodEaten', score: number): void
  (e: 'gameOver'): void
}>()

// Reactive variables with types
const gridSize = ref<number>(20)
const snake = ref<{ x: number, y: number }[]>(
  Array.from({ length: 10 }, (_, index) => ({ x: 10, y: 20 + index })),
)
const food = ref<{ x: number, y: number }>({ x: 0, y: 0 }) // Initialize with default values
const direction = ref<string>('up')
const lastDirection = ref<string>('up') // Store last valid direction to avoid opposite direction issue
let gameInterval: number
const gameSpeedDelay = ref<number>(150)
const gameStarted = ref<boolean>(false)
const gameOver = ref<boolean>(false)
const congratsMessage = ref<string>('')
const score = ref<number>(0)
const winningScore = ref<number>(10)
const foodEatenRecently = ref<boolean>(false)

// Formatted score for singular/plural
const formattedScore = computed(() =>
  score.value === 1 ? `${t('home.score')}: ${score.value}` : `${t('home.scores')}: ${score.value}`,
)

// Key event listener lifecycle hooks
onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('keydown', handleKeyPress)
    const snakeHead = document.querySelector<HTMLElement>('div.game-screen > div:nth-child(3)')
    if (snakeHead) {
      snakeHead.style.borderRadius = '10px 10px 0 0'
    }

    // HTML5 Audio pool size
    Howler.html5PoolSize = 10 // same as default!
    // TODO: initializeSounds()

    // Generate food position on client side only
    food.value = generateFood()
  }
})

onUnmounted(() => {
  clearInterval(gameInterval)
  if (import.meta.client) {
    document.removeEventListener('keydown', handleKeyPress)
  }
})

// Watch for recent food eaten to reset animation after a delay
watch(foodEatenRecently, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      foodEatenRecently.value = false
    }, 300)
  }
})

// Function to show notification
async function showNotification(message: string) {
  // Check if the app is running on Electron
  if (isElectron) {
    const granted = await Notification.requestPermission()
    if (granted === 'granted') {
      const notification = new Notification('Victory!', {
        body: message,
        icon: '../../assets/icon-only.png',
        // vibrate: [200, 100, 200, 100, 200, 100, 200],
        tag: 'victory', // as ids, can override its same value
      })
      setTimeout(() => notification.close(), 3000)
    }
    // was new Notification
  }
  else if (
    Capacitor.getPlatform() === 'web'
    || Capacitor.getPlatform() === 'ios'
    || Capacitor.getPlatform() === 'android'
  ) {
    // Request permission for notifications if not already granted
    const granted = await LocalNotifications.requestPermissions()
    if (granted.display === 'granted') {
      // Schedule the notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: t('home.gameCongratsTitle'),
            body: message,
            id: 1, // Can we set it to TimeStamp
            schedule: { at: new Date(Date.now() + 3000) }, // 3 seconds delay
            sound: '',
            largeIcon: '/pwa-192x192.png',
            smallIcon: '/favicon-16x16.png', // should be in res/drawable, so this wouldn't work
            // attachments: null,
            silent: false,
            actionTypeId: '',
            extra: null, // for custom data
          },
        ],
      })
      await Haptics.impact({ style: ImpactStyle.Heavy }) // Haptic feedback on win
    }
  }
  else {
    console.log('Platform not supported for notifications')
  }
}

// Game logic (existing functions are skipped for brevity)
function checkWinCondition() {
  // Check if the player has won
  if (score.value >= winningScore.value) {
    playSound('victory')
    launchConfetti()
    launchConfettiInMiddle()
    stopGame('Play-again')

    // Trigger local notification on win
    showNotification(t('home.gameCongrats'))
  }
}

function updateHeadStyle(element: HTMLElement): void {
  switch (direction.value) {
    case 'up':
      element.style.borderRadius = '10px 10px 0 0'
      break
    case 'down':
      element.style.borderRadius = '0 0 10px 10px'
      break
    case 'left':
      element.style.borderRadius = '10px 0 0 10px'
      break
    case 'right':
      element.style.borderRadius = '0 10px 10px 0'
      break
  }
}

function generateFood(): { x: number, y: number } {
  const x = Math.floor(Math.random() * gridSize.value) + 1
  const y = Math.floor(Math.random() * (gridSize.value + 14)) + 1
  return { x, y }
}

function move(): void {
  const head = { ...snake.value[0] }

  if (
    (lastDirection.value === 'up' && direction.value === 'down')
    || (lastDirection.value === 'down' && direction.value === 'up')
    || (lastDirection.value === 'left' && direction.value === 'right')
    || (lastDirection.value === 'right' && direction.value === 'left')
  ) {
    direction.value = lastDirection.value
  }
  else {
    lastDirection.value = direction.value
  }

  // Update snake head position
  switch (direction.value) {
    case 'up':
      head.y--
      break
    case 'down':
      head.y++
      break
    case 'left':
      head.x--
      break
    case 'right':
      head.x++
      break
  }

  // Reactively update the snake's head style
  const headElement = document.querySelector<HTMLElement>('div.game-screen .snake')!
  if (headElement) {
    headElement.classList.add('head')
    updateHeadStyle(headElement)
  }

  snake.value.unshift(head)

  // Check if the snake ate the food
  if (head.x === food.value.x && head.y === food.value.y) {
    food.value = generateFood()
    emit('foodEaten', score.value + 1)
    increaseSpeed()
    score.value++
    foodEatenRecently.value = true
    playSound('eating')
    Haptics.vibrate({ duration: 50 }) // Vibration feedback on food eat
    clearInterval(gameInterval)
    gameInterval = window.setInterval(() => {
      move()
      checkCollision()
    }, gameSpeedDelay.value)
  }
  else {
    snake.value.pop()
  }

  checkWinCondition()
}

function startGame(): void {
  initializeSounds()
  resetGame()
  playSound('snakeHissing')
  gameInterval = window.setInterval(() => {
    move()
    checkCollision()
  }, gameSpeedDelay.value)
}

function resetGame(): void {
  gameStarted.value = true
  gameOver.value = false
  congratsMessage.value = ''
  score.value = 0
  snake.value = Array.from({ length: 10 }, (_, index) => ({ x: 10, y: 20 + index }))
  food.value = generateFood()
  clearInterval(gameInterval)
  emit('gameOver')
}

const isWon = computed(() =>
  score.value >= winningScore.value ? t('home.hasWon') : t('home.hasNotWon'),
)

function handleKeyPress(event: KeyboardEvent): void {
  // Allow starting/restarting the game with the space bar whether game is over or not
  if ((gameOver.value || !gameStarted.value) && (event.code === 'Space' || event.key === ' ')) {
    startGame() // Restart game on space bar
  }
  else if (gameStarted.value) {
    switch (event.key) {
      case 'ArrowUp':
        if (lastDirection.value !== 'down') direction.value = 'up'
        break
      case 'ArrowDown':
        if (lastDirection.value !== 'up') direction.value = 'down'
        break
      case 'ArrowLeft':
        if (lastDirection.value !== 'right') direction.value = 'left'
        break
      case 'ArrowRight':
        if (lastDirection.value !== 'left') direction.value = 'right'
        break
    }
  }
}

function launchConfettiInMiddle() {
  const count = 200
  const defaults = {
    origin: { y: 0.7 },
  }

  function fire(particleRatio: number, opts: Record<string, any>) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2, { spread: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  fire(0.1, { spread: 120, startVelocity: 45 })
}

function launchConfetti() {
  const end = Date.now() + 5 * 1000 // Confetti lasts for 5 seconds
  const colors = ['#bb0000', '#ffffff'] // Custom colors (Buckeyes)

    ; (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame) // Continue the confetti animation
    }
  })()
}

function increaseSpeed(): void {
  if (gameSpeedDelay.value > 50) {
    gameSpeedDelay.value -= 10
  }
}

function checkCollision(): void {
  const head = snake.value[0]
  if (head.x < 1 || head.x > gridSize.value || head.y < 1 || head.y > gridSize.value + 14) {
    playSound('wallHit')
    Haptics.vibrate({ duration: 100 }) // Vibration feedback on collision
    stopGame(t('home.again'))
    return
  }
  for (let i = 1; i < snake.value.length; i++) {
    if (head.x === snake.value[i].x && head.y === snake.value[i].y) {
      playSound('ouch')
      Haptics.vibrate({ duration: 100 }) // Vibration feedback on collision with self
      stopGame(t('home.again'))
      return
    }
  }
}

function stopGame(message: string): void {
  gameOver.value = true
  gameStarted.value = false
  gameSpeedDelay.value = 150
  direction.value = 'up'
  lastDirection.value = 'up'
  congratsMessage.value = message
  clearInterval(gameInterval)
}
</script>

<style lang="scss">
.game-screen {
  margin: 30px 5px 30px 33px;
  box-shadow: inset 1px 5px 11px 0 #02121b;
  background-color: rgb(1, 8, 14, 50%);
  z-index: 1;
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

      &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        background: $btn1-clr;
        left: 0;
        top: 0;
        z-index: -1;
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

.snake {
  &.head {
    border-radius: 10px;
  }
}
</style>
