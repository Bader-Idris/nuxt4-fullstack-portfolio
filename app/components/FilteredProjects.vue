<template>
  <div>
    <div
      v-if="filteredProjects.length === 0"
      class="empty-message"
    >
      <p>
        {{ $t('projects.caution') }}
      </p>
    </div>
    <div
      v-else
      class="filtered-projects"
    >
      <div
        v-for="project in filteredProjects"
        :key="project.title"
        class="project-card"
      >
        <h3 class="card-title">
          // {{ project.title }}
        </h3>
        <div class="card-content">
          <!-- test this -->
          <CustomLink 
            aria-label="go to ${{ project.title }}"
            class="link external-link"
            :to="project.url"
          >
            <img
              :src="project.img"
              :alt="project.title"
            >
          </CustomLink>
          <p>{{ project.desc }}</p>

          <CustomButton
            button-type="default"
            class="project-link"
          >
            <CustomLink :to="project.url">
            <!-- <CustomLink :to="localePath(`/projects/${slugify(project.title)}`)"> -->
              View Project
            </CustomLink>
          </CustomButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import projects from '~/apis/projects_info.json'

const localePath = useLocalePath()
const props = defineProps({
  activeItems: {
    type: Array,
    required: true,
  },
})

const filteredProjects = computed(() => {
  // @ts-ignore
  const activeItemsLower = props.activeItems.map(item => item.toLowerCase())
  return projects.filter(project =>
    project.tags.some(tag => activeItemsLower.includes(tag.toLowerCase())),
  )
})

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

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
  left: 350px;
  position: absolute;
  top: 100px;
  overflow: hidden;
  padding-bottom: 100px;
  @include flex-container(unset, wrap, unset, unset);

  @include mobile {
    width: calc($full-viewport-width - 30px);
    flex-direction: column;
    left: 0;
    top: 0;
    position: relative;
  }

  @include tablet {
    width: calc($full-viewport-width - 460px);
    @include flex-container(row, wrap, space-evenly, stretch);
    align-content: center;
  }

  @media (min-width: 1024px) and (max-width: 1200px) {
    width: calc($full-viewport-width - 430px);
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
          content: 'broken image';
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
