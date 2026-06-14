<template>
  <div
    ref="containerRef"
    class="chat-container"
    @scroll="handleScroll"
    data-clarity-mask="true"
  >
    <div v-if="isLoading" class="loading-indicator">
      <div class="spinner-small" />
    </div>
    
    <template v-for="(msg, index) in messages" :key="msg.id">
      <div v-if="shouldShowDateSeparator(index)" class="date-separator">
        <span>{{ formatDateRelative(msg.timestamp) }}</span>
      </div>
      
      <!-- System Message / Call Fingerprint (Localized) -->
      <div v-if="isCallFingerprint(msg.message)" class="system-message call-fingerprint">
        <span class="icon">{{ parseCallFingerprint(msg.message)?.duration > 0 ? '📞' : '📵' }}</span>
        <span>{{ getCallFingerprintText(msg.message) }}</span>
      </div>

      <!-- Backward Compatibility for older HTML fingerprints -->
      <div v-else-if="msg.message.includes('system-message')" v-html="msg.message" style="display: contents;" />
      
      <ChatMessage
        v-else
        :content="msg.message"
        :sender-name="showNames ? msg.fromName : ''"
        :timestamp="formatTimestamp(msg.timestamp)"
        :is-own="msg.from === currentUserId"
        @contextmenu.prevent="$emit('message-context', $event, msg)"
        @dblclick="isMobile && $emit('message-context', $event, msg)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  messages: any[];
  isLoading: boolean;
  currentUserId: string;
  showNames: boolean;
  isMobile: boolean;
}>();

const emit = defineEmits(['message-context', 'load-more', 'scroll-bottom-reached']);

const containerRef = ref<HTMLElement | null>(null);

defineExpose({
  containerRef
});

const handleScroll = () => {
  const container = containerRef.value;
  if (!container) return;

  if (container.scrollTop === 0) {
    emit('load-more');
  }

  if (container.scrollHeight - container.scrollTop <= container.clientHeight + 1) {
    emit('scroll-bottom-reached');
  }
};

const formatTimestamp = (timestamp: string | number | Date) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function shouldShowDateSeparator(index: number) {
  if (index === 0) return true;
  const currentMsgDate = new Date(props.messages[index].timestamp).toDateString();
  const prevMsgDate = new Date(props.messages[index - 1].timestamp).toDateString();
  return currentMsgDate !== prevMsgDate;
}

const { t } = useI18n();
const { formatDateSeparator: formatDateGeneric } = useDateFormatter();

function formatDateRelative(timestamp: string | number | Date) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t('dashboard.date.today');
  if (date.toDateString() === yesterday.toDateString()) return t('dashboard.date.yesterday');
  return formatDateGeneric(timestamp);
}

const isCallFingerprint = (message: string) => message.startsWith('[CALL_FP]:');

const parseCallFingerprint = (message: string) => {
  try {
    return JSON.parse(message.replace('[CALL_FP]:', ''));
  } catch (e) {
    return null;
  }
};

const getCallFingerprintText = (message: string) => {
  const data = parseCallFingerprint(message);
  if (!data) return message;

  let statusKey = '';
  if (data.status === 'declined') statusKey = 'declined';
  else if (data.status === 'busy') statusKey = 'busy';
  else if (data.status === 'missed') statusKey = 'missed';
  else if (data.status === 'cancelled') statusKey = 'cancelled';
  else if (data.status === 'completed') statusKey = 'completed';
  else {
    statusKey = data.callType === 'video' ? 'ended_video' : 'ended_audio';
  }

  const statusText = t(`dashboard.call_statuses.${statusKey}`);
  const durationText = data.duration > 0 ? ` • ${formatDuration(data.duration)}` : '';
  return `${statusText}${durationText}`;
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
</script>

<style lang="scss" scoped>
.chat-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;

  .loading-indicator {
    display: flex;
    justify-content: center;
    padding: 10px;
  }
}

.date-separator {
  display: flex;
  justify-content: center;
  margin: 15px 0;
  span { background: rgba(0, 0, 0, 0.2); color: white; padding: 4px 12px; border-radius: 15px; font-size: 0.75rem; backdrop-filter: blur(4px); }
}

.system-message {
  align-self: center;
  margin: 10px 0;
  padding: 6px 16px;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--lines-color);
  
  &.call-fingerprint {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    font-weight: 500;
  }
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent-secondary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
