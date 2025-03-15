<template>
  <div class="food-left" role="list" aria-label="Food items">
    <span
      v-for="(span, index) in foodLeft"
      :key="index"
      :class="{ eaten: span.eaten }"
      role="listitem"
      :aria-label="span.eaten ? 'Eaten food item' : 'Uneaten food item'"
      tabindex="0"
      :style="{ animationDelay: `${index * 0.4}s` }"
    />
  </div>
</template>

<script setup lang="ts">
interface FoodItem {
  eaten: boolean
}

defineProps<{
  foodLeft: FoodItem[]
}>()
</script>

<style lang="scss">
@keyframes glow {
  0% {
    box-shadow:
      0 0 0px 5px rgba(67, 217, 173, 0.4),
      0 0 0px 10px rgba(67, 217, 173, 0.2);
  }
  25% {
    box-shadow:
      0 0 5px 2px rgba(67, 217, 173, 0.5),
      0 0 10px 5px rgba(67, 217, 173, 0.3);
  }
  50% {
    box-shadow:
      0 0 10px 5px rgba(67, 217, 173, 0.6),
      0 0 20px 10px rgba(67, 217, 173, 0.4);
  }
  75% {
    box-shadow:
      0 0 5px 2px rgba(67, 217, 173, 0.5),
      0 0 10px 5px rgba(67, 217, 173, 0.3);
  }
  100% {
    box-shadow:
      0 0 0px 5px rgba(67, 217, 173, 0.4),
      0 0 0px 10px rgba(67, 217, 173, 0.2);
  }
}

.food-left {
  width: 100%;
  height: 80px;
  position: absolute;
  top: 50%;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-content: space-around;
  align-items: stretch;
  justify-content: space-around;

  & > span {
    width: 8px;
    height: 8px;
    background-color: $accent2;
    border-radius: 50%;
    box-shadow:
      0 0 0px 5px rgba(67, 217, 173, 0.4),
      0 0 0px 10px rgba(67, 217, 173, 0.2);
    margin: 15px;
    transition: transform 0.3s ease-in-out;
    animation: glow 2s ease-in-out infinite ;

    &.eaten {
      opacity: 0.3;
      animation: none; // Disable animation for eaten items
    }
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
  animation: glow 2s ease-in-out infinite ;
  box-shadow:
    0 0 0px 5px rgba(67, 217, 173, 0.4),
    0 0 0px 10px rgba(67, 217, 173, 0.2);
}
</style>