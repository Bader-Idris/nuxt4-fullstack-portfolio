<template>
  <div class="dashboard">
    <!-- Connection Status Bar -->
    <aside class="connection-status-bar">
      <ClientOnly>
        <p v-if="socketStore.connectionError" class="error">
          Connection Error: {{ socketStore.connectionError }}
        </p>
        <p v-else-if="socketStore.isConnecting" class="info">Connecting...</p>
        <div v-else-if="socketStore.isConnected && socketStore.currentUser">
          <p>
            Status: <span style="color: green">Connected</span> ({{
              socketStore.transport
            }})
          </p>
          <p>
            Welcome, {{ socketStore.currentUser.name }} ({{
              socketStore.currentUser.role
            }})
          </p>
          <button
            v-if="isPushSupported"
            class="notifications-btn"
            @click="subscribeForNotifications"
          >
            Enable Notifications
          </button>
        </div>
        <p v-else class="info">Disconnected</p>
        <template #fallback>
          <p class="info">Loading...</p>
        </template>
      </ClientOnly>
    </aside>

    <!-- Main Content Grid -->
    <ClientOnly>
      <div class="dashboard-grid">
        <!-- Online Users List -->
        <div ref="contactsPanel" class="online-users-panel">
          <h3>Online Users ({{ onlineUsersStore.users.length }})</h3>
          <div v-if="onlineUsersStore.users.length === 0" class="no-users">
            No users online.
          </div>
          <ul>
            <li
              v-for="user in onlineUsersStore.users"
              :key="user.userId"
              class="user-item"
              :class="{
                'active-chat': recipientUserId === user.userId,
                disabled:
                  userStore.isGuest ||
                  user.userId === socketStore.currentUser?.userId,
              }"
              @click="startChatWith(user.userId)"
            >
              <div class="user-info">
                <span class="user-name">{{ user.name }}</span>
                <span class="user-status online" />
              </div>
              <div class="user-actions">
                <button
                  class="vid-call-btn"
                  :disabled="
                    isInCall ||
                    userStore.isGuest ||
                    user.userId === socketStore.currentUser?.userId
                  "
                  @click.stop="initiateCall(user.userId, 'video')"
                >
                  <Icon
                    v-if="
                      !userStore.isGuest &&
                      user.userId !== socketStore.currentUser?.userId
                    "
                    name="heroicons:video-camera-solid"
                    width="16"
                  />
                  <Icon
                    v-else
                    name="ion:locked"
                    width="15"
                    height="15"
                    mode="svg"
                  />
                </button>
                <button
                  class="call-btn"
                  :disabled="
                    isInCall ||
                    userStore.isGuest ||
                    user.userId === socketStore.currentUser?.userId
                  "
                  @click.stop="initiateCall(user.userId, 'audio')"
                >
                  <Icon
                    v-if="
                      !userStore.isGuest &&
                      user.userId !== socketStore.currentUser?.userId
                    "
                    name="material-symbols:call"
                    width="16"
                  />
                  <Icon
                    v-else
                    name="ion:locked"
                    width="15"
                    height="15"
                    mode="svg"
                  />
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
                <video
                  ref="remoteVideoRef"
                  autoplay
                  playsinline
                  class="remote-video"
                />
                <div v-if="!remoteStream" class="connecting-overlay">
                  <span>Connecting...</span>
                  <div class="spinner" />
                </div>
              </div>
              <div class="local-video-container">
                <video
                  ref="localVideoRef"
                  autoplay
                  playsinline
                  muted
                  class="local-video"
                />
              </div>
            </div>
            <div class="call-controls">
              <button
                class="control-btn"
                :class="{ active: isMuted }"
                @click="toggleMute"
              >
                <Icon
                  :name="
                    isMuted
                      ? 'heroicons:microphone-slash'
                      : 'heroicons:microphone'
                  "
                  width="24"
                />
              </button>
              <button
                class="control-btn"
                :class="{ active: isVideoOff }"
                @click="toggleVideo"
              >
                <Icon
                  :name="
                    isVideoOff
                      ? 'heroicons:video-camera-slash'
                      : 'heroicons:video-camera'
                  "
                  width="24"
                />
              </button>
              <button class="control-btn end-call" @click="endCall">
                <Icon name="heroicons:phone-x-mark" width="24" />
              </button>
            </div>
          </div>

          <!-- Chat UI -->
          <div
            v-else-if="recipientUserId && !userStore.isGuest"
            class="chat-panel"
          >
            <header class="chat-header">
              <h2>Chat with {{ getRecipientName() }}</h2>
            </header>
            <div
              ref="chatContainer"
              class="chat-container"
              @scroll="handleScroll"
            >
              <div v-if="messagesStore.isLoading" class="loading-indicator">
                Loading older messages...
              </div>
              <div
                v-for="msg in messagesStore.getMessagesForRecipient(
                  recipientUserId,
                )"
                :key="msg.id"
                :class="[
                  'message',
                  msg.from === userStore.getUserId ? 'sent' : 'received',
                ]"
              >
                <div class="message-header">
                  <span class="sender-name">{{ msg.fromName }}</span>
                </div>
                <div class="message-content">
                  <span>{{ msg.message }}</span>
                </div>
                <div class="message-timestamp">
                  {{ formatTimestamp(msg.timestamp) }}
                </div>
              </div>
            </div>
            <div
              v-if="showNewMessageIndicator"
              class="new-message-indicator"
              @click="scrollToBottom"
            >
              ↓ New Messages
            </div>
            <form class="chat-input-form" @submit.prevent="sendPrivateMessage">
              <input
                v-model="message"
                placeholder="Type your message"
                required
              />
              <CustomButton button-type="primary" type="submit"
                >Send</CustomButton
              >
            </form>
          </div>
          <div v-else class="chat-placeholder">
            <div v-if="userStore.isGuest" class="guest-placeholder">
              <Icon name="ion:locked" width="50" height="50" mode="svg" />
              <p>
                Please
                <NuxtLink :to="localePath('/login')">sign in</NuxtLink> to chat
                with other users.
              </p>
            </div>
            <p v-else>Select a user to start a conversation.</p>
          </div>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useSocketStore } from "~/stores/useSocketStore";
import { useMessagesStore } from "~/stores/useMessagesStore";
import { useOnlineUsersStore } from "~/stores/useOnlineUsersStore";
import { useUserStore } from "~/stores/useUserSocket";
// import { useContactsStore } from '~/stores/useContactsStore';
import { usePendingActions } from "~/composables/usePendingActions";
import { useWebRTC } from "~/components/webRTC";

const { $push } = useNuxtApp();

useSeoMeta({
  title: "Dashboard - Secure Chat & Video",
  description:
    "Access exclusive content, resources, and services on Bader Idris's platform.",
});

// --- Pinia Stores ---
const socketStore = useSocketStore();
const messagesStore = useMessagesStore();
const onlineUsersStore = useOnlineUsersStore();
const userStore = useUserStore();
// const contactsStore = useContactsStore();
const localePath = useLocalePath();

const isPushSupported = computed(
  () =>
    $push.isCapacitor ||
    (typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window),
);

function subscribeForNotifications() {
  if ($push.isCapacitor) {
    $push.subscribeToCapacitorPush();
  } else {
    $push.subscribeToWebPush();
  }
}

// --- Component State ---
const recipientUserId = ref("");
const message = ref("");
const showNewMessageIndicator = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const contactsPanel = ref<HTMLElement | null>(null);

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
  setupSocketListeners,
  cleanup,
} = useWebRTC();

// --- Lifecycle Hooks ---
onMounted(async () => {
  if (import.meta.client) {
    // Make sure socket is initialized
    socketStore.initializeSocket();

    // Clear any old contacts since we're now showing online users
    messagesStore.clearContacts();

    const pendingAction = await getAndClearPendingAction();
    if (
      pendingAction &&
      pendingAction.action === "open_chat" &&
      pendingAction.fromUserId
    ) {
      console.log("Handling pending action:", pendingAction);
      startChatWith(pendingAction.fromUserId);
    }
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    cleanup();
  }
});

// --- Pending Actions ---
const { getAndClearPendingAction } = usePendingActions();

// --- Watchers ---
watch(recipientUserId, (newRecipientId) => {
  if (newRecipientId && userStore.isAuthenticated) {
    messagesStore.setLoading(true);
    messagesStore.page = 1;
    socketStore.fetchMessageHistory(
      newRecipientId,
      messagesStore.page,
      messagesStore.limit,
    );
  }
});

watch(
  () => messagesStore.getMessagesForRecipient(recipientUserId.value),
  (messages, oldMessages) => {
    if (!messages || !oldMessages || messages.length <= oldMessages.length)
      return;

    const container = chatContainer.value;
    if (!container) return;

    const isScrolledToBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 100;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.from === userStore.user.userId) {
      scrollToBottom();
    } else {
      if (isScrolledToBottom) {
        scrollToBottom();
      } else {
        showNewMessageIndicator.value = false;
      }
    }
  },
  { deep: true },
);

// --- Methods ---
function sendPrivateMessage() {
  if (userStore.isGuest) return;
  if (recipientUserId.value && message.value.trim()) {
    socketStore.sendPrivateMessage(recipientUserId.value, message.value.trim());
    message.value = "";
    nextTick(() => scrollToBottom());
  }
}

function startChatWith(userId: string) {
  if (userStore.isGuest) {
    return;
  }
  if (isInCall.value) {
    alert("You cannot start a new chat while in a call.");
    return;
  }
  // Check if the user is still online before starting chat
  const isUserOnline = onlineUsersStore.users.some(
    (user) => user.userId === userId,
  );
  if (!isUserOnline && userId !== socketStore.currentUser?.userId) {
    alert("This user is no longer online.");
    return;
  }
  recipientUserId.value = userId;
}

const handleScroll = () => {
  const container = chatContainer.value;
  if (!container) return;

  if (
    container.scrollTop === 0 &&
    !messagesStore.isLoading &&
    !messagesStore.isEndOfHistory(recipientUserId.value)
  ) {
    messagesStore.setLoading(true);
    messagesStore.incrementPage();
    socketStore.fetchMessageHistory(
      recipientUserId.value,
      messagesStore.page,
      messagesStore.limit,
    );
  }

  if (
    container.scrollHeight - container.scrollTop <=
    container.clientHeight + 1
  ) {
    showNewMessageIndicator.value = false;
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
  if (!userId) return "Unknown";

  // First check if it's the current user
  if (userId === socketStore.currentUser?.userId) {
    return socketStore.currentUser?.name || "You";
  }

  // Then check online users
  const onlineUser = onlineUsersStore.users.find((u) => u.userId === userId);
  if (onlineUser) {
    return onlineUser.name;
  }

  // If not found in online users, try to get from contacts (for users you've chatted with)
  const contact = messagesStore.contacts.find((c) => c.userId === userId);
  if (contact) {
    return contact.name;
  }

  return "Unknown User";
};

const getRecipientName = () => getUserName(recipientUserId.value);

const formatTimestamp = (timestamp: string | number | Date) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>

<style lang="scss" scoped>
.dashboard {
  @include flex-container(column, nowrap, unset, unset);
  padding: 1rem;
  gap: 1rem;

  @include mobile {
    height: calc($full-viewport-height - 90px);
  }
  @include tablet-to-up {
    height: calc($full-viewport-height - 180px);
  }
}

.connection-status-bar {
  padding: 0.5rem 1rem;
  background-color: #f0f0f0;
  border-radius: 8px;
  p {
    margin: 0.2rem 0;
  }
  .error {
    color: #d32f2f;
  }
  .info {
    color: #666;
  }
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 280px 1fr; /* Sidebar and main content */
  gap: 1rem;
  flex-grow: 1;
  overflow: hidden;
  @include mobile {
    display: flex;
    flex-direction: column;
  }
}

.online-users-panel {
  background-color: #f7f9fc;
  border-radius: 8px;
  padding: 1rem;
  overflow-y: auto;
  h3 {
    margin-top: 0;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  @include mobile {
    min-height: 120px;
    overflow-y: scroll;
    margin: 20px 0;
    ul {
      margin: 10px 0;
    }
  }
}

.user-item {
  @include flex-container(row, nowrap, space-between, center);
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background-color: #e9eef5;
  }
  &.active-chat {
    background-color: #d1e0f3;
  }
  &.disabled {
    cursor: not-allowed;
    opacity: 0.7;
    &:hover {
      background-color: #f7f9fc;
    }
  }
  .user-name {
    font-weight: 500;
  }
  .user-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    margin-left: 8px;
    &.online {
      background-color: #4caf50;
    }
    &.offline {
      background-color: #999;
    }
  }
  .call-btn,
  .video-call-btn {
    background: none;
    border: none;
    cursor: pointer;
  }
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
  @include flex-container(column, nowrap, center, center);
  height: 100%;
  color: #888;
  font-size: 1.2rem;
  text-align: center;
  p {
    margin-top: 1rem;
  }
  .guest-placeholder {
    a {
      color: #3498db;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.chat-panel {
  @include flex-container(column, nowrap, unset, unset);
  height: 100%;
}

.chat-header {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9f9f9;
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
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
  &.sent {
    align-self: flex-end;
    .message-content {
      background-color: #dcf8c6;
    }
  }
  &.received {
    align-self: flex-start;
    .message-content {
      background-color: #f1f1f1;
    }
  }
  .message-content {
    padding: 0.5rem 0.75rem;
    border-radius: 12px;
  }
  .message-timestamp {
    font-size: 0.75rem;
    color: #999;
    margin-top: 4px;
  }
}

.chat-input-form {
  display: flex;
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
  gap: 0.5rem;
  input {
    flex-grow: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 6px;
  }
}

.new-message-indicator {
  position: absolute;
  bottom: 4.5rem; // Adjust to be above the input form
  left: 50%;
  transform: translateX(-50%);
  background-color: #3498db;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: opacity 0.3s;
}

/* Video Call Styles */
.video-call-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #121212;
  z-index: z("content");
  @include flex-container(column, nowrap, unset, unset);
}
.video-grid {
  flex: 1;
  position: relative;
}
.remote-video-container {
  width: 100%;
  height: 100%;
}
.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.local-video-container {
  position: absolute;
  width: 25%;
  max-width: 200px;
  bottom: 80px; /* Above controls */
  right: 20px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid white;
}
.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.call-controls {
  @include flex-container(row, nowrap, center, unset);
  gap: 1rem;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
  bottom: 0;
  width: 100%;
}
.control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #333;
  color: white;
  border: none;
  cursor: pointer;
  &.end-call {
    background-color: #e53935;
  }
}

.notifications-btn {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>