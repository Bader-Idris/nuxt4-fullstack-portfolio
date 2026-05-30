<template>
  <div
    class="food-left"
    :class="{ 'medium-mode': isMediumMode, 'crazy-mode': isCrazyMode }"
    role="list"
    aria-label="Food items"
  >
    <span
      v-for="(span, index) in foodLeft"
      :key="index"
      :class="{ eaten: span.eaten }"
      role="listitem"
      :aria-label="span.eaten ? 'Eaten food item' : 'Uneaten food item'"
      tabindex="0"
      :style="{ animationDelay: isCrazyMode ? `${(index % 20) * 0.05}s` : isMediumMode ? `${(index % 10) * 0.1}s` : `${index * 0.4}s` }"
    />
  </div>
</template>

<script setup lang="ts">
interface FoodItem {
  eaten: boolean;
}

const props = defineProps<{
  foodLeft: FoodItem[];
}>();

const isMediumMode = computed(() => props.foodLeft.length === 30);
const isCrazyMode = computed(() => props.foodLeft.length > 30);
</script>

<style lang="scss">
@keyframes smooth-glow {
  0% {
    box-shadow:
      0 0 0px 0px rgba(67, 217, 173, 0.3),
      // Start with a subtle glow
      0 0 0px 0px rgba(67, 217, 173, 0.2);
  }

  50% {
    box-shadow:
      0 0 20px 10px rgba(67, 217, 173, 0.6),
      // Increase glow size and intensity
      0 0 40px 20px rgba(67, 217, 173, 0.4);
  }

  100% {
    box-shadow:
      0 0 0px 0px rgba(67, 217, 173, 0.3),
      // Return to subtle glow
      0 0 0px 0px rgba(67, 217, 173, 0.2);
  }
}

@keyframes medium-smooth-glow {
  0% {
    box-shadow:
      0 0 0px 2px rgba(67, 217, 173, 0.3);
  }
  50% {
    box-shadow:
      0 0 8px 4px rgba(67, 217, 173, 0.5);
  }
  100% {
    box-shadow:
      0 0 0px 2px rgba(67, 217, 173, 0.3);
  }
}

@keyframes crazy-smooth-glow {
  0% {
    box-shadow:
      0 0 0px 0px rgba(67, 217, 173, 0.3);
  }
  50% {
    box-shadow:
      0 0 4px 2px rgba(67, 217, 173, 0.6);
  }
  100% {
    box-shadow:
      0 0 0px 0px rgba(67, 217, 173, 0.3);
  }
}

.food-left {
  width: 100%;
  height: 80px;
  position: absolute;
  top: 50%;
  @include flex-container(column, wrap, space-around, stretch);
  align-content: space-around;

  & > span {
    width: 8px;
    height: 8px;
    background-color: $accent2;
    border-radius: 50%;
    box-shadow:
      0 0 0px 5px rgba(67, 217, 173, 0.4),
      0 0 0px 10px rgba(67, 217, 173, 0.2);
    margin: 15px;
    transition:
      transform 0.3s ease-in-out,
      box-shadow 0.3s ease-in-out;
    animation: smooth-glow 3s ease-in-out infinite;

    &.eaten {
      opacity: 0.3;
      animation: none; // Disable animation for eaten items
    }
  }

  &.medium-mode {
    height: 80px;
    top: 50%;

    & > span {
      width: 6px;
      height: 6px;
      margin: 4px;
      box-shadow:
        0 0 0px 3px rgba(67, 217, 173, 0.4),
        0 0 0px 6px rgba(67, 217, 173, 0.2);
      animation: medium-smooth-glow 3s ease-in-out infinite;
      
      &.eaten {
        opacity: 0.25;
        animation: none;
      }
    }
  }

  &.crazy-mode {
    height: 95px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 5px;
    top: 48%;

    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: $accent2;
      border-radius: 2px;
    }

    & > span {
      width: 4px;
      height: 4px;
      margin: 1px;
      box-shadow:
        0 0 1px 1px rgba(67, 217, 173, 0.4);
      animation: crazy-smooth-glow 3s ease-in-out infinite;
      
      &.eaten {
        opacity: 0.15;
        animation: none;
      }
    }
  }
}

html[lang="es-ES"] {
  .food-left {
    top: 55%;
  }
}

.snake {
  width: 100%;
  height: 100%;
  background: $accent2;
}

.food {
  width: 100%;
  height: 100%;
  background-color: $accent2;
  border-radius: 50%;
  animation: smooth-glow 3s ease-in-out infinite;
  box-shadow:
    0 0 0px 0px rgba(67, 217, 173, 0.3),
    0 0 0px 0px rgba(67, 217, 173, 0.2);
}
</style>