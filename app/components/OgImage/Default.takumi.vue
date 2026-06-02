<script setup lang="ts">
const { title, description } = defineProps<{
  title?: string
  description?: string
}>();

// ai is ugly at making simple things complicated, OMG!
// check how simple it is: https://nuxtseo.com/docs/og-image/getting-started/installation#next-steps
const siteConfig = useSiteConfig();

const displayTitle = computed(() => title || siteConfig.name || "Bader Idris");
const displayDescription = computed(
  () => description || siteConfig.description || "Full-stack developer & creative technologist."
);

// Truncate description defensively so it never overflows the card
const truncatedDescription = computed(() => {
  const d = displayDescription.value;
  return d.length > 120 ? d.slice(0, 117) + "…" : d;
});
</script>

<template>
  <div class="root">
    <div class="bg-base" />
    <div class="bg-glow bg-glow--teal" />
    <div class="bg-glow bg-glow--indigo" />
    <div class="bg-dots" />
    <div class="accent-bar" />

    <div class="layout">
      <div class="top-row">
        <div class="brand">
          <span class="brand-bracket">&lt;</span>
          <span class="brand-name">Bader Idris</span>
          <span class="brand-slash"> /&gt;</span>
        </div>
        <div class="status-pill">
          <span class="status-dot" />
          <span class="status-text">baderidris.com</span>
        </div>
      </div>

      <div class="center">
        <h1 class="title">{{ displayTitle }}</h1>
        <p class="desc">{{ truncatedDescription }}</p>
      </div>

      <div class="footer">
        <div class="tags">
          <span class="tag">#Vue</span>
          <span class="tag">#Nuxt</span>
          <span class="tag">#Node</span>
          <span class="tag">#DevOps</span>
          <span class="tag">#GSAP</span>
          <span class="tag">#ThreeJS</span>
        </div>
        <div class="url">baderidris.com</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/*
  Colors based on _variables.scss:
  $primary3: #011221
  $secondary1: #607b96
  $secondary2: #3c9d93
  $secondary4: #fff
  $accent1: #fea55f
  $accent2: #43d9ad
  $lines: #1e2d3d
*/

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.root {
  position: relative;
  width: 1200px;
  height: 630px;
  overflow: hidden;
  font-family: "Fira Code", "Cascadia Code", "Menlo", monospace;

  .bg-base {
    position: absolute;
    inset: 0;
    background-color: #01080e;
  }

  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.18;

    &--teal {
      width: 560px;
      height: 560px;
      top: -160px;
      left: -120px;
      background: radial-gradient(circle, #43d9ad 0%, transparent 70%);
    }

    &--indigo {
      width: 480px;
      height: 480px;
      bottom: -140px;
      right: -80px;
      background: radial-gradient(circle, #4d5bce 0%, transparent 70%);
    }
  }

  .bg-dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, #1e2d3d 1px, transparent 1px);
    background-size: 28px 28px;
    opacity: 0.45;
  }

  .accent-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    background: linear-gradient(to bottom, #43d9ad 0%, #4d5bce 50%, transparent 100%);
    border-radius: 0 3px 3px 0;
  }

  .layout {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 52px 72px 52px 80px;

    .top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;

      .brand {
        font-size: 26px;
        font-weight: 600;
        letter-spacing: -0.01em;

        .brand-bracket,
        .brand-slash {
          color: #43d9ad;
        }

        .brand-name {
          color: #e5e9f0;
          margin: 0 2px;
        }
      }

      .status-pill {
        display: flex;
        align-items: center;
        gap: 10px;
        background-color: #011221;
        border: 1.5px solid #1e2d3d;
        border-radius: 999px;
        padding: 8px 20px;

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #43d9ad;
          box-shadow: 0 0 8px 2px rgba(67, 217, 173, 0.5);
        }

        .status-text {
          font-size: 16px;
          color: #607b96;
          letter-spacing: 0.04em;
        }
      }
    }

    .center {
      display: flex;
      flex-direction: column;
      gap: 24px;
      flex: 1;
      justify-content: center;
      max-width: 950px;

      .title {
        font-size: 70px;
        font-weight: 700;
        color: #e5e9f0;
        line-height: 1.08;
        letter-spacing: -0.02em;
        text-shadow: 0 2px 40px rgba(67, 217, 173, 0.15);
        overflow-wrap: break-word;
        word-break: break-word;
      }

      .desc {
        font-size: 28px;
        color: #607b96;
        line-height: 1.5;
        max-width: 860px;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: normal;
        max-height: 84px;
      }
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding-top: 24px;
      border-top: 1px solid #1e2d3d;

      .tags {
        display: flex;
        gap: 16px;

        .tag {
          font-size: 18px;
          color: #43d9ad;
          background-color: #011221;
          border: 1px solid #1e2d3d;
          border-radius: 6px;
          padding: 5px 14px;
          letter-spacing: 0.02em;
        }
      }

      .url {
        font-size: 18px;
        color: #607b96;
        letter-spacing: 0.06em;
        text-transform: lowercase;
      }
    }
  }
}
</style>
