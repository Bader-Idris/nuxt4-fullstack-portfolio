<template>
  <div v-if="project" class="project-detail" :class="{ 'rtl-mode': isRtl }">
    <!-- Workspace Tabs -->
    <div class="workspace-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <Icon :name="tab.icon" width="16" height="16" />
        <span>{{ t(tab.labelKey, tab.label) }}</span>
      </div>
    </div>

    <!-- Active Tab Content -->
    <div class="tab-viewport">
      <!-- 🎮 Live Preview -->
      <div v-if="activeTab === 'preview'" class="preview-panel">
        <div class="preview-header">
          <div class="window-controls">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="url-bar">{{ "localhost:3000/" + project.slug }}</div>
        </div>
        <div class="preview-body">
          <iframe
            v-if="iframeSrc"
            :srcdoc="iframeSrc"
            class="sandbox-iframe"
            frameborder="0"
            sandbox="allow-scripts"
          ></iframe>
        </div>
        <div class="sandbox-footer">
          <p>
            {{
              t(
                "sandbox_hint",
                "Interactive simulation active. Note: JavaScript logic is simulated for demo purposes.",
              )
            }}
          </p>
        </div>
      </div>

      <!-- 📝 Code Viewer -->
      <div v-else-if="activeTab === 'code'" class="code-panel">
        <div class="code-explorer">
          <div
            v-for="file in codeFiles"
            :key="file.name"
            class="code-file-tab"
            :class="{ active: activeCodeFile === file.name }"
            @click="activeCodeFile = file.name"
          >
            <Icon
              :name="file.icon"
              width="14"
              height="14"
              :style="{ color: file.color }"
            />
            <span>{{ file.name }}</span>
          </div>
        </div>
        <div class="code-content">
          <pre><code>{{ currentCodeContent }}</code></pre>
        </div>
      </div>

      <!-- ℹ️ Details Tab -->
      <div v-else-if="activeTab === 'details'" class="details-panel">
        <div class="details-card">
          <div class="project-header">
            <Icon
              :name="project.icon"
              width="48"
              height="48"
              class="project-icon"
            />
            <div class="title-wrap">
              <h2>{{ project.title[locale] || project.title.en }}</h2>
              <div class="tags">
                <span v-for="tag in project.tags" :key="tag" class="tag">{{
                  tag
                }}</span>
              </div>
            </div>
          </div>

          <div class="description">
            <h3>{{ t("details_title", "Challenge Description") }}</h3>
            <p>{{ project.desc[locale] || project.desc.en }}</p>
          </div>

          <div class="tech-stack">
            <h3>{{ t("tech_stack", "Technologies Used") }}</h3>
            <ul>
              <li v-for="tag in project.tags" :key="tag">
                <Icon
                  name="mdi:check-circle"
                  width="16"
                  height="16"
                  class="check-icon"
                />
                {{ tag }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="not-found">
    <Icon name="mdi:alert-circle-outline" width="64" height="64" />
    <p>{{ t("project_not_found", "Project not found in the explorer.") }}</p>
    <NuxtLink
      :to="localePath('/projects/elzero-50-projects')"
      class="back-link"
    >
      {{ t("back_to_dashboard", "Back to Dashboard") }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { elzeroProjectsList } from "~/apis/elzero_projects_data";

const route = useRoute();
const { t, locale } = useI18n();
const localePath = useLocalePath();

const isRtl = computed(() => locale.value === "ar");

// AI & SEO: Throw a proper 404 error if the project is not found.
watchEffect(() => {
  if (!project.value) {
    showError({
      statusCode: 404,
      statusMessage: t("project_not_found", "Project not found in the explorer."),
      fatal: true,
    });
  }
});

const project = computed(() => {
  const slug = route.params.id as string;
  return elzeroProjectsList.find((p) => p.slug === slug);
});

// Tab Management
const activeTab = ref("preview");
const tabs = [
  {
    id: "preview",
    label: "Preview",
    labelKey: "tabs.preview",
    icon: "mdi:eye-outline",
  },
  { id: "code", label: "Code", labelKey: "tabs.code", icon: "mdi:code-tags" },
  {
    id: "details",
    label: "Details",
    labelKey: "tabs.details",
    icon: "mdi:information-outline",
  },
];

// Code Viewer Management
const activeCodeFile = ref("index.html");
const codeFiles = computed(() => [
  { name: "index.html", icon: "vscode-icons:file-type-html", color: "#e34f26" },
  { name: "style.css", icon: "vscode-icons:file-type-css", color: "#1572b6" },
  {
    name: "script.js",
    icon: "vscode-icons:file-type-js-official",
    color: "#f7df1e",
  },
]);

const currentCodeContent = computed(() => {
  if (!project.value) return "";
  if (activeCodeFile.value === "index.html") return project.value.code.html;
  if (activeCodeFile.value === "style.css") return project.value.code.css;
  if (activeCodeFile.value === "script.js") return project.value.code.js;
  return "";
});

const iframeSrc = computed(() => {
  if (!project.value) return "";
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="UTF-8">',
    "<style>",
    project.value.code.css,
    "</style>",
    "</head>",
    "<body>",
    project.value.code.html,
    "<script>",
    "(function() {",
    "  try {",
    project.value.code.js,
    "  } catch (err) {",
    "    console.error('Sandbox Error:', err);",
    "  }",
    "})();",
    "<" + "/script>",
    "</body>",
    "</html>",
  ].join("\n");
});

// SEO
useSeoMeta({
  title: () =>
    project.value
      ? (project.value.title[locale.value] || project.value.title.en) +
        " | Elzero 50"
      : "Project Not Found",
  description: () =>
    project.value
      ? project.value.desc[locale.value] || project.value.desc.en
      : "",
});

if (import.meta.server) {
  useSchemaOrg([
    defineWebPage({
      name: project.value ? (project.value.title[locale.value] || project.value.title.en) + " | Elzero 50" : "Project Not Found",
      description: project.value ? (project.value.desc[locale.value] || project.value.desc.en) : "",
    })
  ]);
}

// Simulate JS if on preview tab
watch(
  [activeTab, project],
  () => {
    if (activeTab.value === "preview" && project.value) {
      // Iframe handles execution via srcdoc
      console.log(`Previewing ${project.value.slug}`);
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: $primary2;

  &.rtl-mode {
    direction: rtl;
  }
}

.workspace-tabs {
  display: flex;
  background-color: $primary3;
  border-bottom: 1px solid $lines;
  height: 35px;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 100%;
  font-size: 12px;
  color: $secondary1;
  cursor: pointer;
  border-right: 1px solid $lines;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;

  .rtl-mode & {
    border-right: none;
    border-left: 1px solid $lines;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.03);
    color: $secondary4;
  }

  &.active {
    background-color: $primary2;
    color: $accent2;
    border-bottom: 2px solid $accent2;
  }
}

.tab-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Preview Panel Styles */
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background-color: $primary1;

  @include mobile {
    padding: 10px;
  }
}

.preview-header {
  background-color: $primary3;
  border: 1px solid $lines;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  padding: 8px 15px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.window-controls {
  display: flex;
  gap: 6px;
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    &.red {
      background-color: #ff5f56;
    }
    &.yellow {
      background-color: #ffbd2e;
    }
    &.green {
      background-color: #27c93f;
    }
  }
}

.url-bar {
  flex: 1;
  background-color: $primary2;
  border: 1px solid $lines;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 11px;
  color: $secondary3;
  text-align: center;
}

.preview-body {
  flex: 1;
  background-color: #fff; // Classic browser background for preview
  border: 1px solid $lines;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  position: relative;
}

.sandbox-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.sandbox-container {
  height: 100%;
  width: 100%;
  color: #333; // Default web text color for preview
  padding: 0;
}

.sandbox-footer {
  padding-top: 10px;
  font-size: 11px;
  color: $secondary3;
  text-align: center;
}

/* Code Panel Styles */
.code-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.code-explorer {
  display: flex;
  background-color: $primary3;
  border-bottom: 1px solid $lines;
}

.code-file-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 15px;
  font-size: 12px;
  color: $secondary1;
  cursor: pointer;
  border-right: 1px solid $lines;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &.active {
    background-color: $primary2;
    color: $secondary4;
  }
}

.code-content {
  flex: 1;
  overflow: auto;
  background-color: #1e1e1e; // VSCode Dark background
  padding: 20px;

  pre {
    margin: 0;
    font-family: "Fira Code", "Courier New", monospace;
    font-size: 14px;
    color: #d4d4d4;
    line-height: 1.5;
    white-space: pre-wrap;
  }
}

/* Details Panel Styles */
.details-panel {
  height: 100%;
  overflow-y: auto;
  padding: 40px;

  @include mobile {
    padding: 20px;
  }
}

.details-card {
  max-width: 800px;
  margin: 0 auto;
  background-color: $primary3;
  border: 1px solid $lines;
  border-radius: 12px;
  padding: 40px;

  @include mobile {
    padding: 20px;
  }
}

.project-header {
  display: flex;
  align-items: center;
  gap: 25px;
  margin-bottom: 40px;

  .project-icon {
    color: $accent2;
  }

  h2 {
    font-size: 2rem;
    color: $secondary4;
    margin-bottom: 10px;
  }

  .tags {
    display: flex;
    gap: 10px;
    .tag {
      font-size: 12px;
      padding: 4px 10px;
      background: rgba($accent2, 0.1);
      color: $accent2;
      border-radius: 4px;
      border: 1px solid rgba($accent2, 0.2);
    }
  }
}

.description,
.tech-stack {
  margin-bottom: 30px;

  h3 {
    font-size: 1.2rem;
    color: $secondary4;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 10px;

    &::after {
      content: "";
      flex: 1;
      height: 1px;
      background-color: $lines;
    }
  }

  p {
    color: $secondary1;
    line-height: 1.7;
    font-size: 1rem;
  }

  ul {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;

    li {
      display: flex;
      align-items: center;
      gap: 10px;
      color: $secondary1;
      font-size: 0.9rem;

      .check-icon {
        color: $accent2;
      }
    }
  }
}

.not-found {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  color: $secondary1;

  .back-link {
    color: $accent2;
    text-decoration: underline;
  }
}
</style>