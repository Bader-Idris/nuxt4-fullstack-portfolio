<template>
  <div class="food-left">
    <span
      v-for="(span, index) in foodLeft"
      :key="index"
      :class="{ eaten: span.eaten }"
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

    &.eaten {
      opacity: 0.3;
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
  box-shadow:
    0 0 0px 5px rgba(67, 217, 173, 0.4),
    0 0 0px 10px rgba(67, 217, 173, 0.2);
}
</style>
