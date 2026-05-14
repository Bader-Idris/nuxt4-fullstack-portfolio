<script setup lang="ts">
const { title, description } = defineProps<{
  title?: string
  description?: string
}>()

const siteConfig = useSiteConfig()
</script>

<template>
  <div class="og-container">
    <div class="content">
      <div class="brand">
        &lt;Bader Idris /&gt;
      </div>
      <h1 class="title">
        {{ title || siteConfig.name }}
      </h1>
      <p class="description">
        {{ description || siteConfig.description }}
      </p>
    </div>
    
    <div class="footer">
      <div class="tags">
        <span>#Vue</span>
        <span>#Nuxt</span>
        <span>#Node</span>
        <span>#DevOps</span>
        <span>#GSAP</span>
        <span>#ThreeJS</span>
      </div>
      <div class="domain">
        baderidris.com
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.og-container {
  width: 1200px;
  height: 630px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #01080E;
  color: #607B96;
  font-family: 'Fira Code', monospace;
  padding: 80px;
  border: 8px solid #1E2D3D;
  box-sizing: border-box;

  .content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;

    .brand {
      color: #43D9AD;
      font-size: 24px;
      margin-bottom: 16px;
    }

    .title {
      font-size: 72px;
      font-weight: 700;
      color: #E5E9F0;
      line-height: 1.1;
      margin-bottom: 32px;
      margin-top: 0;
    }

    .description {
      font-size: 30px;
      color: #607B96;
      line-height: 1.5;
      max-width: 90%;
      margin: 0;
    }
  }

  .footer {
    margin-top: auto;
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;

    .tags {
      display: flex;
      gap: 24px;
      color: #4D5BCE;
      font-size: 20px;
    }

    .domain {
      color: #607B96;
      font-size: 20px;
    }
  }
}
</style>
