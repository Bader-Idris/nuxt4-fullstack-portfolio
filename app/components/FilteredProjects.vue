<template>
  <div>
    <div v-if="filteredProjects.length === 0" class="empty-message">
      <p>
        {{ $t("projects.caution") }}
      </p>
    </div>
    <div v-else class="filtered-projects">
      <TransitionGroup name="list">
        <div
          v-for="project in filteredProjects"
          :key="project.title.en"
          class="project-card"
        >
          <h3 class="card-title">// {{ project.title[locale] || project.title.en }}</h3>
          <div class="card-content">
            <!-- test this -->
            <CustomLink
              :aria-label="'go to ' + (project.title[locale] || project.title.en)"
              class="link external-link"
              :to="project.url"
            >
              <img :src="getProjectImage(project)" :alt="project.title[locale] || project.title.en" />
            </CustomLink>
            <p>{{ project.desc[locale] || project.desc.en }}</p>

            <CustomButton button-type="default" class="project-link">
              <CustomLink :to="project.url">
                <!-- <CustomLink :to="localePath(`/projects/${slugify(project.title.en)}`)"> -->
                View Project
              </CustomLink>
            </CustomButton>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { projectsList } from "~/apis/projects_data";

const { locale } = useI18n();
const localePath = useLocalePath();

const getProjectImage = (project: any) => {
  const img = project.img;

  if (img === "OG_IMAGE") {
    // Return the dynamic OG image endpoint for the localized route
    return `${localePath(project.url)}/__og-image__/image.png`;
  }

  if (typeof img === "object") {
    return img[locale.value] || img.en;
  }

  return img;
};

const props = defineProps({
  activeItems: {
    type: Array,
    required: true,
  },
  searchQuery: {
    type: String,
    default: "",
  },
});

const filteredProjects = computed(() => {
  const q = props.searchQuery.toLowerCase().trim();
  // @ts-expect-error: props.activeItems is not properly typed
  const activeItemsLower = props.activeItems.map((item) => item.toLowerCase());

  return projectsList.filter((project) => {
    // 1. Tag Match (Must match at least one selected tag if tags are active)
    const matchesTags = project.tags.some((tag) =>
      activeItemsLower.includes(tag.toLowerCase()),
    );
    if (!matchesTags) return false;

    // 2. Search Query Match (Guessing Approach)
    if (!q) return true;

    // Search across ALL localized fields to "guess" intent
    const searchableFields = [
      project.title.en,
      project.title.ar,
      project.title.es,
      project.desc.en,
      project.desc.ar,
      project.desc.es,
      ...project.tags,
    ];

    return searchableFields.some((field) => field.toLowerCase().includes(q));
  });
});

// const slugify = (text) => {
//   return text
//     .toString()
//     .toLowerCase()
//     .replace(/\s+/g, '-')
//     .replace(/[^\w-]+/g, '')
//     .replace(/--+/g, '-')
//     .replace(/^-+/, '')
//     .replace(/-+$/, '');
// }

onMounted(() => {
  if (import.meta.client) {
    useGSAP().from(".project-card", {
      y: 50,
      opacity: 0,
      delay: 0.3,
      duration: 0.5,
      scale: 0.9,
      ease: "back.out(1.7)",
      stagger: 0.3,
    });
  }
});
</script>

<style lang="scss">
.empty-message {
  color: $accent1;
  border-radius: 25px;
  background: #181818;

  @include mobile {
    box-shadow: 0 0 20px 7px #ffffff12;
    width: calc(100% - 20px);
    margin: auto;
    text-align: center;
    line-height: 1.5;
    font-size: 26px;
    padding: 10px;
  }

  p {
    @include tablet-to-up {
      // left: 300px;
      position: absolute;
      width: calc(100% - 300px);
      max-width: 1000px;
      font-size: 36px;
      margin: 0 50px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
}

.filtered-projects {
  gap: 20px;
  overflow: hidden;
  padding-bottom: 100px;
  @include flex-container(unset, wrap, unset, stretch);

  @include mobile {
    width: 100%;
    flex-direction: column;
    position: relative;
  }

  @include tablet {
    width: 100%;
    @include flex-container(row, wrap, space-evenly, stretch);
    align-content: center;
  }

  @media (min-width: 1200px) {
    .project-card {
      flex-basis: calc(50% - 10px);
    }
  }

  @media (min-width: 1430px) {
    .project-card {
      flex-basis: calc(33% - 10px);
    }
  }

  .project-card {
    padding: 20px;
    border-radius: 8px;
    width: 100%;
    perspective: 1000px;

    .card-title {
      font-size: $body-text-size;
      transition: all 0.5s ease-in-out;
      transform: translate3d(0, 0, 0);
    }

    .card-content {
      background-color: $code-snippets-bg;
      border-radius: 25px;
      border: 1px solid $lines;
      transform-style: preserve-3d;
      transition: all 0.5s ease-in-out;
      overflow: hidden;

      p {
        text-align: left;
        padding: 20px 20px 0 20px;
        margin-bottom: 40px;
        transition: all 0.5s ease-in-out;
        transform: translate3d(0, 0, 20px) scale(1);
      }

      img {
        // put a better broken images message
        max-width: 100%;
        height: auto;
        display: block;
        margin-bottom: 10px;
        border-radius: 10px 10px 0 0;
        min-width: 200px;
        min-height: 200px;
        background: $primary3;
        position: relative;
        transition: all 0.5s ease-in-out;
        transform: translate3d(0, 0, 40px);

        &::before {
          content: "broken image";
          background-color: $secondary2;
          width: 100%;
          height: 100%;
          position: absolute;
          font-size: 32px;
          color: $secondary4;
          font-weight: bold;
          text-transform: uppercase;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          line-height: 6;
        }
      }

      .project-link {
        bottom: 0;
        left: 20px;
        position: relative;
        margin: 20px 0;
        transition: all 0.5s ease-in-out;
        transform: translate3d(0, 0, 10px);
      }

      &:hover {
        transform: rotate3d(0.5, 1, 0, 30deg);

        img {
          transform: translate3d(0px, 0px, 60px) scale(1.1);
        }
        p {
          transform: translate3d(0px, 0px, 10px) scale(0.9);
        }
        .project-link {
          transform: translate3d(0px, 0px, 40px);
        }
      }
    }

    &:hover {
      .card-title {
        transform: translate3d(0px, 0px, 50px);
      }
    }
  }
}
</style>