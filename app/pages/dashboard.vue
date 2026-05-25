<template>
  <div class="dashboard">
    <!-- Foldable Connection Status Bar -->
    <aside class="connection-status-bar" :class="{ 'is-folded': isStatusFolded }">
      <div class="status-header" @click="isStatusFolded = !isStatusFolded">
        <ClientOnly>
          <div class="status-indicator">
            <span class="dot" :class="(isMounted && socketStore.isConnected) ? 'online' : 'offline'" />
            <span class="label">Connection Status</span>
          </div>
          <template #fallback>
            <div class="status-indicator">
              <span class="dot offline" />
              <span class="label">Connection Status</span>
            </div>
          </template>
        </ClientOnly>
        <Icon :name="isStatusFolded ? 'material-symbols:expand-more' : 'material-symbols:expand-less'" />
      </div>
      
      <div v-show="!isStatusFolded" class="status-content">
        <ClientOnly>
          <p v-if="socketStore.connectionError" class="error">
            Error: {{ socketStore.connectionError }}
          </p>
          <p v-else-if="socketStore.isConnecting" class="info">Connecting...</p>
          <div v-else-if="socketStore.isConnected && socketStore.currentUser">
            <p>
              Transport: <span class="highlight">{{ socketStore.transport }}</span>
            </p>
            <p>
              User: <span class="highlight">{{ socketStore.currentUser.name }}</span>
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
        </ClientOnly>
      </div>
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
          <!-- Video Call UI (Overlay Layer) -->
          <Transition name="slide-up">
            <div v-show="isInCall" class="video-call-overlay">
              <div class="call-wrapper">
                <header class="call-header">
                  <div class="call-partner-info">
                    <Icon name="material-symbols:call" class="call-icon" />
                    <span>In call with: {{ getUserName(currentCallPartner) }}</span>
                  </div>
                  <button class="minimize-btn" @click="isCallMinimized = !isCallMinimized">
                    <Icon :name="isCallMinimized ? 'material-symbols:open-in-full' : 'material-symbols:close-fullscreen'" />
                  </button>
                </header>

                <div v-show="!isCallMinimized" class="video-grid">
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

                <div class="call-controls" :class="{ 'minimized': isCallMinimized }">
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
                    />
                  </button>
                  <button class="control-btn end-call" @click="endCall">
                    <Icon name="heroicons:phone-x-mark" />
                  </button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Chat UI (Base Layer) -->
          <div
            v-if="recipientUserId && !userStore.isGuest"
            class="chat-panel"
          >
            <header class="chat-header">
              <div class="user-info-header">
                <div class="avatar-placeholder">{{ getRecipientName().charAt(0) }}</div>
                <div class="user-details">
                  <h2>{{ getRecipientName() }}</h2>
                  <span class="online-status">online</span>
                </div>
              </div>
              <div class="header-actions">
                <button @click="initiateCall(recipientUserId, 'audio')"><Icon name="material-symbols:call" /></button>
                <button @click="initiateCall(recipientUserId, 'video')"><Icon name="material-symbols:video-camera-back" /></button>
              </div>
            </header>
            <div
              ref="chatContainer"
              class="chat-container"
              @scroll="handleScroll"
            >
              <div v-if="messagesStore.isLoading" class="loading-indicator">
                <div class="spinner-small" />
              </div>
              
              <template v-for="(msg, index) in messagesStore.getMessagesForRecipient(recipientUserId)" :key="msg.id">
                <div v-if="shouldShowDateSeparator(messagesStore.getMessagesForRecipient(recipientUserId), index)" class="date-separator">
                  <span>{{ formatDateSeparator(msg.timestamp) }}</span>
                </div>
                
                <ChatMessage
                  :content="msg.message"
                  :sender-name="msg.fromName"
                  :timestamp="formatTimestamp(msg.timestamp)"
                  :is-own="msg.from === userStore.getUserId"
                  @contextmenu.prevent="onMessageContext($event, msg)"
                />
              </template>
            </div>
            
            <div
              v-if="showNewMessageIndicator"
              class="new-message-indicator"
              @click="scrollToBottom"
            >
              <Icon name="material-symbols:arrow-downward" />
            </div>

            <div class="input-area" @click="chatInputRef?.focus()">
              <ChatInput
                ref="chatInputRef"
                placeholder="Message"
                @send="onSendMessage"
              />
            </div>

            <!-- Custom Context Menu -->
            <div v-if="contextMenu.show" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
              <button @click="copyMessage(contextMenu.msg)"><Icon name="material-symbols:content-copy" /> Copy</button>
              <button @click="replyToMessage(contextMenu.msg)"><Icon name="material-symbols:reply" /> Reply</button>
              <button v-if="contextMenu.msg.from === userStore.getUserId" class="delete" @click="deleteMessage(contextMenu.msg)"><Icon name="material-symbols:delete" /> Delete</button>
            </div>
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
const showNewMessageIndicator = ref(false);
const isCallMinimized = ref(false);
const isStatusFolded = ref(true);
const isMounted = ref(false);
const chatInputRef = ref(null);

const chatContainer = ref<HTMLElement | null>(null);
const contactsPanel = ref<HTMLElement | null>(null);

const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  msg: null as any
});

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
  cleanup,
} = useWebRTC();

// --- Lifecycle Hooks ---
onMounted(async () => {
  isMounted.value = true;
  if (import.meta.client) {
    // Make sure socket is initialized
    socketStore.initializeSocket();

    // Fetch latest user info to get lastActiveChat
    try {
      const response = await $fetch<{ user: any }>("/api/v1/auth/me");
      if (response.user) {
        // Correctly update the store user state
        userStore.setUser({
          ...userStore.user,
          ...response.user,
          username: response.user.name,
        });
        
        if (response.user.lastActiveChat) {
          startChatWith(response.user.lastActiveChat);
        }
      }
    } catch (e) {
      console.error("Failed to fetch user profile:", e);
    }

    // Clear any old contacts since we're now showing online users
    messagesStore.clearContacts();

    const pendingAction = await getAndClearPendingAction();
    if (
      pendingAction &&
      pendingAction.action === "open_chat" &&
      pendingAction.fromUserId
    ) {
      startChatWith(pendingAction.fromUserId);
    }

    window.addEventListener('click', closeContextMenu);
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    cleanup();
    window.removeEventListener('click', closeContextMenu);
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
    if (!lastMessage || !lastMessage.from) return;

    if (lastMessage.from === userStore.getUserId) {
      scrollToBottom();
    } else {
      if (isScrolledToBottom) {
        scrollToBottom();
      } else {
        showNewMessageIndicator.value = true;
      }
    }
  },
  { deep: true },
);

// --- Methods ---
function onSendMessage(html: string) {
  if (userStore.isGuest) return;
  if (recipientUserId.value && html.trim()) {
    socketStore.sendPrivateMessage(recipientUserId.value, html.trim());
    nextTick(() => scrollToBottom());
  }
}

function startChatWith(userId: string) {
  if (userStore.isGuest) return;
  if (isInCall.value) {
    alert("You cannot start a new chat while in a call.");
    return;
  }
  
  recipientUserId.value = userId;
  socketStore.socket?.emit("update-active-chat", userId);
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

function onMessageContext(event: MouseEvent, msg: any) {
  contextMenu.show = true;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.msg = msg;
}

function closeContextMenu() {
  contextMenu.show = false;
}

async function copyMessage(msg: any) {
  try {
    const text = msg.message.replace(/<[^>]*>/g, ''); // Simple strip HTML
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy message:', err);
  }
}

function replyToMessage(msg: any) {
  // Logic to handle reply - can be enhanced to show a "replying to" preview
  console.log('Replying to:', msg.id);
}

function deleteMessage(msg: any) {
  // Logic to handle delete
  console.log('Deleting:', msg.id);
}

// --- Helpers ---
const getUserName = (userId: string | null) => {
  if (!userId) return "Unknown";
  if (userId === userStore.getUserId) return userStore.getUsername || "You";
  const onlineUser = onlineUsersStore.users.find((u) => u.userId === userId);
  if (onlineUser) return onlineUser.name;
  const contact = messagesStore.contacts.find((c) => c.userId === userId);
  if (contact) return contact.name;
  return "Unknown User";
};

const getRecipientName = () => getUserName(recipientUserId.value);

const formatTimestamp = (timestamp: string | number | Date) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function shouldShowDateSeparator(messages: any[], index: number) {
  if (index === 0) return true;
  const currentMsgDate = new Date(messages[index].timestamp).toDateString();
  const prevMsgDate = new Date(messages[index - 1].timestamp).toDateString();
  return currentMsgDate !== prevMsgDate;
}

function formatDateSeparator(timestamp: string | number | Date) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}
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
  min-height: 30px;
  padding: 0;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--lines-color);
  overflow: hidden;
  transition: all 0.3s ease;
  width: fit-content;
  max-width: 300px;

  &.is-folded {
    border-color: transparent;
    background: transparent;
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
    height: 310px;
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

.dashboard-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
  flex-grow: 1;
  overflow: hidden;
  @include mobile {
    display: flex;
    flex-direction: column;
  }
}

.online-users-panel {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 15px;
  border: 1px solid var(--lines-color);
  overflow-y: auto;
  h3 { color: var(--text-primary); font-size: 1.1rem; margin-bottom: 15px; border-bottom: 1px solid var(--lines-color); padding-bottom: 10px; }
  ul { list-style: none; padding: 0; margin: 0; }
}

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
  &.disabled { opacity: 0.6; cursor: not-allowed; }

  .user-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
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
    }
  }
}

.chat-video-area {
  @include flex-container(column, nowrap, unset, unset);
  background-color: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--lines-color);
  overflow: hidden;
  position: relative;
  background-image: url("https://www.transparenttextures.com/patterns/cubes.png");
  background-blend-mode: overlay;
}

.chat-panel {
  @include flex-container(column, nowrap, unset, unset);
  height: 100%;
}

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

.chat-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
}

.date-separator {
  display: flex;
  justify-content: center;
  margin: 15px 0;
  span { background: rgba(0, 0, 0, 0.2); color: white; padding: 4px 12px; border-radius: 15px; font-size: 0.75rem; backdrop-filter: blur(4px); }
}

.input-area { padding: 10px 20px 20px; }

.new-message-indicator {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: var(--bg-secondary);
  color: var(--accent-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border: 1px solid var(--lines-color);
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--lines-color);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  z-index: 1000;
  padding: 5px;
  min-width: 120px;

  button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 4px;
    font-size: 0.9rem;
    text-align: left;

    &:hover { background: var(--bg-primary-hovered); }
    &.delete { color: var(--accent-error); }
  }
}

/* Video Call Overlay Layered Approach */
.video-call-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);

  .call-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; }
  .call-header {
    padding: 15px 20px;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;
    .call-partner-info { display: flex; align-items: center; gap: 10px; .call-icon { color: #4caf50; animation: pulse 2s infinite; } }
    .minimize-btn { background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; }
  }

  .video-grid { flex: 1; position: relative; background: #000; }
  .remote-video-container { width: 100%; height: 100%; .remote-video { width: 100%; height: 100%; object-fit: cover; } }
  .local-video-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 150px;
    aspect-ratio: 16/9;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.3);
    .local-video { width: 100%; height: 100%; object-fit: cover; }
  }

  .call-controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.6);
    &.minimized {
      position: fixed;
      top: 80px;
      right: 20px;
      border-radius: 30px;
      padding: 10px 15px;
      flex-direction: column;
      width: auto;
      background: var(--bg-secondary);
      border: 1px solid var(--lines-color);
      z-index: 101;
      .control-btn { width: 40px; height: 40px; }
    }
    .control-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      &:hover { background: rgba(255, 255, 255, 0.2); }
      &.active { background: var(--accent-error); }
      &.end-call { background: #ff3b30; }
    }
  }
}

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent-secondary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.notifications-btn {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--lines-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
}
</style>
