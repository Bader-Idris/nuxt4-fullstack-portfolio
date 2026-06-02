<template>
  <div class="hobby-detail">
    <h1 class="title">{{ hobbyTitle }}</h1>
    <div class="content-placeholder">
      <Icon name="mdi:construction" size="64" class="icon" />
      <p>{{ t('about.professional.description', 'Please stay tuned, this page requires fixes,') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();

const hobbyId = computed(() => route.params.id as string);

const hobbyTitle = computed(() => {
  const id = hobbyId.value;
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
});

useSeoMeta({
  title: () => `${hobbyTitle.value} | Hobbies`,
  description: () => `Learn more about my ${hobbyTitle.value} hobby.`,
});

useSchemaOrg([
  defineWebPage({
    name: () => `${hobbyTitle.value} | Hobbies`,
    description: () => `Learn more about my ${hobbyTitle.value} hobby.`,
  }),
  defineWebSite({
    name: 'Bader Idris Portfolio',
    url: 'https://baderidris.com'
  })
]);
</script>

<style lang="scss" scoped>
.hobby-detail {
  @include flex-container(column, nowrap, center, center);
  width: 100%;
  height: 100%;
  color: $secondary4;
  text-align: center;
  gap: 20px;
  padding: 40px;
  overflow-y: auto;

  @include mobile {
    padding: 20px 15px;
  }

  .title {
    font-size: 2rem;
    background: linear-gradient(135deg, $secondary4 0%, $accent2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .content-placeholder {
    @include flex-container(column, nowrap, center, center);
    gap: 15px;
    opacity: 0.7;

    .icon {
      color: $accent1;
    }
  }
}
</style>
