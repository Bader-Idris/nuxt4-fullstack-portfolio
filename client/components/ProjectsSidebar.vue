<template>
  <div
    class="projects-sidebar"
    :class="{ hidden: isSidebarHidden }"
  >
    <div
      v-for="item in list"
      :key="item.title"
    >
      <label 
        @click.prevent="toggleActiveItem(item)" 
        tabindex="0" 
        role="checkbox" 
        :aria-checked="item.isActive" 
        :aria-labelledby="`label-${item.title}`"
      >
        <span class="checkbox-icon" aria-hidden="true">
          <Icon 
            v-if="item.isActive"
            name="fluent:checkbox-checked-24-filled"
            width="35"
          />
          <Icon 
            v-else
            name="bxs:checkbox"
            width="35"
          />
        </span>
        <component
          :is="componentMap[item.title]"
          :alt="item.imgAlt"
          :class="item.title"
          class="project-svg"
        />
        <p
          class="project-item"
          :class="{ active: item.isActive }"
          :id="`label-${item.title}`"
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

      .checkbox-icon {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        margin-right: 10px;
        span {
          width: 25px;
          height: 25px;
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

.project-svg {
  width: 25px;
  height: 25px;
  margin-top: 10px;
}

</style>
