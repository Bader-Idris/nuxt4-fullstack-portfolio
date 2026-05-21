<template>
  <div class="projects-sidebar" :class="{ hidden: isSidebarHidden }">
    <div v-for="item in list" :key="item.title">
      <label
        tabindex="0"
        role="checkbox"
        :aria-labelledby="`label-${item.title}`"
        :aria-checked="item.isActive"
        @click.prevent="toggleActiveItem(item)"
      >
        <span class="checkbox-icon" aria-hidden="true">
          <Icon
            v-if="item.isActive"
            name="fluent:checkbox-checked-24-filled"
            width="35"
          />
          <Icon v-else name="bxs:checkbox" width="35" />
        </span>
        <Icon
          :name="getIconName(item.title)"
          width="2em"
          height="2em"
          style="color: #607b96"
          :alt="item.imgAlt"
          class="project-svg"
        />
        <p
          :id="`label-${item.title}`"
          class="project-item"
          :class="{ active: item.isActive }"
        >
          {{ item.title }}
        </p>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  list: {
    type: Array as any,
    required: true,
    deafault: () => [],
  },
  isSidebarHidden: Boolean,
});

const emit = defineEmits(["toggle-active"]);

// @ts-expect-error: item has an implicit any type
const toggleActiveItem = (item) => {
  emit("toggle-active", item);
};

const getIconName = (title: string): string => {
  const iconMap: Record<string, string> = {
    HTML: "ri:html5-fill",
    CSS: "flowbite:css-solid",
    Javascript: "teenyicons:javascript-solid",
    Vue: "mdi:vuejs",
    Typescript: "akar-icons:typescript-fill",
    Android: "basil:android-solid",
    IOS: "ic:baseline-apple",
    Docker: "mdi:docker",
    Sass: "fa6-brands:sass",
    Nginx: "simple-icons:nginx",
    Nuxt: "lineicons:nuxt",
    Electron: "file-icons:electron",
    Bash: "devicon-plain:bash",
    NestJs: "file-icons:nestjs",
    ThreeJs: "tabler:brand-threejs",
    CapacitorJs: "devicon-plain:capacitor",
  };

  return iconMap[title] || "mdi:code-tags"; // Default icon if title not found
};
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
      @include flex-container(row, nowrap, flex-start, center);
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