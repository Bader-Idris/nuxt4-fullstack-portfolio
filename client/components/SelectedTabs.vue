<template>
  <div class="selected-projects">
    <ul>
      <li
        v-for="(item, index) in activeItems"
        :key="index"
      >
        {{ item }}
        <span
          class="remove"
          @click="removeItem(item)"
        >X</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps({
  activeItems: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['removeItem'])

// @ts-ignore
const removeItem = (item) => {
  emit('removeItem', item)
}
</script>

<style lang="scss">
.selected-projects {
  display: inline-block;
  left: 300px;
  top: 0;
  position: absolute;
  user-select: none;

  @media (max-width: 768px) {
    display: none;
  }

  ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: hidden;

    > li {
      display: flex;
      align-items: center;
      padding: 10px 15px;
      position: relative;
      border: solid 1px $lines;
      border-top-style: none;

      > .remove {
        font-family: cursive, serif;
        text-align: center;
        line-height: 1.35;
        width: 20px;
        height: 20px;
        margin-left: 20px;
        cursor: pointer;
      }
    }
  }
}
</style>
