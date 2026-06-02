<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
})

// ai is ugly at making simple things complicated, OMG!
// check how simple it is: https://nuxtseo.com/docs/og-image/getting-started/installation#next-steps
const siteConfig = useSiteConfig();

const displayTitle = computed(() => props.title || siteConfig.name || "Bader Idris")
const displayDescription = computed(() => props.description || siteConfig.description || "Full-stack developer & creative technologist.")

const truncatedDescription = computed(() => {
  const d = displayDescription.value
  return d.length > 120 ? d.slice(0, 117) + "..." : d
})
</script>

<template>
  <div class="root">
    <div class="bg-base"></div>
    <div class="bg-glow-teal"></div>
    <div class="bg-glow-indigo"></div>
    <div class="bg-dots"></div>

    <div class="layout">
      <div class="top-row">
        <div class="brand">
          <span class="brand-bracket">&lt;</span>
          <span class="brand-name">Bader Idris</span>
          <span class="brand-slash"> /&gt;</span>
        </div>
        <div class="status-pill">
          <span class="status-dot"></span>
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

<style scoped>
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
.root {
  position: relative;
  width: 1200px;
  height: 630px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Fira Code", monospace;
}

.bg-base {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #01080e;
}

.bg-glow-teal {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.18;
  width: 560px;
  height: 560px;
  top: -160px;
  left: -120px;
  background: radial-gradient(circle, #43d9ad 0%, transparent 70%);
}

.bg-glow-indigo {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.18;
  width: 480px;
  height: 480px;
  bottom: -140px;
  right: -80px;
  background: radial-gradient(circle, #4d5bce 0%, transparent 70%);
}

.bg-dots {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle, #1e2d3d 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.45;
}

.layout {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 52px 72px 52px 80px;
  border-left: 6px solid #43d9ad;
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.brand {
  font-size: 26px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.brand-bracket,
.brand-slash {
  color: #43d9ad;
}

.brand-name {
  color: #e5e9f0;
  margin: 0 2px;
}

.status-pill {
  display: flex;
  align-items: center;
  background-color: #011221;
  border: 1.5px solid #1e2d3d;
  border-radius: 999px;
  padding: 8px 20px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #43d9ad;
  box-shadow: 0 0 8px 2px rgba(67, 217, 173, 0.5);
  margin-right: 10px;
}

.status-text {
  font-size: 16px;
  color: #607b96;
}

.center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-grow: 1;
}

.title {
  font-size: 70px;
  font-weight: 700;
  color: #e5e9f0;
  line-height: 1.1;
  margin-bottom: 24px;
}

.desc {
  font-size: 28px;
  color: #607b96;
  line-height: 1.5;
  max-width: 860px;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-top: 24px;
  border-top: 1px solid #1e2d3d;
}

.tags {
  display: flex;
}

.tag {
  font-size: 18px;
  color: #43d9ad;
  background-color: #011221;
  border: 1px solid #1e2d3d;
  border-radius: 6px;
  padding: 5px 14px;
  margin-right: 16px;
}

.url {
  font-size: 18px;
  color: #607b96;
}
</style>
