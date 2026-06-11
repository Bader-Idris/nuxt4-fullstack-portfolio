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
const config = useRuntimeConfig();
const siteConfig = useSiteConfig();

const displayTitle = computed(() => props.title || siteConfig.name || "Bader Idris")
const displayDescription = computed(() => props.description || siteConfig.description || "Full-stack developer & creative technologist.")

const displayHost = computed(() => {
  if (!siteConfig.url) return 'baderidris.com';
  return siteConfig.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
});

const isRtl = computed(() => {
  // Support for Arabic, Hebrew, Persian, etc.
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  // Use a fallback or explicit check if necessary for SSR/Client consistency
  return rtlRegex.test(displayTitle.value);
});

const truncatedDescription = computed(() => {
  const d = displayDescription.value
  return d.length > 120 ? d.slice(0, 117) + "..." : d
})
</script>

<template>
  <div class="root" :style="{ fontFamily: 'Cascadia Code, monospace' }">
    <div class="bg-base"></div>
    <div class="bg-glow-teal"></div>
    <div class="bg-glow-indigo"></div>
    <div class="bg-dots"></div>

    <div 
      class="layout" 
      :style="{ 
        borderLeft: isRtl ? 'none' : '6px solid #43d9ad', 
        borderRight: isRtl ? '6px solid #43d9ad' : 'none',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 72px 52px 80px',
        alignItems: isRtl ? 'flex-end' : 'flex-start'
      }"
    >
      <div class="top-row" :style="{ display: 'flex', width: '100%', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row' }">
        <div class="brand" :style="{ display: 'flex', alignItems: 'center', flexDirection: isRtl ? 'row-reverse' : 'row' }">
          <span class="brand-bracket">&lt;</span>
          <span class="brand-name" :style="{ margin: isRtl ? '0 4px 0 0' : '0 0 0 4px' }">Bader Idris</span>
          <span class="brand-slash"> /&gt;</span>
        </div>
        <div class="status-pill" :style="{ display: 'flex', alignItems: 'center', backgroundColor: '#011221', border: '1.5px solid #1e2d3d', borderRadius: '999px', padding: '8px 20px', flexDirection: isRtl ? 'row-reverse' : 'row' }">
          <span class="status-dot" :style="{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#43d9ad', margin: isRtl ? '0 0 0 10px' : '0 10px 0 0' }"></span>
          <span class="status-text">{{ displayHost }}</span>
        </div>
      </div>

      <div class="center" :style="{ 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flexGrow: 1,
        textAlign: isRtl ? 'right' : 'left',
        alignItems: isRtl ? 'flex-end' : 'flex-start'
      }">
        <h1 class="title" :style="{ fontSize: '70px', fontWeight: '700', color: '#e5e9f0', lineHeight: '1.1', marginBottom: '24px' }">
          {{ displayTitle }}
        </h1>
        <p class="desc" :style="{ fontSize: '28px', color: '#607b96', lineHeight: '1.5', maxWidth: '860px' }">
          {{ truncatedDescription }}
        </p>
      </div>

      <div class="footer" :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: '24px', borderTop: '1px solid #1e2d3d', flexDirection: isRtl ? 'row-reverse' : 'row' }">
        <div class="tags" :style="{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row' }">
          <span class="tag" :style="{ margin: isRtl ? '0 0 0 16px' : '0 16px 0 0' }">#Vue</span>
          <span class="tag" :style="{ margin: isRtl ? '0 0 0 16px' : '0 16px 0 0' }">#Nuxt</span>
          <span class="tag" :style="{ margin: isRtl ? '0 0 0 16px' : '0 16px 0 0' }">#Node</span>
          <span class="tag" :style="{ margin: isRtl ? '0 0 0 16px' : '0 16px 0 0' }">#DevOps</span>
          <span class="tag" :style="{ margin: isRtl ? '0 0 0 16px' : '0 16px 0 0' }">#GSAP</span>
          <span class="tag">#ThreeJS</span>
        </div>
        <div class="url">{{ displayHost }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.root {
  position: relative;
  width: 1200px;
  height: 630px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bg-base {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #01080e;
}

.bg-glow-teal {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.18;
  width: 560px; height: 560px;
  top: -160px; left: -120px;
  background: radial-gradient(circle, #43d9ad 0%, transparent 70%);
}

.bg-glow-indigo {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.18;
  width: 480px; height: 480px;
  bottom: -140px; right: -80px;
  background: radial-gradient(circle, #4d5bce 0%, transparent 70%);
}

.bg-dots {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle, #1e2d3d 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.45;
}

.layout {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
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
  box-shadow: 0 0 8px 2px rgba(67, 217, 173, 0.5);
}

.status-text {
  font-size: 16px;
  color: #607b96;
}

.tag {
  font-size: 18px;
  color: #43d9ad;
  background-color: #011221;
  border: 1px solid #1e2d3d;
  border-radius: 6px;
  padding: 5px 14px;
}

.url {
  font-size: 18px;
  color: #607b96;
}
</style>
