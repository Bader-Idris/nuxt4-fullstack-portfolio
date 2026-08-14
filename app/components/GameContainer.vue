<template>
  <div class="game-container">
    <div class="screws">
      <span v-for="i in 4" :key="i">x</span>
    </div>
    <LazySnakeGame
      hydrate-on-media-query="(min-width: 769px)"
      :food-left="foodLeft"
      :update-food-left="Object(updateFoodLeft)"
      :trigger-signal="triggerSignal"
      :winning-score="winningScore"
      @food-eaten="handleFoodEaten"
      @game-over="handleGameOver"
    />
    <div class="game-controller">
      <span>{{ $t("home.gameTips_0") }}</span>
      <span>{{ $t("home.gameTips_1") }}</span>
      <div class="board-arrows">
        <span
          class="key-arrow-down"
          @mousedown="handleArrowMouseDown('ArrowDown')"
          @mouseup="handleArrowMouseUp('ArrowDown')"
          @mouseleave="handleArrowMouseLeave('ArrowDown')"
        >
          <Icon name="bxs:up-arrow" width="15" height="15" mode="svg" />
        </span>
        <span
          class="key-arrow-right"
          @mousedown="handleArrowMouseDown('ArrowRight')"
          @mouseup="handleArrowMouseUp('ArrowRight')"
          @mouseleave="handleArrowMouseLeave('ArrowRight')"
        >
          <Icon
            name="bxs:up-arrow"
            width="15"
            height="15"
            mode="svg"
            class="left"
          />
        </span>
        <span
          class="key-arrow-up"
          @mousedown="handleArrowMouseDown('ArrowUp')"
          @mouseup="handleArrowMouseUp('ArrowUp')"
          @mouseleave="handleArrowMouseLeave('ArrowUp')"
        >
          <Icon
            name="bxs:up-arrow"
            width="15"
            height="15"
            mode="svg"
            class="down"
          />
        </span>
        <span
          class="key-arrow-left"
          @mousedown="handleArrowMouseDown('ArrowLeft')"
          @mouseup="handleArrowMouseUp('ArrowLeft')"
          @mouseleave="handleArrowMouseLeave('ArrowLeft')"
        >
          <Icon
            name="bxs:up-arrow"
            width="15"
            height="15"
            mode="svg"
            class="right"
          />
        </span>
      </div>
      <span>{{ $t("home.foodLeft") }}</span>
      <LazyFoodComp
        :food-left="foodLeft"
        hydrate-on-media-query="(min-width: 769px)"
      />
      <div class="mode-selector">
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
          :class="{ active: winningScore === 200 }"
          @click="setWinningScore(200)"
        >
          {{ $t("home.crazy") }}
        </button>
      </div>
      <CustomLink
        aria-label="about page"
        :to="localePath('/about')"
        class="internal-link"
      >
        <CustomButton button-type="ghost" class="skip">
          {{ $t("home.skip") }}
        </CustomButton>
      </CustomLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

const winningScore = ref(10);

// Reactive state for food, typed as an array of FoodItem
const foodLeft = ref<{ eaten: boolean }[]>(
  Array.from({ length: winningScore.value }, () => ({ eaten: false })),
);
const localePath = useLocalePath();
// const snakeGame = ref<any>(null) // Removed ref
const triggerSignal = ref<{ code: string; timestamp: number } | undefined>(
  undefined,
);

// Function to update foodLeft, based on the score
function updateFoodLeft(score: number): void {
  for (let i = 0; i < score; ++i) {
    if (foodLeft.value[i] && !foodLeft.value[i].eaten) {
      foodLeft.value[i].eaten = true;
    }
  }
}

// Function to reset the foodLeft state to initial values
function resetFoodLeft(): void {
  foodLeft.value = Array.from({ length: winningScore.value }, () => ({ eaten: false }));
}

// Function to set the winning score and handle game reset/sync
function setWinningScore(scoreValue: number): void {
  if (winningScore.value === scoreValue) return;
  winningScore.value = scoreValue;
  resetFoodLeft();
}

const getKeySelector = (key: string): string => {
  if (key === "ArrowUp" || key === "KeyW") return ".key-arrow-up";
  if (key === "ArrowDown" || key === "KeyS") return ".key-arrow-down";
  if (key === "ArrowLeft" || key === "KeyA") return ".key-arrow-left";
  if (key === "ArrowRight" || key === "KeyD") return ".key-arrow-right";
  return "";
};

const depressKey = (key: string) => {
  if (!import.meta.client) return;

  const selector = getKeySelector(key);
  if (!selector) return;

  const el = document.querySelector(selector) as HTMLElement;
  if (!el) return;

  useGSAP().killTweensOf(el);
  useGSAP().to(el, {
    y: 3,
    scale: 0.95,
    boxShadow: "0 1px 0px 0px #000, 0 1px 4px rgba(0,0,0,0.3)",
    backgroundColor: "#222",
    duration: 0.05,
    ease: "power1.out",
  });
};

const releaseKey = (key: string) => {
  if (!import.meta.client) return;

  const selector = getKeySelector(key);
  if (!selector) return;

  const el = document.querySelector(selector) as HTMLElement;
  if (!el) return;

  useGSAP().killTweensOf(el);
  useGSAP().to(el, {
    y: 0,
    scale: 1,
    boxShadow: "0 4px 0px 0px #000, 0 4px 10px rgba(0,0,0,0.5)",
    backgroundColor: "#111",
    duration: 0.1,
    ease: "power1.out",
    onComplete: () => {
      useGSAP().set(el, { clearProps: "all" });
    },
  });
};

// Function to handle mouse down on arrow keys
const handleArrowMouseDown = (key: string) => {
  depressKey(key);
  triggerSignal.value = { code: key, timestamp: Date.now() };
};

// Function to handle mouse up on arrow keys
const handleArrowMouseUp = (key: string) => {
  releaseKey(key);
};

// Function to handle mouse leave on arrow keys
const handleArrowMouseLeave = (key: string) => {
  releaseKey(key);
};

// Function to trigger a keyboard event, with typed key parameter
function triggerKeyPress(key: string): void {
  depressKey(key);
  setTimeout(() => releaseKey(key), 80);
  triggerSignal.value = { code: key, timestamp: Date.now() };
}

// Add keydown listener to animate the hints when physical keys are pressed
useEventListener(document, "keydown", (event: KeyboardEvent) => {
  if (event.repeat) return;
  depressKey(event.code);
});

// Add keyup listener to release the hints when physical keys are released
useEventListener(document, "keyup", (event: KeyboardEvent) => {
  releaseKey(event.code);
});

// Function to handle food being eaten, updating foodLeft based on score
function handleFoodEaten(score: number): void {
  updateFoodLeft(score);
}

// Function to handle game over, resetting foodLeft state
function handleGameOver(): void {
  resetFoodLeft();
}

onMounted(() => {
  if (import.meta.client) {
    useGSAP().set(".game-container", { x: 1500 });
    useGSAP().to(".game-container", {
      delay: 0.5,
      x: 0,
      duration: 0.5,
      zIndex: 1,
      ease: "back.out(1.7)",
    });
  }
});
</script>

<style lang="scss">
.game-container {
  width: 510px;
  height: 475px;
  background: linear-gradient(
    -28deg,
    #175553 0%,
    rgba(67, 217, 173, 0.13) 100%
  );
  border-radius: 10px;
  position: relative;
  display: flex;

  @media screen and (max-height: 668px) {
    transform: scale(0.8);
  }

  @media screen and (min-height: 10px) and (max-height: 468px) {
    transform: scale(0.5);
  }

  .screws {
    width: 100%;
    height: 100%;
    position: absolute;

    span {
      font-size: 8px;
      line-height: 13px;
      text-align: center;
      position: absolute;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      box-shadow:
        inset 1px -1px 6px 2px $primary2,
        0 3px 3px 0px $primary2;
      color: $primary1;
      background-color: $secondary2;
      z-index: z("zero");

      &:first-of-type {
        top: 10px;
        left: 10px;
      }

      &:nth-of-type(2) {
        top: 10px;
        right: 10px;
      }

      &:nth-of-type(3) {
        bottom: 10px;
        left: 10px;
      }

      &:last-of-type {
        bottom: 10px;
        right: 10px;
      }
    }
  }

  &::before {
    content: "";
    position: absolute;
    box-shadow: 0 0 240px 200px rgba(67, 217, 173, 0.4);
    top: 0%;
    left: 20%;
    width: 0;
    height: 0;
    transform: rotate(135deg);
    z-index: z("default");
  }

  &::after {
    content: "";
    width: 0;
    height: 0;
    position: absolute;
    top: 70%;
    left: 70%;
    box-shadow: 0 0 240px 200px rgba(77, 91, 206, 0.4); //40% of $gradients1
    transform: rotate(45deg);
    z-index: z("default");
  }

  & > *:not(.screws) {
    width: 50%;
    height: calc(100% - 65px);
    border-radius: 10px;
  }

  .game-controller {
    margin: 30px 33px 30px 15px;
    position: relative;

    & > span {
      display: block;
      margin: 10px 0;
      user-drag: none;
    }

    .mode-selector {
      display: flex;
      justify-content: space-between;
      gap: 5px;
      margin: 10px 0;
      background: rgba(0, 0, 0, 0.4);
      padding: 3px;
      border-radius: 6px;
      border: 1px solid rgba(67, 217, 173, 0.2);
      z-index: z("default");
      position: absolute;
      top: 295px;
      width: 100%;

      button {
        flex: 1;
        background: transparent;
        border: none;
        color: $secondary1;
        font-size: 10px;
        padding: 5px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        text-transform: uppercase;
        transition: all 0.3s ease;

        &:hover {
          color: $secondary4;
        }

        &.active {
          background: $accent2;
          color: $primary1;
          box-shadow: 0 0 8px rgba(67, 217, 173, 0.6);
        }
      }
    }

    .board-arrows {
      position: relative;
      z-index: z("default");
      height: 110px;
      @include flex-container(row, wrap, space-around, unset);
      align-content: space-around;
      transform: rotate(180deg);

      > span {
        user-select: none;
        border-radius: 5px;
        width: 50px;
        height: 30px;
      }

      & span {
        text-align: center;
        line-height: 26px;
        cursor: pointer;
        display: inline-block;
        width: 50px;
        height: 30px;
        background: #111;
        border: 1px solid #222;
        border-radius: 6px;
        box-shadow: 0 4px 0px 0px #000, 0 4px 10px rgba(0, 0, 0, 0.5);
        z-index: z("content");
        transition: background-color 0.1s, border-color 0.1s;

        &:hover {
          background-color: #1a1a1a;
          border-color: rgba($accent2, 0.4);
        }

        &:first-of-type {
          order: 2;
        }

        &:nth-of-type(2) {
          order: 1;
        }

        &:nth-of-type(3) {
          order: 4;
        }

        &:last-of-type {
          order: 3;
        }

        & svg {
          top: 3px;
          position: relative;

          & {
            font-size: 10px;
            color: $secondary4;

            &.left {
              transform: rotate(-90deg);
            }

            &.right {
              transform: rotate(-270deg);
            }

            &.down {
              transform: rotate(180deg);
            }
          }
        }
      }
    }

    .skip {
      position: absolute;
      padding: 10px 20px;
      bottom: 0;
      right: 0;
    }
  }
}

html[lang="es-ES"],
html[lang="es"] {
  .game-controller {
    > span:nth-of-type(2) {
      font-size: calc($body-text-size - 25%);
    }
  }
}

html[lang^="ar"] {
  .mode-selector {
    direction: rtl;
  }
}
</style>