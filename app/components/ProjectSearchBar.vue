<template>
  <div class="project-search-bar" :class="{ 'rtl-mode': isRtl }">
    <div class="search-input-wrapper">
      <Icon name="mdi:magnify" class="search-icon" />
      <input
        v-model="query"
        type="text"
        :placeholder="t('projects.search_placeholder', 'Search projects, tech, or keywords...')"
        class="search-input"
        @input="onInput"
      />
      <button v-if="query" class="clear-btn" @click="clearSearch">
        <Icon name="mdi:close-circle" />
      </button>
    </div>
    
    <div v-if="query && suggestions.length > 0" class="search-suggestions">
      <div 
        v-for="suggestion in suggestions" 
        :key="suggestion.title.en"
        class="suggestion-item"
        @click="selectSuggestion(suggestion)"
      >
        <Icon name="mdi:arrow-right-bottom" class="suggestion-icon" />
        <span class="suggestion-text">{{ suggestion.title[locale] || suggestion.title.en }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { projectsList, type Project } from "~/apis/projects_data";

const { t, locale } = useI18n();
const isRtl = computed(() => locale.value === "ar");

const query = ref("");
const suggestions = ref<Project[]>([]);

const router = useRouter();
const route = useRoute();

const emit = defineEmits(["search"]);

const onInput = () => {
  emit("search", query.value);
  
  // Suggest based on the last part after the last comma
  const parts = query.value.split(',');
  const lastPart = parts[parts.length - 1].trim().replace(/^#/, "").toLowerCase();

  if (lastPart.length > 1) {
    suggestions.value = projectsList.filter(p => {
      const title = (p.title[locale.value as keyof typeof p.title] || p.title.en).toLowerCase();
      return title.includes(lastPart);
    }).slice(0, 5);
  } else {
    suggestions.value = [];
  }
};

const selectSuggestion = (project: Project) => {
  const title = project.title[locale.value as keyof typeof project.title] || project.title.en;
  const prefixedTitle = `#${title}`;
  
  const parts = query.value.split(',').map(s => s.trim());
  // Replace the last (incomplete) part with the selected suggestion
  parts[parts.length - 1] = prefixedTitle;
  
  // Remove duplicates
  const uniqueParts = [...new Set(parts)];
  query.value = uniqueParts.join(", ");
  
  suggestions.value = [];
  emit("search", query.value);
};

const clearSearch = () => {
  query.value = "";
  suggestions.value = [];
  emit("search", "");
};

onMounted(() => {
  if (route.query.q) {
    query.value = route.query.q as string;
    emit("search", query.value);
  }
});
</script>

<style lang="scss" scoped>
.project-search-bar {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 30px auto;
  z-index: 10;

  &.rtl-mode {
    direction: rtl;
  }
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background-color: $primary3;
  border: 1px solid $lines;
  border-radius: 12px;
  padding: 0 15px;
  transition: all 0.3s ease;

  &:focus-within {
    border-color: $accent2;
    box-shadow: 0 0 15px rgba($accent2, 0.15);
  }

  .search-icon {
    font-size: 20px;
    color: $secondary1;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    padding: 12px 10px;
    color: $secondary4;
    font-family: $main-font;
    font-size: 14px;

    &::placeholder {
      color: $secondary1;
    }
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: $secondary1;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 5px;
    transition: color 0.2s;

    &:hover {
      color: $accent1;
    }
  }
}

.search-suggestions {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  background-color: $primary3;
  border: 1px solid $lines;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: $secondary1;
  font-size: 13px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: $accent2;
  }

  .suggestion-icon {
    font-size: 14px;
    opacity: 0.5;
  }
}
</style>
