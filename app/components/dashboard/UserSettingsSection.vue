<template>
  <div class="user-settings-section" :class="{ 'is-folded': modelValue }">
    <header class="settings-header" @click="$emit('update:modelValue', !modelValue)">
      <h4><Icon name="mdi:cog" /> {{ $t('dashboard.settings', 'Settings') }}</h4>
      <Icon :name="modelValue ? 'mdi:chevron-down' : 'mdi:chevron-up'" />
    </header>
    <div ref="contentRef" class="settings-content">
      <div class="setting-item">
        <label>
          <input 
            type="checkbox" 
            :checked="userSettings?.openLastChat" 
            @change="$emit('update-settings', { openLastChat: ($event.target as HTMLInputElement).checked })"
          />
          {{ $t('dashboard.settings_open_last_chat', 'Open last active chat') }}
        </label>
      </div>
      <div class="setting-item">
        <label>
          <input 
            type="checkbox" 
            :checked="userSettings?.showOldConversationTitles" 
            @change="$emit('update-settings', { showOldConversationTitles: ($event.target as HTMLInputElement).checked })"
          />
          {{ $t('dashboard.settings_show_names', 'Show user names in history') }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";

const props = defineProps<{
  modelValue: boolean; // folded state
  userSettings: any;
}>();

const emit = defineEmits(['update:modelValue', 'update-settings']);

const contentRef = ref<HTMLElement | null>(null);

watch(() => props.modelValue, (isFolded) => {
  if (!contentRef.value || !import.meta.client) return;
  if (!isFolded) {
    gsap.fromTo(contentRef.value, 
      { height: 0, opacity: 0 }, 
      { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" }
    );
  } else {
    gsap.to(contentRef.value, 
      { height: 0, opacity: 0, duration: 0.3, ease: "power2.in" }
    );
  }
});

onMounted(() => {
  if (props.modelValue && contentRef.value) {
    gsap.set(contentRef.value, { height: 0, opacity: 0, overflow: "hidden" });
  }
});
</script>

<style lang="scss" scoped>
.user-settings-section {
  margin-top: auto;
  border-top: 1px solid var(--lines-color);
  padding-top: 15px;

  &.is-folded {
    .settings-content {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }
  }

  .settings-header {
    cursor: pointer;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    h4 {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .settings-content {
    overflow: hidden;
    .setting-item {
      margin-bottom: 12px;
      label {
        font-size: 0.8rem;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        
        input[type="checkbox"] {
          accent-color: var(--accent-primary);
        }
      }
    }
  }
}
</style>
