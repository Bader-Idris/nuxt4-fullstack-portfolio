<template>
  <header class="chat-header" data-clarity-mask="true">
    <div class="user-info-header">
      <div class="avatar-wrapper">
        <img v-if="recipientAvatar" :src="recipientAvatar" class="avatar-img" />
        <ScriptGravatar v-else-if="recipientAvatarHash" :hash="recipientAvatarHash" :size="40" class="avatar-img rounded-full" />
        <div v-else class="avatar-placeholder">{{ recipientName?.charAt(0) || '?' }}</div>
      </div>
      <div class="user-details">
        <h2>{{ recipientName }}</h2>
        <span class="online-status">{{ $t('dashboard.online', 'online') }}</span>
      </div>
    </div>
    <div class="header-actions">
      <button @click="$emit('audio-call')"><Icon name="mdi:phone" /></button>
      <button @click="$emit('video-call')"><Icon name="mdi:video" /></button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  recipientName: string;
  recipientAvatar: string | null;
  recipientAvatarHash: string | null;
}>();

defineEmits(['audio-call', 'video-call']);
</script>

<style lang="scss" scoped>
.chat-header {
  padding: 10px 20px;
  border-bottom: 1px solid var(--lines-color);
  background-color: var(--bg-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 5;

  .user-info-header {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .avatar-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary-hovered);
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--gradient-start);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }

    .user-details {
      h2 { margin: 0; font-size: 1rem; color: var(--text-primary); }
      .online-status { font-size: 0.8rem; color: #4caf50; }
    }
  }

  .header-actions {
    display: flex;
    gap: 15px;
    button {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 1.2rem;
      &:hover { color: var(--accent-primary); }
    }
  }
}
</style>
