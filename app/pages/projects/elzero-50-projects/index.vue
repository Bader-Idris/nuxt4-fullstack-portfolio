<template>
  <div class="intro-dashboard" :class="{ 'rtl-mode': isRtl }">
    <div class="hero-section">
      <div class="glass-card">
        <h1 class="title">
          {{ t("elzero_dashboard.title", "Elzero 50 Projects") }}
        </h1>
        <p class="subtitle">
          {{
            t(
              "elzero_dashboard.subtitle",
              "A comprehensive collection of 50 frontend challenges, built with modern web standards and interactive features.",
            )
          }}
        </p>

        <div class="stats-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-item">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ t(stat.labelKey, stat.label) }}</div>
          </div>
        </div>

        <div class="cta-section">
          <p class="cta-text">
            {{
              t(
                "elzero_dashboard.cta",
                "Select a project from the explorer to begin exploring the interactive playground.",
              )
            }}
          </p>
          <div class="arrow-indicator">
            <Icon
              :name="isRtl ? 'mdi:arrow-right' : 'mdi:arrow-left'"
              width="24"
              height="24"
              class="bounce-arrow"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Featured Projects Preview -->
    <div class="featured-section">
      <h2 class="section-title">
        {{ t("elzero_dashboard.featured", "Featured Core Challenges") }}
      </h2>
      <div class="featured-grid">
        <NuxtLink
          v-for="project in featuredProjects"
          :key="project.slug"
          :to="localePath('/projects/elzero-50-projects/' + project.slug)"
          class="featured-card"
        >
          <div class="card-icon">
            <Icon :name="project.icon" width="32" height="32" />
          </div>
          <h3>{{ project.title[locale] || project.title.en }}</h3>
          <div class="tags">
            <span v-for="tag in project.tags" :key="tag" class="tag">{{
              tag
            }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { elzeroProjectsList } from "~/apis/elzero_projects_data";

const { t, locale } = useI18n();
const localePath = useLocalePath();
const isRtl = computed(() => locale.value === "ar");

const stats = [
  {
    value: "50",
    label: "Challenges",
    labelKey: "elzero_dashboard.stats.challenges",
  },
  {
    value: "3",
    label: "Languages",
    labelKey: "elzero_dashboard.stats.languages",
  },
  {
    value: "100%",
    label: "Interactive",
    labelKey: "elzero_dashboard.stats.interactive",
  },
];

const featuredProjects = computed(() => elzeroProjectsList.slice(0, 4));
</script>

<style lang="scss" scoped>
.intro-dashboard {
  height: 100%;
  overflow-y: auto;
  padding: 40px;
  background:
    radial-gradient(circle at top right, rgba($accent2, 0.05), transparent),
    radial-gradient(circle at bottom left, rgba($accent1, 0.05), transparent);

  &.rtl-mode {
    direction: rtl;
  }

  @include mobile {
    padding: 20px;
  }
}

.hero-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50dvh;
  margin-bottom: 40px;
}

.glass-card {
  background: rgba($primary3, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid $lines;
  border-radius: 16px;
  padding: 40px;
  max-width: 800px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);

  @include mobile {
    padding: 25px;
  }
}

.title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 15px;
  background: linear-gradient(135deg, $secondary4 0%, $accent2 100%);
  background-clip: text;
  text-fill-color: transparent;

  @include mobile {

    font-size: 2rem;
  }
}

.subtitle {
  font-size: 1.1rem;
  color: $secondary1;
  line-height: 1.6;
  margin-bottom: 35px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.stat-item {
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: $accent2;
  }
  .stat-label {
    font-size: 0.85rem;
    color: $secondary3;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 5px;
  }
}

.cta-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.cta-text {
  color: $secondary3;
  font-style: italic;
  font-size: 0.95rem;
}

.arrow-indicator {
  .bounce-arrow {
    color: $accent2;
    animation: bounce 2s infinite;
  }
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateX(0);
  }
  40% {
    transform: translateX(-10px);
  }
  60% {
    transform: translateX(-5px);
  }
}

.rtl-mode .bounce-arrow {
  animation: bounceRtl 2s infinite;
}

@keyframes bounceRtl {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateX(0);
  }
  40% {
    transform: translateX(10px);
  }
  60% {
    transform: translateX(5px);
  }
}

.section-title {
  font-size: 1.5rem;
  color: $secondary4;
  margin-bottom: 25px;
  padding-bottom: 10px;
  border-bottom: 1px solid $lines;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.featured-card {
  background: $primary3;
  border: 1px solid $lines;
  border-radius: 12px;
  padding: 20px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;

  &:hover {
    transform: translateY(-5px);
    border-color: $accent2;
    background: rgba($accent2, 0.05);

    .card-icon {
      color: $accent2;
      transform: scale(1.1);
    }
  }

  .card-icon {
    color: $secondary1;
    transition: all 0.3s ease;
  }

  h3 {
    font-size: 1rem;
    color: $secondary4;
    font-weight: 600;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    justify-content: center;

    .tag {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.3);
      color: $secondary3;
      border-radius: 4px;
    }
  }
}
</style>