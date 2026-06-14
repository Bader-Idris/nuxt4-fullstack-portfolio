<template>
  <li
    class="user-item"
    :class="{
      'active-chat': isActive,
      'is-me': isMe,
      'is-guest-item': isGuest
    }"
    @click="$emit('start-chat', user.userId)"
  >
    <div class="user-info">
      <div class="user-avatar-mini">
        <img v-if="user.avatar" :src="user.avatar" class="avatar-img" />
        <ScriptGravatar v-else-if="user.avatarHash" :hash="user.avatarHash" :size="30" class="avatar-img rounded-full" />
        <div v-else class="avatar-placeholder-mini">{{ user.name.charAt(0) }}</div>
      </div>
      <span class="user-name">
        {{ user.name }}
        <span v-if="isMe" class="me-tag">{{ $t('dashboard.me_tag', '(Me)') }}</span>
      </span>
      <span class="user-status online" />
    </div>
    <div class="user-actions">
      <button
        class="vid-call-btn"
        :disabled="isInCall || isGuest || isMe"
        @click.stop="$emit('video-call', user.userId)"
      >
        <Icon
          v-if="!isGuest && !isMe"
          name="mdi:video"
          width="16"
        />
        <Icon
          v-else
          name="mdi:lock"
          width="15"
          height="15"
        />
      </button>
      <button
        class="call-btn"
        :disabled="isInCall || isGuest || isMe"
        @click.stop="$emit('audio-call', user.userId)"
      >
        <Icon
          v-if="!isGuest && !isMe"
          name="mdi:phone"
          width="16"
          height="16"
        />
        <Icon
          v-else
          name="mdi:lock"
          width="15"
          height="15"
        />
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
defineProps<{
  user: any;
  isActive: boolean;
  isMe: boolean;
  isGuest: boolean;
  isInCall: boolean;
}>();

defineEmits(['start-chat', 'audio-call', 'video-call']);
</script>

<style lang="scss" scoped>
.user-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover:not(.disabled) { background: var(--bg-primary-hovered); }
  &.active-chat {
    background: var(--gradient-start);
    .user-name { color: white; }
    .user-status.online { background: white; }
    .user-actions button { color: white; }
  }
  
  &.is-me {
    cursor: default;
    border-left: 3px solid var(--accent-primary);
    padding-left: 7px;
    background: rgba(var(--accent-primary-rgb), 0.05);
    
    .user-name {
      font-weight: 600;
      color: var(--accent-primary);
    }
  }

  .me-tag {
    font-size: 0.7rem;
    background: var(--accent-primary);
    color: white;
    padding: 1px 5px;
    border-radius: 4px;
    margin-left: 5px;
    vertical-align: middle;
    font-weight: normal;
  }

  .user-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;

    .user-avatar-mini {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary-hovered);
      flex-shrink: 0;

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder-mini {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--gradient-start);
        color: white;
        font-size: 0.8rem;
        font-weight: bold;
      }
    }

    .user-name { font-weight: 500; color: var(--text-primary); }
    .user-status.online { width: 8px; height: 8px; border-radius: 50%; background: #4caf50; }
  }

  .user-actions {
    display: flex;
    gap: 8px;
    button {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      &:hover:not(:disabled) { color: var(--accent-primary); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  }
}
</style>
