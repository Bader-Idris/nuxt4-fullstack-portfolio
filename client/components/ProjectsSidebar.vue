<template>
  <div
    class="projects-sidebar"
    :class="{ hidden: isSidebarHidden }"
  >
    <div
      v-for="item in list"
      :key="item.title"
    >
      <label @click.prevent="toggleActiveItem(item)">
        <input
          v-model="item.isActive"
          type="checkbox"
          @click.stop
        >
        <component
          :is="componentMap[item.title]"
          :alt="item.imgAlt"
          :class="item.title"
          class="project-svg"
          @click.stop
        />
        <p
          class="project-item"
          :class="{ active: item.isActive }"
          @click.stop
        >
          {{ item.title }}
        </p>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import HTML from './svg/SvgHtml.vue'
import CSS from './svg/SvgCss.vue'
import SvgVuejs from './svg/SvgVuejs.vue'
// import SvgDocker from './svg/SvgDocker.vue';
import Typescript from './svg/TypeScript.vue'
// import Expressjs from './svg/Expressjs.vue';
// import SvgShell from './svg/SvgShell.vue';

defineProps({
  list: {
    type: Array as any,
    required: true,
    deafault: () => [],
  },
  isSidebarHidden: Boolean,
})

const emit = defineEmits(['toggle-active'])
// @ts-ignore
const toggleActiveItem = (item) => {
  emit('toggle-active', item)
}
const componentMap = {
  HTML,
  CSS,
  Vue: SvgVuejs,
  // Docker: SvgDocker
  Typescript,
  // Express: Expressjs,
  // shell scripting: SvgShell
}
</script>

<style lang="scss">
.projects-sidebar {
  width: 301px;
  transition:
    opacity 0.5s ease,
    visibility 0.5s ease;
  opacity: 1;

  &.hidden {
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.5s ease,
      visibility 0.5s ease;
  }

  > div {
    label {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      -webkit-user-drag: none;
      cursor: pointer;
      margin: 20px;

      > * {
        margin: 0 10px;
      }

      .project-item {
        user-select: none;
        font-size: $labels-size;

        &.active {
          color: $secondary4;
        }
      }

      input[type='checkbox'] {
        appearance: none;
        width: 20px;
        height: 20px;
        border: 2px solid $secondary1;
        border-radius: 3px;
        cursor: pointer;
        outline: none;
        position: relative;

        &:checked {
          background-color: $secondary1;

          &::before {
            content: '\2713';
            /* Unicode for check mark */
            color: white;
            font-size: 16px;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
        }
      }

      &:hover {
        opacity: 0.7;
      }

      &:last-of-type {
        margin-bottom: 0;
        padding-bottom: 20px;
      }
    }
  }
}

.project-item {
  margin-right: 20px;
  margin-bottom: 20px;
}

.project-svg {
  width: 25px;
  height: 25px;
  margin-top: 10px;
}
</style>
