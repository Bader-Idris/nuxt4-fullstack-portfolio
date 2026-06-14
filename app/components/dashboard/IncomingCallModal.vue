<template>
  <Transition name="fade">
    <div v-if="show" class="incoming-call-modal" data-clarity-mask="true">
      <div class="modal-content">
        <div class="avatar-large">
          {{ partnerName?.charAt(0) || '?' }}
        </div>
        <h3>{{ callType === 'video' ? $t('dashboard.incoming_video_call', 'Incoming Video Call') : $t('dashboard.incoming_audio_call', 'Incoming Audio Call') }}</h3>
        <p>{{ partnerName }} {{ $t('dashboard.is_calling_you', 'is calling you...') }}</p>
        <div class="modal-actions">
          <button class="accept-btn" @click="$emit('accept')">
            <Icon name="mdi:phone" />
            {{ $t('dashboard.accept', 'Accept') }}
          </button>
          <button class="decline-btn" @click="$emit('decline')">
            <Icon name="mdi:phone-hangup" />
            {{ $t('dashboard.decline', 'Decline') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  callType: 'audio' | 'video';
  partnerName: string;
}>();

defineEmits(['accept', 'decline']);
</script>

<style lang="scss" scoped>
.incoming-call-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;

  .modal-content {
    background: var(--bg-secondary);
    padding: 40px;
    border-radius: 24px;
    text-align: center;
    border: 1px solid var(--lines-color);
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    width: 320px;

    .avatar-large {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: var(--gradient-start);
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      color: white;
      font-weight: bold;
    }

    h3 { color: var(--text-primary); margin-bottom: 10px; }
    p { color: var(--text-secondary); margin-bottom: 30px; }

    .modal-actions {
      display: flex;
      gap: 15px;
      button {
        flex: 1;
        padding: 12px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;

        &.accept-btn { background: #4caf50; color: white; &:hover { background: #45a049; } }
        &.decline-btn { background: var(--accent-error); color: white; &:hover { background: #e53935; } }
      }
    }
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
