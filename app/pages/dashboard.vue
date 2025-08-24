<template>
  <div class="dashboard">
    <h1>Socket.IO Dashboard</h1>

    <!-- Connection Status Bar -->
    <aside class="connection-status-bar">
      <p v-if="socketStore.connectionError" class="error">
        Connection Error: {{ socketStore.connectionError }}
      </p>
      <p v-else-if="socketStore.isConnecting" class="info">
        Connecting...
      </p>
      <div v-else-if="socketStore.isConnected && socketStore.currentUser">
        <p>Status: <span style="color: green">Connected</span> ({{ socketStore.transport }})</p>
        <p>Welcome, {{ socketStore.currentUser.name }} ({{ socketStore.currentUser.role }})</p>
      </div>
      <p v-else class="info">
        Disconnected
      </p>
    </aside>

    <!-- Main Content Grid -->
    <div class="dashboard-grid">
      <!-- Online Users List -->
      <div class="online-users-panel">
        <h3>Online Users</h3>
        <div v-if="onlineUsersStore.users.length === 0" class="no-users">
          No other users online.
        </div>
        <ul v-else>
          <li v-for="onlineUser in onlineUsersStore.users.filter(u => u.userId !== socketStore.currentUser?.userId)"
            :key="onlineUser.userId" 
            class="user-item"
            @click="startChatWith(onlineUser.userId)"
            :class="{ 'active-chat': recipientUserId === onlineUser.userId }"
          >
            <div class="user-info">
              <span class="user-name">{{ onlineUser.name }}</span>
              <span class="user-status">Online</span>
            </div>
            <div class="user-actions">
              <button 
                @click.stop="initiateCall(onlineUser.userId)" 
                class="call-btn"
                :disabled="isInCall">
                <Icon name="heroicons:video-camera-solid" width="16" />
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Chat and Video Area -->
      <div class="chat-video-area">
        <!-- Video Call UI (Overlay) -->
        <div v-if="isInCall" class="video-call-container">
          <div class="call-info">
            <p>In call with: {{ getUserName(currentCallPartner) }}</p>
          </div>
          <div class="video-grid">
            <div class="remote-video-container">
              <video ref="remoteVideoRef" autoplay playsinline class="remote-video" />
              <div v-if="!remoteStream" class="connecting-overlay">
                <span>Connecting...</span>
                <div class="spinner"></div>
              </div>
            </div>
            <div class="local-video-container">
              <video ref="localVideoRef" autoplay playsinline muted class="local-video" />
            </div>
          </div>
          <div class="call-controls">
            <button @click="toggleMute" class="control-btn" :class="{ 'active': isMuted }">
              <Icon :name="isMuted ? 'heroicons:microphone-slash' : 'heroicons:microphone'" width="24" />
            </button>
            <button @click="toggleVideo" class="control-btn" :class="{ 'active': isVideoOff }">
              <Icon :name="isVideoOff ? 'heroicons:video-camera-slash' : 'heroicons:video-camera'" width="24" />
            </button>
            <button @click="endCall" class="control-btn end-call">
              <Icon name="heroicons:phone-x-mark" width="24" />
            </button>
          </div>
        </div>

        <!-- Chat UI -->
        <div v-else-if="recipientUserId" class="chat-panel">
          <header class="chat-header">
            <h2>Chat with {{ getRecipientName() }}</h2>
          </header>
          <div ref="chatContainer" class="chat-container" @scroll="handleScroll">
            <div v-if="isLoadingHistory" class="loading-indicator">
              Loading older messages...
            </div>
            <!-- <div v-for="msg in messagesStore.getMessagesForRecipient(recipientUserId)" :key="msg.id" :class="['message', msg.from === socketStore.currentUser?.userId ? 'sent' : 'received']">
              <div class="message-header">
                <span class="sender-name">{{ msg.fromName }}</span>
              </div>
              <div class="message-content">
                <span>{{ msg.message }}</span>
              </div>
              <div class="message-timestamp">{{ formatTimestamp(msg.timestamp) }}</div>
            </div> -->
          </div>
          <form @submit.prevent="sendPrivateMessage" class="chat-input-form">
            <input v-model="message" placeholder="Type your message" required />
            <CustomButton button-type="primary" type="submit">Send</CustomButton>
          </form>
        </div>
         <div v-else class="chat-placeholder">
            <p>Select a user to start a conversation.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSocketStore } from '~/stores/useSocketStore';
import { useMessagesStore } from '~/stores/useMessagesStore';
import { useOnlineUsersStore } from '~/stores/useOnlineUsersStore';
// import { useDebounceFn, useTimeoutFn } from '@vueuse/core';
// import { useWebRTC } from '~/composables/useWebRTC'; // Assuming useWebRTC is in composables
import { useWebRTC } from '~/components/webRTC'; // TODO: should it be in composables instead?
const { $push } = useNuxtApp();

useSeoMeta({
  title: 'Dashboard - Secure Chat & Video',
  description: 'Access exclusive content, resources, and services on Bader Idris\'s platform.',
});

// --- Pinia Stores ---
const socketStore = useSocketStore();
const messagesStore = useMessagesStore();
const onlineUsersStore = useOnlineUsersStore();
const localePath = useLocalePath()

// --- Component State ---
const recipientUserId = ref('');
const message = ref('');
const isLoadingHistory = ref(false);
const chatContainer = ref<HTMLElement | null>(null);

// --- WebRTC Composables ---
const {
  remoteStream,
  currentCallPartner,
  initiateCall,
  endCall,
  isInCall,
  isMuted,
  isVideoOff,
  localVideoRef,
  remoteVideoRef,
  toggleMute,
  toggleVideo,
  setupWebRTCSocketListeners, // Renamed for clarity
} = useWebRTC(socketStore.socket); // Pass the socket ref to the composable

// --- Lifecycle Hooks ---
onMounted(() => {
  if (import.meta.client) {
    // The single point of entry to connect the socket for the whole app
    socketStore.initializeSocket();

    // Bind the event listeners specific to chat functionality
    // socketStore.bindChatEvents();
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    // Clean up chat-specific listeners when the component is destroyed
    // to prevent duplicate handlers if the user navigates back.
    // socketStore.unbindChatEvents();
    
    // Note: We DO NOT call disconnectSocket() here because we want the 
    // connection to persist across the application.
  }
});

// --- Watchers ---

// When the socket connection is established, set up WebRTC listeners
watch(() => socketStore.socket, (newSocket) => {
  if (newSocket) {
    setupWebRTCSocketListeners(newSocket);
  }
}, { immediate: true });


// When a new chat is selected, fetch its history
watch(recipientUserId, (newRecipientId) => {
  if (newRecipientId) {
    messagesStore.page = 1; // Reset page
    isLoadingHistory.value = true;
    socketStore.fetchMessageHistory(newRecipientId, messagesStore.page, messagesStore.limit);
  }
});

// When new messages are added, scroll to the bottom
// watch(() => messagesStore.getMessagesForRecipient(recipientUserId.value), () => {
//   scrollToBottom();
// }, { deep: true });

// When history is loaded, stop the loading indicator
watch(() => messagesStore.isLoading, (loading) => {
    if (!loading) {
        isLoadingHistory.value = false;
    }
});


// --- Methods ---
function sendPrivateMessage() {
  if (recipientUserId.value && message.value.trim()) {
    socketStore.sendPrivateMessage(recipientUserId.value, message.value.trim());
    message.value = '';
    nextTick(() => scrollToBottom());
  }
}

function startChatWith(userId: string) {
  if (isInCall.value) {
    alert('You cannot start a new chat while in a call.');
    return;
  }
  recipientUserId.value = userId;
}

const handleScroll = () => {
  if (chatContainer.value?.scrollTop === 0 && !isLoadingHistory.value && !messagesStore.isEndOfHistory(recipientUserId.value)) {
    isLoadingHistory.value = true;
    messagesStore.incrementPage();
    socketStore.fetchMessageHistory(recipientUserId.value, messagesStore.page, messagesStore.limit);
  }
};

function scrollToBottom() {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
    });
}

// --- Helpers ---
const getUserName = (userId: string | null) => {
  if (!userId) return 'Unknown';
  const user = onlineUsersStore.users.find((u) => u.userId === userId);
  // return user ? user.name : 'Unknown';
  return user ? user.name : 'Unknown User';
};

/* 
const getRecipientName = () => {
  const recipient = onlineUsersStore.users.find(u => u.userId === recipientUserId.value);
  return recipient ? recipient.name : 'Unknown';
};
*/
const getRecipientName = () => getUserName(recipientUserId.value);

const formatTimestamp = (timestamp: string | number | Date) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

</script>

<style lang="scss" scoped>
.dashboard {
  @include flex-container(column, nowrap, unset, unset);
  height: calc($full-viewport-height - 80px); /* Adjust based on your nav height */
  padding: 1rem;
  gap: 1rem;
}

.connection-status-bar {
  padding: 0.5rem 1rem;
  background-color: #f0f0f0;
  border-radius: 8px;
  p { margin: 0.2rem 0; }
  .error { color: #d32f2f; }
  .info { color: #666; }
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 280px 1fr; /* Sidebar and main content */
  gap: 1rem;
  flex-grow: 1;
  overflow: hidden;
}

.online-users-panel {
  background-color: #f7f9fc;
  border-radius: 8px;
  padding: 1rem;
  overflow-y: auto;
  h3 { margin-top: 0; }
  ul { list-style: none; padding: 0; margin: 0; }
}

.user-item {
  @include flex-container(row, nowrap, space-between, center);
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover { background-color: #e9eef5; }
  &.active-chat { background-color: #d1e0f3; }
  .user-name { font-weight: 500; }
  .call-btn { background: none; border: none; cursor: pointer; }
}

.chat-video-area {
  @include flex-container(column, nowrap, unset, unset);
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  position: relative; /* For video overlay */
}

.chat-placeholder {
    @include flex-container(row, nowrap, center, center);
    height: 100%;
    color: #888;
    font-size: 1.2rem;
}

.chat-panel {
  @include flex-container(column, nowrap, unset, unset);
  height: 100%;
}

.chat-header {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9f9f9;
  h2 { margin: 0; font-size: 1.2rem; }
}

.chat-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
  @include flex-container(column, nowrap, unset, unset);
  gap: 0.75rem;
}

.message {
  @include flex-container(column, nowrap, unset, unset);
  max-width: 75%;
  &.sent { align-self: flex-end; .message-content { background-color: #dcf8c6; } }
  &.received { align-self: flex-start; .message-content { background-color: #f1f1f1; } }
  .message-content { padding: 0.5rem 0.75rem; border-radius: 12px; }
  .message-timestamp { font-size: 0.75rem; color: #999; margin-top: 4px; }
}

.chat-input-form {
  display: flex;
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
  gap: 0.5rem;
  input { flex-grow: 1; padding: 0.5rem; border: 1px solid #ccc; border-radius: 6px; }
}

/* Video Call Styles */
.video-call-container {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: #121212;
  z-index: z("content");
  @include flex-container(column, nowrap, unset, unset);
}
.video-grid {
  flex: 1;
  position: relative;
}
.remote-video-container { width: 100%; height: 100%; }
.remote-video { width: 100%; height: 100%; object-fit: cover; }
.local-video-container {
  position: absolute;
  width: 25%; max-width: 200px;
  bottom: 80px; /* Above controls */
  right: 20px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid white;
}
.local-video { width: 100%; height: 100%; object-fit: cover; }
.call-controls {
  @include flex-container(row, nowrap, center, unset);
  gap: 1rem;
  padding: 1rem;
  background-color: rgba(0,0,0,0.5);
  position: absolute;
  bottom: 0;
  width: 100%;
}
.control-btn {
  width: 50px; height: 50px;
  border-radius: 50%;
  background-color: #333; color: white;
  border: none; cursor: pointer;
  &.end-call { background-color: #e53935; }
}
</style>
