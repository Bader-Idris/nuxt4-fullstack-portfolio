<template>
  <div class="game-container">
    <div class="screws">
      <span
        v-for="i in 4"
        :key="i"
      >x</span>
    </div>
    <SnakeGame
      :food-left="foodLeft"
      :update-food-left="Object(updateFoodLeft)"
      @food-eaten="handleFoodEaten"
      @game-over="handleGameOver"
    />
    <div class="game-controller">
      <span>{{ $t('home.gameTips_0') }}</span>
      <span>{{ $t('home.gameTips_1') }}</span>
      <div class="board-arrows">
        <span @click="triggerKeyPress('ArrowDown')"><i
          class="fas fa-triangle"
        /></span>
        <span @click="triggerKeyPress('ArrowRight')"><i
          class="fas fa-triangle left"
        /></span>
        <span @click="triggerKeyPress('ArrowUp')"><i
          class="fas fa-triangle down"
        /></span>
        <span @click="triggerKeyPress('ArrowLeft')"><i
          class="fas fa-triangle right"
        /></span>
      </div>
      <span>{{ $t('home.foodLeft') }}</span>
      <FoodComp :food-left="foodLeft" />
      <CustomLink
        aria-label="about page"
        to="/about"
        class="internal-link"
      >
        <CustomButtons
          button-type="ghost"
          class="skip"
        >
          {{ $t('home.skip') }}
        </CustomButtons>
      </CustomLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// Reactive state for food, typed as an array of FoodItem
const foodLeft = ref<{ eaten: boolean }[]>(Array.from({ length: 10 }, () => ({ eaten: false })))

// Function to update foodLeft, based on the score
function updateFoodLeft(score: number): void {
  for (let i = 0; i < score; ++i) {
    if (!foodLeft.value[i].eaten) {
      foodLeft.value[i].eaten = true
    }
  }
}

// Function to reset the foodLeft state to initial values
function resetFoodLeft(): void {
  foodLeft.value = Array.from({ length: 10 }, () => ({ eaten: false }))
}

// Function to trigger a keyboard event, with typed key parameter
function triggerKeyPress(key: string): void {
  if (import.meta.client) {
    const event = new KeyboardEvent('keydown', { key })
    document.dispatchEvent(event)
  }
}

// Function to handle food being eaten, updating foodLeft based on score
function handleFoodEaten(score: number): void {
  updateFoodLeft(score)
}

// Function to handle game over, resetting foodLeft state
function handleGameOver(): void {
  resetFoodLeft()
}
</script>

<style lang="scss">
.game-container {
  width: 510px;
  height: 475px;
  background: linear-gradient(-28deg, #175553 0%, rgba(67, 217, 173, 0.13) 100%);
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
      z-index: 0;

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
    content: '';
    position: absolute;
    box-shadow: 0 0 240px 200px rgba(67, 217, 173, 0.4);
    top: 0%;
    left: 20%;
    width: 0;
    height: 200px;
    transform: rotate(135deg);
    z-index: 1;
  }

  &::after {
    content: '';
    width: 0;
    height: 200px;
    position: absolute;
    top: 70%;
    left: 70%;
    box-shadow: 0 0 240px 200px rgba(77, 91, 206, 0.4); //40% of $gradients1
    transform: rotate(45deg);
    z-index: 1;
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
    }

    .board-arrows {
      position: relative;
      z-index: 1;
      height: 110px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-around;
      align-content: space-around;
      transform: rotate(180deg);

      > span {
        border-radius: 5px;
        width: 50px;
        height: 30px;
      }

      & span {
        text-align: center;
        line-height: 28px;
        cursor: pointer;
        display: inline-block;
        width: 50px;
        height: 30px;
        background: black;
        z-index: 3;

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

        & > i {
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

    .skip {
      position: absolute;
      padding: 10px 20px;
      bottom: 0;
      right: 0;
    }
  }
}
</style>
