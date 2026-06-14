<template>
  <div class="dashboard">
    <!-- Main Content Grid -->
    <ClientOnly>
      <div class="dashboard-grid">
        <!-- Online Users List -->
        <div ref="contactsPanel" class="online-users-panel" data-clarity-mask="true">
          <!-- Foldable Connection Status Bar -->
          <ConnectionStatusBar 
            v-model="isStatusFolded"
            :is-connected="socketStore.isConnected"
            :is-connecting="socketStore.isConnecting"
            :connection-error="socketStore.connectionError"
            :transport="socketStore.transport"
            :current-user="socketStore.currentUser"
            :user-role="userStore.getUserRole"
            :is-push-supported="isPushSupported"
            @subscribe-notifications="subscribeForNotifications"
          />

          <h3>{{ $t('dashboard.online_users') }} <template v-if="!userStore.isGuest">({{ onlineUsersStore.users.length }})</template><template v-else>(<Icon name="ion:locked" width="12" height="12" mode="svg" />)</template></h3>
          
          <!-- Shared Chat Contacts Search Bar -->
          <ContactSearchBar 
            v-if="!userStore.isGuest"
            :contacts="messagesStore.contacts"
            @select="startChatWith"
          />

          <div v-if="userStore.isGuest" class="guest-view-prompt">
            <i18n-t keypath="dashboard.guest_view_users" scope="global">
              <template #link>
                <NuxtLink :to="localePath('/login')">{{ $t('dashboard.guest_view_link') }}</NuxtLink>
              </template>
            </i18n-t>
          </div>
          <div v-else-if="onlineUsersStore.users.length === 0" class="no-users">
            {{ $t('dashboard.no_users') }}
          </div>
          <ul>
            <!-- this needs to add offline users with gray circle -->
            <OnlineUserItem 
              v-for="user in onlineUsersStore.users"
              :key="user.userId"
              :user="user"
              :is-active="recipientUserId === user.userId"
              :is-me="user.userId === socketStore.currentUser?.userId"
              :is-guest="userStore.isGuest"
              :is-in-call="isInCall"
              @start-chat="startChatWith"
              @audio-call="initiateCall($event, 'audio')"
              @video-call="initiateCall($event, 'video')"
            />
          </ul>

          <!-- User Settings Section -->
          <UserSettingsSection 
            v-if="!userStore.isGuest"
            v-model="isSettingsFolded"
            :user-settings="userStore.user?.settings"
            @update-settings="userStore.updateUserSettings"
          />
        </div>

        <!-- Chat and Video Area -->
        <div class="chat-video-area">
          <!-- Video Call UI (Overlay Layer) -->
          <VideoCallOverlay 
            ref="videoOverlayRef"
            :is-in-call="isInCall"
            :is-call-minimized="isCallMinimized"
            :partner-name="getUserName(currentCallPartner)"
            :call-type="callType"
            :call-status="callStatus"
            :is-muted="isMuted"
            :is-video-off="isVideoOff"
            :is-switching-camera="isSwitchingCamera"
            :is-cleaning-up="isCleaningUp"
            :is-fullscreen="isFullscreen"
            :remote-stream="remoteStream"
            @toggle-minimize="isCallMinimized = !isCallMinimized"
            @toggle-mute="toggleMute"
            @toggle-video="toggleVideo"
            @switch-camera="switchCamera"
            @toggle-fullscreen="toggleFullscreen"
            @end-call="endCall"
          />

          <!-- Incoming Call Permission Custom Modal (Overlay) -->
          <IncomingCallModal 
            :show="callStatus === 'ringing' && !isInCall"
            :call-type="callType"
            :partner-name="getUserName(currentCallPartner)"
            @accept="acceptIncomingCall(currentCallOffer!)"
            @decline="declineIncomingCall"
          />

          <!-- Chat UI (Base Layer) -->
          <div
            v-if="recipientUserId && !userStore.isGuest"
            class="chat-panel"
          >
            <ChatHeader 
              :recipient-name="getRecipientName()"
              :recipient-avatar="getRecipientAvatar()"
              :recipient-avatar-hash="getRecipientAvatarHash()"
              @audio-call="initiateCall(recipientUserId, 'audio')"
              @video-call="initiateCall(recipientUserId, 'video')"
            />
            <ChatMessagesContainer 
              ref="chatContainer"
              :messages="messagesStore.getMessagesForRecipient(recipientUserId)"
              :is-loading="messagesStore.isLoading"
              :current-user-id="userStore.getUserId"
              :show-names="userStore.user?.settings?.showOldConversationTitles"
              :is-mobile="isMobile"
              @message-context="onMessageContext"
              @load-more="handleLoadMore"
              @scroll-bottom-reached="showNewMessageIndicator = false"
            />
            
            <div
              v-if="showNewMessageIndicator"
              class="new-message-indicator"
              @click="scrollToBottom"
            >
              <Icon name="mdi:arrow-down" />
            </div>

            <ChatInputArea 
              ref="chatInputRef"
              @send="onSendMessage"
            />

            <!-- Custom Context Menu -->
            <ContextMenu
              :show="contextMenu.show"
              :x="contextMenu.x"
              :y="contextMenu.y"
              @close="contextMenu.show = false"
            >
              <button @click="copyMessage(contextMenu.msg)">
                <Icon name="mdi:content-copy" /> Copy
              </button>
              <button @click="replyToMessage(contextMenu.msg)">
                <Icon name="mdi:reply" /> Reply
              </button>
              <button
                v-if="contextMenu.msg?.from === userStore.getUserId"
                class="delete"
                @click="deleteMessage(contextMenu.msg)"
              >
                <Icon name="mdi:delete" /> Delete
              </button>
            </ContextMenu>
          </div>
          <div v-else class="chat-placeholder">
            <div v-if="userStore.isGuest" class="guest-placeholder">
              <Icon name="ion:locked" width="50" height="50" mode="svg" />
              <p>
                <i18n-t keypath="dashboard.guest_placeholder.message" scope="global">
                  <template #link>
                    <NuxtLink :to="localePath('/login')">{{ $t('dashboard.guest_placeholder.link_text') }}</NuxtLink>
                  </template>
                </i18n-t>
              </p>
            </div>
            <p v-else>{{ $t('dashboard.select_user') }}</p>
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
import { gsap } from "gsap";
import { Draggable } from "gsap/all";
import { useToggle } from "@vueuse/core";

const { getAndClearPendingAction } = usePendingActions();
const isMobile = useMobile();

if (import.meta.client) {
  gsap.registerPlugin(Draggable);
}

const { $push } = useNuxtApp();

// --- Pinia Stores ---
const socketStore = useSocketStore();
const messagesStore = useMessagesStore();
const onlineUsersStore = useOnlineUsersStore();
const userStore = useUserStore();
const localePath = useLocalePath();
const { t } = useI18n();

import ContactSearchBar from "~/components/ContactSearchBar.vue";
import ConnectionStatusBar from "~/components/dashboard/ConnectionStatusBar.vue";
import UserSettingsSection from "~/components/dashboard/UserSettingsSection.vue";
import OnlineUserItem from "~/components/dashboard/OnlineUserItem.vue";
import IncomingCallModal from "~/components/dashboard/IncomingCallModal.vue";
import VideoCallOverlay from "~/components/dashboard/VideoCallOverlay.vue";
import ChatHeader from "~/components/dashboard/ChatHeader.vue";
import ChatMessagesContainer from "~/components/dashboard/ChatMessagesContainer.vue";
import ChatInputArea from "~/components/dashboard/ChatInputArea.vue";

const fullPathWithLocale = localePath(useRoute().path);

if (import.meta.server) {
  useSeoMeta({
    title: t("dashboard.title"),
    description: t("dashboard.description"),
    ogUrl: fullPathWithLocale,
  });

  defineOgImage("Default.takumi", {
    title: t("dashboard.title"),
    description: t("dashboard.description"),
  });

  useSchemaOrg([
    defineWebPage({
      name: "Dashboard",
      description: "Access exclusive content, resources, and services.",
    })
  ]);
}

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
// this has an issue with onMounted, it starts unfolded even with true as folder!
const [isStatusFolded, toggleStatusFolded] = useToggle(true);
const [isSettingsFolded, toggleSettingsFolded] = useToggle(true);
const isClient = import.meta.client;
const chatInputRef = ref(null);

const chatContainer = ref<HTMLElement | null>(null);
const contactsPanel = ref<HTMLElement | null>(null);

// --- WebRTC Composables ---
const {
  localStream,
  remoteStream,
  currentCallPartner,
  callStatus,
  callType,
  incomingOffer,
  initiateCall: rawInitiateCall,
  acceptIncomingCall: rawAcceptIncomingCall,
  declineIncomingCall,
  endCall,
  isInCall,
  isMuted,
  isVideoOff,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  toggleMute,
  toggleVideo,
  switchCamera,
  isSwitchingCamera,
  isCleaningUp,
  setupSocketListeners,
  cleanup,
} = useWebRTC();

const currentCallOffer = ref<RTCSessionDescriptionInit | null>(null);
const isAnimatingSwap = ref(false);

// --- Permission Handling ---
async function checkAndRequestPermissions() {
  if (!import.meta.client) return true;
  
  try {
    // Check if permissions were previously denied
    const micStatus = await navigator.permissions.query({ name: 'microphone' as any });
    const camStatus = await navigator.permissions.query({ name: 'camera' as any });
    
    if (micStatus.state === 'denied' || camStatus.state === 'denied') {
      const { toast } = await import("vue3-toastify");
      toast.info("Media permissions are currently denied. We'll try to ask again.", {
        position: "top-center",
        theme: "dark",
      });
    }
    
    // Forcefully attempt to get media to trigger the browser prompt
    // This is the best way to "re-ask" if the state is not "denied" (i.e. it was cleared or is prompt)
    // If it's "denied", this will throw, and we can guide the user.
    return true;
  } catch (e) {
    console.warn("Permission API not supported or error checking:", e);
    return true;
  }
}

async function initiateCall(userId: string, type: 'audio' | 'video') {
  const allowed = await checkAndRequestPermissions();
  if (allowed) {
    try {
      await rawInitiateCall(userId, type);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const { toast } = await import("vue3-toastify");
        toast.error("Permissions denied. Please enable camera/microphone in your browser settings to call.", {
          position: "top-center",
          theme: "dark",
        });
      }
    }
  }
}

async function acceptIncomingCall(offer: RTCSessionDescriptionInit) {
  const allowed = await checkAndRequestPermissions();
  if (allowed) {
    try {
      await rawAcceptIncomingCall(offer);
    } catch (err: any) {
       if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const { toast } = await import("vue3-toastify");
        toast.error("Permissions denied. Please enable camera/microphone to accept the call.", {
          position: "top-center",
          theme: "dark",
        });
      }
    }
  }
}

watch(incomingOffer, (offer) => {
  if (offer) {
    currentCallOffer.value = offer;
  }
});

const isFullscreen = ref(false);

// Watcher to periodically check for black camera (videoWidth/Height being 0)
let blackCameraCheckInterval: any = null;
watch(localStream, (stream) => {
  if (stream && import.meta.client) {
    if (blackCameraCheckInterval) clearInterval(blackCameraCheckInterval);
    blackCameraCheckInterval = setInterval(() => {
      if (localVideoRef.value && localVideoRef.value.srcObject && (localVideoRef.value.videoWidth === 0 || localVideoRef.value.paused)) {
        console.warn("Detected potential black camera or paused stream, re-triggering...");
        localVideoRef.value.play().catch(() => {});
      }
    }, 2000);
  } else {
    if (blackCameraCheckInterval) clearInterval(blackCameraCheckInterval);
  }
});

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  if (!import.meta.client) return;

  const container = document.querySelector(".video-call-overlay");
  if (!container) return;

  if (isFullscreen.value) {
    if (container.requestFullscreen) {
      container.requestFullscreen().catch((err) => {
        console.warn("Failed to enter browser fullscreen:", err);
      });
    }
  } else {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.warn("Failed to exit browser fullscreen:", err);
      });
    }
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  msg: null as any
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  if (!import.meta.client) return;
  try {
    // Make sure socket is initialized
    socketStore.initializeSocket();
    setupSocketListeners();

    // Notify server that we are on dashboard
    socketStore.socket?.emit("enter-page", "dashboard");

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
        
        if (userStore.user?.settings?.openLastChat && response.user.lastActiveChat) {
          startChatWith(response.user.lastActiveChat);
        }
      }
    } catch (e) {
      console.error("Failed to fetch user profile:", e);
    }

    // Clear any old contacts since we're now showing online users
    // Actually, we want to fetch contacts from history now
    messagesStore.clearContacts();
    messagesStore.fetchContacts();

    const pendingAction = await getAndClearPendingAction();
    if (
      pendingAction &&
      pendingAction.action === "open_chat" &&
      pendingAction.fromUserId
    ) {
      startChatWith(pendingAction.fromUserId);
    }

    // Call fingerprint listener
    socketStore.socket?.on("call-fingerprint", (data: any) => {
      // We now receive standardized messages like [CALL_FP]:{...}
      // The template handles localized rendering automatically.
      messagesStore.addMessage({
        id: data.id,
        from: data.from,
        fromName: data.fromName,
        to: userStore.getUserId,
        message: data.message,
        timestamp: data.timestamp,
        fromSocketId: '',
        toSocketId: ''
      });
      nextTick(() => scrollToBottom());
    });

    window.addEventListener('click', closeContextMenu);
    document.addEventListener("fullscreenchange", onFullscreenChange);
  } catch (err) {
    console.error("Error in dashboard mounted hook:", err);
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    // Notify server that we left dashboard
    socketStore.socket?.emit("leave-page", "dashboard");

    cleanup();
    window.removeEventListener('click', closeContextMenu);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
  }
});

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
  { deep: true, flush: 'post' },
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
    if (import.meta.client) {
      import("vue3-toastify").then(({ toast }) => {
        toast.warning("You cannot start a new chat while in a call.", {
          position: "top-center",
          theme: "dark",
        });
      });
    }
    return;
  }
  
  recipientUserId.value = userId;
  socketStore.socket?.emit("update-active-chat", userId);
}

const handleLoadMore = () => {
  if (
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
};

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

const getRecipientAvatar = () => {
  const contact = messagesStore.contacts.find((c) => c.userId === recipientUserId.value);
  if (contact) return contact.avatar;
  const onlineUser = onlineUsersStore.users.find((u) => u.userId === recipientUserId.value);
  if (onlineUser) return onlineUser.avatar;
  return null;
};

const getRecipientAvatarHash = () => {
  const contact = messagesStore.contacts.find((c) => c.userId === recipientUserId.value);
  if (contact) return contact.avatarHash;
  const onlineUser = onlineUsersStore.users.find((u) => u.userId === recipientUserId.value);
  if (onlineUser) return onlineUser.avatarHash;
  return null;
};

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

const { formatDateSeparator: formatDateGeneric } = useDateFormatter();

// ... existing logic ...

// Renamed to avoid collision with composable
function formatDateRelative(timestamp: string | number | Date) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t('dashboard.date.today');
  if (date.toDateString() === yesterday.toDateString()) return t('dashboard.date.yesterday');
  return formatDateGeneric(timestamp);
}


function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
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

.dashboard-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
  flex-grow: 1;
  overflow: hidden;
  @include mobile {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    min-height: 0;
  }
}

.online-users-panel {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 15px;
  border: 1px solid var(--lines-color);
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @include mobile {
    max-height: 35%;
    flex-shrink: 0;
  }

  h3 { 
    color: var(--text-primary); 
    font-size: 1.1rem; 
    margin-bottom: 15px; 
    border-bottom: 1px solid var(--lines-color); 
    padding-bottom: 10px; 
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  ul { 
    list-style: none; 
    padding: 0; 
    margin: 0; 
    flex-grow: 1;
    overflow-y: auto;
  }
}

.chat-video-area {
  @include flex-container(column, nowrap, unset, unset);
  background-color: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--lines-color);
  overflow: hidden;
  position: relative;

  @include mobile {
    flex: 1;
    min-height: 0;
  }

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("/imgs/patterns/cubes.png");
    opacity: 0.05;
    pointer-events: none;
    z-index: 0;
  }
}

.chat-panel {
  @include flex-container(column, nowrap, unset, unset);
  height: 100%;
  position: relative;
  z-index: 1;
}

.chat-placeholder {
  flex-grow: 1;
  @include flex-container(column, nowrap, center, center);
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  height: 100%;

  > p {
    font-size: 1.1rem;
    max-width: 400px;
    line-height: 1.5;
    animation: fadeIn 0.5s ease-out;
  }
}

.guest-placeholder {
  @include flex-container(column, nowrap, center, center);
  gap: 1.5rem;
  background-color: var(--bg-secondary);
  padding: 3rem 2rem;
  border-radius: 20px;
  border: 1px solid var(--lines-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
  animation: slideUp 0.4s ease-out;

  svg {
    color: var(--accent-primary);
    filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.1));
  }

  p {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
    line-height: 1.6;

    a {
      color: var(--accent-primary);
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--accent-primary);
        transform: scaleX(0);
        transition: transform 0.2s ease;
      }

      &:hover::after {
        transform: scaleX(1);
      }
    }
  }

  @include mobile {
    padding: 2rem 1.5rem;
    gap: 1rem;
    width: 95%;
  }
}

.no-users {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}

.new-message-indicator {
  position: absolute;
  bottom: 120px;
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
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
  40% {transform: translateY(-10px);}
  60% {transform: translateY(-5px);}
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
</style>