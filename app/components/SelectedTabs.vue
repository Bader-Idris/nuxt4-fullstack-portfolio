<template>
  <div class="selected-projects">
    <ul>
      <li v-for="(item, index) in activeItems" :key="index">
        {{ item }}
        <Icon
          name="hugeicons:cancel-02"
          width="20"
          class="remove"
          @click="removeItem(item)"
        />
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
});

const emit = defineEmits(["removeItem"]);

// @ts-expect-error: item has an implicit any type
const removeItem = (item) => {
  emit("removeItem", item);
};
</script>

<style lang="scss">
.selected-projects {
  display: block;
  width: 100%;
  user-select: none;
  // border-bottom: 1px solid $lines; // Remove parent border-bottom as children will have it
  // background-color: $primary3;

  @include mobile {
    display: none;
  }

  ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin; // standard for PCs

    > li {
      @include flex-container(row, nowrap, unset, center);
      padding: 0 15px;
      height: 35px;
      position: relative;
      border: solid 1px $lines;
      border-top-style: none; // Crucial: "hang" from the top line
      color: $secondary4;
      font-size: 13px;
      background-color: $primary2; // Match main content background

      > .remove {
        margin-left: 20px;
        cursor: pointer;
        font-size: 14px;
        color: $secondary1;
        &:hover {
          color: $secondary4;
        }
      }
    }
  }
}
</style>