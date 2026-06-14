<template>
  <aside class="connection-status-bar" :class="{ 'is-folded': modelValue }">
    <div class="status-header" @click="$emit('update:modelValue', !modelValue)">
      <div class="status-indicator">
        <span class="dot" :class="isConnected ? 'online' : 'offline'" />
        <span class="label">{{ $t('dashboard.connection_status') }}</span>
      </div>
      <Icon :name="modelValue ? 'mdi:chevron-down' : 'mdi:chevron-up'" />
    </div>
    
    <div ref="contentRef" class="status-content">
      <p v-if="connectionError" class="error">
        Error: {{ connectionError }}
      </p>
      <p v-else-if="isConnecting" class="info">{{ $t('dashboard.connecting') }}</p>
      <div v-else-if="isConnected && currentUser">
        <p>
          {{ $t('dashboard.transport') }}: <span class="highlight">{{ transport }}</span>
        </p>
        <p>
          {{ $t('dashboard.user') }}: <span class="highlight">{{ currentUser.name }} ({{ userRole }})</span>
        </p>
        <button
          v-if="isPushSupported"
          class="notifications-btn"
          @click="$emit('subscribe-notifications')"
        >
          {{ $t('dashboard.enable_notifications') }}
        </button>
      </div>
      <p v-else class="info">{{ $t('dashboard.disconnected') }}</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { gsap } from "gsap";

const props = defineProps<{
  modelValue: boolean; // folded state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  transport: string | null;
  currentUser: any;
  userRole: string;
  isPushSupported: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'subscribe-notifications']);

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
.connection-status-bar {
  margin-bottom: 1rem;
  padding: 0;
  background-color: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--lines-color);
  overflow: hidden;
  transition: all 0.3s ease;
  width: 100%;
  flex-shrink: 0;

  &.is-folded {
    background: transparent;
    .status-content {
      border-top-color: transparent !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }
  }

  .status-header {
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    gap: 15px;
    user-select: none;

    &:hover {
      background: var(--bg-primary-hovered);
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        &.online { background: #4caf50; box-shadow: 0 0 5px #4caf50; }
        &.offline { background: var(--accent-error); }
      }
      .label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--text-secondary);
      }
    }
  }

  .status-content {
    max-height: 310px;
    padding: 0 12px 12px;
    border-top: 1px solid var(--lines-color);
    animation: fadeIn 0.3s ease;

    p {
      margin: 8px 0 0;
      font-size: 0.75rem;
      color: var(--text-primary);
      .highlight { color: var(--accent-primary); font-weight: bold; }
    }
    
    .notifications-btn {
      margin-top: 10px;
      width: 100%;
      font-size: 0.7rem;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
