<template>
  <div class="dashboard">
    <!-- Main Content Grid -->
    <ClientOnly>
      <div class="dashboard-grid">
        <!-- Online Users List -->
        <div ref="contactsPanel" class="online-users-panel" data-clarity-mask="true">
          <!-- Foldable Connection Status Bar -->
          <aside class="connection-status-bar" :class="{ 'is-folded': isStatusFolded }">
            <div class="status-header" @click="toggleStatusFolded()">
              <div class="status-indicator">
                <span class="dot" :class="(isClient && socketStore.isConnected) ? 'online' : 'offline'" />
                <span class="label">{{ $t('dashboard.connection_status') }}</span>
              </div>
              <Icon :name="isStatusFolded ? 'material-symbols:expand-more' : 'material-symbols:expand-less'" />
            </div>
            
            <div ref="statusContentRef" class="status-content">
              <p v-if="socketStore.connectionError" class="error">
                Error: {{ socketStore.connectionError }}
              </p>
              <p v-else-if="socketStore.isConnecting" class="info">{{ $t('dashboard.connecting') }}</p>
              <div v-else-if="socketStore.isConnected && socketStore.currentUser">
                <p>
                  {{ $t('dashboard.transport') }}: <span class="highlight">{{ socketStore.transport }}</span>
                </p>
                <p>
                  {{ $t('dashboard.user') }}: <span class="highlight">{{ socketStore.currentUser.name }} ({{ userStore.getUserRole }})</span>
                </p>
                <button
                  v-if="isPushSupported"
                  class="notifications-btn"
                  @click="subscribeForNotifications"
                >
                  {{ $t('dashboard.enable_notifications') }}
                </button>
              </div>
              <p v-else class="info">{{ $t('dashboard.disconnected') }}</p>
            </div>
          </aside>

          <h3>{{ $t('dashboard.online_users') }} <template v-if="!userStore.isGuest">({{ onlineUsersStore.users.length }})</template><template v-else>(<Icon name="ion:locked" width="12" height="12" mode="svg" />)</template></h3>
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
                    height="16"
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

          <!-- User Settings Section -->
          <div v-if="!userStore.isGuest" class="user-settings-section" :class="{ 'is-folded': isSettingsFolded }">
            <header class="settings-header" @click="toggleSettingsFolded()">
              <h4><Icon name="material-symbols:settings" /> Settings</h4>
              <Icon :name="isSettingsFolded ? 'material-symbols:expand-more' : 'material-symbols:expand-less'" />
            </header>
            <div ref="settingsContentRef" class="settings-content">
              <div class="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    :checked="userStore.user?.settings?.openLastChat" 
                    @change="userStore.updateUserSettings({ openLastChat: ($event.target as HTMLInputElement).checked })"
                  />
                  Open last active chat
                </label>
              </div>
              <div class="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    :checked="userStore.user?.settings?.showOldConversationTitles" 
                    @change="userStore.updateUserSettings({ showOldConversationTitles: ($event.target as HTMLInputElement).checked })"
                  />
                  Show user names in history
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat and Video Area -->
        <div class="chat-video-area">
          <!-- Video Call UI (Overlay Layer) -->
          <Transition name="slide-up">
            <div v-show="isInCall" class="video-call-overlay" :class="{ 'is-fullscreen': isFullscreen }">
              <div class="call-wrapper">
                <header class="call-header" data-clarity-mask="true">
                  <div class="call-partner-info">
                    <Icon name="material-symbols:call" class="call-icon" />
                    <span>{{ $t('dashboard.in_call_with') }}: {{ getUserName(currentCallPartner) }}</span>
                  </div>
                  <button class="minimize-btn" @click="isCallMinimized = !isCallMinimized">
                    <Icon :name="isCallMinimized ? 'material-symbols:open-in-full' : 'material-symbols:close-fullscreen'" />
                  </button>
                </header>

                <div v-show="!isCallMinimized" class="video-grid" :class="{ 'audio-only-grid': callType === 'audio', 'videos-swapped': isVideosSwapped }">
                  <template v-if="callType === 'video'">
                    <div class="remote-video-container">
                      <video
                        ref="remoteVideoRef"
                        autoplay
                        playsinline
                        class="remote-video"
                      />
                      <div v-if="!remoteStream" class="connecting-overlay">
                        <span>{{ $t('dashboard.call_connecting') }}</span>
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
                        @loadedmetadata="onLocalVideoLoaded"
                      />
                      <!-- Resize Handle for PiP -->
                      <div class="resize-handle">
                        <Icon name="material-symbols:drag-pan" />
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <!-- Premium Audio Calling Layout -->
                    <div class="audio-call-container" data-clarity-mask="true">
                      <audio ref="remoteAudioRef" autoplay playsinline style="display: none;"></audio>
                      <div class="audio-avatar-wrapper">
                        <div class="avatar-large-glow">
                          {{ getUserName(currentCallPartner)?.charAt(0) || '?' }}
                        </div>
                        <div class="pulse-ring ring-1"></div>
                        <div class="pulse-ring ring-2"></div>
                        <div class="pulse-ring ring-3"></div>
                      </div>
                      <div class="audio-call-info">
                        <h3>{{ getUserName(currentCallPartner) }}</h3>
                        <p class="audio-status">
                          <span v-if="callStatus === 'connecting' || !remoteStream">{{ $t('dashboard.call_connecting') }}</span>
                          <span v-else-if="callStatus === 'ringing'">Ringing...</span>
                          <span v-else-if="callStatus === 'connected'" class="voice-active">Voice Connected</span>
                          <span v-else>{{ callStatus }}</span>
                        </p>
                      </div>
                      
                      <!-- Wave visualizer micro-animation -->
                      <div class="audio-waves" :class="{ 'animating': callStatus === 'connected' }">
                        <span class="bar bar-1"></span>
                        <span class="bar bar-2"></span>
                        <span class="bar bar-3"></span>
                        <span class="bar bar-4"></span>
                        <span class="bar bar-5"></span>
                      </div>
                    </div>
                  </template>
                </div>

                <div class="call-controls" :class="{ 'minimized': isCallMinimized }">
                  <button
                    class="control-btn"
                    :class="{ active: isMuted }"
                    :disabled="isSwitchingCamera || isAnimatingSwap || isCleaningUp"
                    @click="toggleMute"
                  >
                    <Icon
                      :name="
                        isMuted
                          ? 'mdi-light:microphone-off'
                          : 'heroicons:microphone'
                      "
                    />
                  </button>
                  <button
                    v-if="callType === 'video'"
                    class="control-btn"
                    :class="{ active: isVideoOff }"
                    :disabled="isSwitchingCamera || isAnimatingSwap || isCleaningUp"
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

                  <!-- Camera Flip Button with Loading State -->
                  <button
                    v-if="callType === 'video' && !isVideoOff"
                    class="control-btn"
                    :disabled="isSwitchingCamera || isAnimatingSwap || isCleaningUp"
                    @click="switchCamera"
                  >
                    <div v-if="isSwitchingCamera" class="spinner-small" />
                    <Icon v-else name="mdi:camera-flip" />
                  </button>

                  <!-- Fullscreen Button -->
                  <button
                    class="control-btn fullscreen-btn"
                    :class="{ active: isFullscreen }"
                    :disabled="isSwitchingCamera || isAnimatingSwap || isCleaningUp"
                    @click="toggleFullscreen"
                  >
                    <Icon :name="isFullscreen ? 'material-symbols:fullscreen-exit' : 'material-symbols:fullscreen'" />
                  </button>

                  <button class="control-btn end-call" :disabled="isCleaningUp" @click="endCall">
                    <Icon name="heroicons:phone-x-mark" />
                  </button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Incoming Call Permission Custom Modal (Overlay) -->
          <Transition name="fade">
            <div v-if="callStatus === 'ringing' && !isInCall" class="incoming-call-modal" data-clarity-mask="true">
              <div class="modal-content">
                <div class="avatar-large">
                  {{ getUserName(currentCallPartner)?.charAt(0) || '?' }}
                </div>
                <h3>{{ callType === 'video' ? 'Incoming Video Call' : 'Incoming Audio Call' }}</h3>
                <p>{{ getUserName(currentCallPartner) }} is calling you...</p>
                <div class="modal-actions">
                  <button class="accept-btn" @click="acceptIncomingCall(currentCallOffer!)">
                    <Icon name="material-symbols:call" />
                    Accept
                  </button>
                  <button class="decline-btn" @click="declineIncomingCall">
                    <Icon name="heroicons:phone-x-mark" />
                    Decline
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
            <header class="chat-header" data-clarity-mask="true">
              <div class="user-info-header">
                <div class="avatar-placeholder">{{ getRecipientName()?.charAt(0) || '?' }}</div>
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
              data-clarity-mask="true"
            >
              <div v-if="messagesStore.isLoading" class="loading-indicator">
                <div class="spinner-small" />
              </div>
              
              <template v-for="(msg, index) in messagesStore.getMessagesForRecipient(recipientUserId)" :key="msg.id">
                <div v-if="shouldShowDateSeparator(messagesStore.getMessagesForRecipient(recipientUserId), index)" class="date-separator">
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
                  :sender-name="userStore.user?.settings?.showOldConversationTitles ? msg.fromName : ''"
                  :timestamp="formatTimestamp(msg.timestamp)"
                  :is-own="msg.from === userStore.getUserId"
                  @contextmenu.prevent="onMessageContext($event, msg)"
                  @dblclick="isMobile && onMessageContext($event, msg)"
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
            <ContextMenu
              :show="contextMenu.show"
              :x="contextMenu.x"
              :y="contextMenu.y"
              @close="contextMenu.show = false"
            >
              <button @click="copyMessage(contextMenu.msg)">
                <Icon name="material-symbols:content-copy" /> Copy
              </button>
              <button @click="replyToMessage(contextMenu.msg)">
                <Icon name="material-symbols:reply" /> Reply
              </button>
              <button
                v-if="contextMenu.msg?.from === userStore.getUserId"
                class="delete"
                @click="deleteMessage(contextMenu.msg)"
              >
                <Icon name="material-symbols:delete" /> Delete
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
const pipWidth = ref(150); // Default PiP width

// Fix for black camera: occasionally srcObject assignment doesn't trigger playback correctly
function onLocalVideoLoaded() {
  if (localVideoRef.value && localVideoRef.value.paused) {
    localVideoRef.value.play().catch(e => console.warn("Auto-play fix failed:", e));
  }
}

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

// --- GSAP Folding Logic ---
const statusContentRef = ref(null);
const settingsContentRef = ref(null);

watch(isStatusFolded, (val) => {
  if (!statusContentRef.value || !import.meta.client) return;
  if (!val) {
    gsap.fromTo(statusContentRef.value, 
      { height: 0, opacity: 0 }, 
      { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" }
    );
  } else {
    gsap.to(statusContentRef.value, 
      { height: 0, opacity: 0, duration: 0.3, ease: "power2.in" }
    );
  }
});

watch(isSettingsFolded, (val) => {
  if (!settingsContentRef.value || !import.meta.client) return;
  if (!val) {
    gsap.fromTo(settingsContentRef.value, 
      { height: 0, opacity: 0 }, 
      { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" }
    );
  } else {
    gsap.to(settingsContentRef.value, 
      { height: 0, opacity: 0, duration: 0.3, ease: "power2.in" }
    );
  }
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
    messagesStore.clearContacts();

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

    // Initialize folding heights
    if (isStatusFolded.value && statusContentRef.value) {
      gsap.set(statusContentRef.value, { height: 0, opacity: 0, overflow: "hidden" });
    }
    if (isSettingsFolded.value && settingsContentRef.value) {
      gsap.set(settingsContentRef.value, { height: 0, opacity: 0, overflow: "hidden" });
    }

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
const isVideosSwapped = ref(false);
let activeDraggable: any = null;

function updateDraggable() {
  if (!import.meta.client) return;

  if (activeDraggable) {
    if (Array.isArray(activeDraggable)) {
      activeDraggable.forEach(d => d.kill());
    } else {
      activeDraggable.kill();
    }
    activeDraggable = null;
  }

  nextTick(() => {
    setTimeout(() => {
      const pipSelector = isVideosSwapped.value ? ".remote-video-container" : ".local-video-container";
      const target = document.querySelector(pipSelector) as HTMLElement;
      if (!target) return;

      const handle = target.querySelector(".resize-handle") as HTMLElement;

      // 1. Position/Drag Logic
      activeDraggable = Draggable.create(target, {
        bounds: ".video-call-overlay",
        edgeResistance: 0.65,
        type: "x,y",
        trigger: target,
        onPress: function() {
          gsap.set(this.target, { zIndex: 20 });
        },
        onClick: (e) => {
          // Only swap if we didn't click the resize handle
          if (!(e.target as HTMLElement).closest(".resize-handle")) {
            toggleVideoSwap();
          }
        }
      })[0];

      // 2. Scale/Resize Logic
      if (handle) {
        Draggable.create(handle, {
          type: "x,y",
          onDrag: function() {
            // Calculate new width based on drag distance
            // We use the delta to scale the container width
            const newWidth = Math.max(100, Math.min(600, pipWidth.value + this.x));
            gsap.set(target, { width: newWidth });
          },
          onDragEnd: function() {
            // Save the new width and reset handle position
            pipWidth.value = target.offsetWidth;
            gsap.set(this.target, { x: 0, y: 0 });
            updateDraggable(); // Re-sync bounds
          }
        });
      }
    }, 150);
  });
}

function toggleVideoSwap() {
  if (!import.meta.client || isAnimatingSwap.value) return;
  isAnimatingSwap.value = true;

  const localEl = document.querySelector(".local-video-container") as HTMLElement;
  const remoteEl = document.querySelector(".remote-video-container") as HTMLElement;
  if (!localEl || !remoteEl) {
    isAnimatingSwap.value = false;
    return;
  }

  // Ensure PiP width is maintained during swap
  const currentPipWidth = isVideosSwapped.value ? remoteEl.offsetWidth : localEl.offsetWidth;

  // 1. Get FIRST state
  const localRect = localEl.getBoundingClientRect();
  const remoteRect = remoteEl.getBoundingClientRect();

  // 2. Toggle LAST state
  isVideosSwapped.value = !isVideosSwapped.value;

  nextTick(() => {
    // 3. Wait for DOM updates, then INVERT and PLAY
    const newLocalRect = localEl.getBoundingClientRect();
    const newRemoteRect = remoteEl.getBoundingClientRect();

    if (activeDraggable) {
      activeDraggable.kill();
      activeDraggable = null;
    }

    gsap.set([localEl, remoteEl], { clearProps: "all" });
    
    // Maintain the PiP size on the new PiP container
    if (isVideosSwapped.value) {
      gsap.set(remoteEl, { width: pipWidth.value });
    } else {
      gsap.set(localEl, { width: pipWidth.value });
    }

    const localDeltaX = localRect.left - newLocalRect.left;
    const localDeltaY = localRect.top - newLocalRect.top;
    const localScaleX = localRect.width / newLocalRect.width;
    const localScaleY = localRect.height / newLocalRect.height;

    const remoteDeltaX = remoteRect.left - newRemoteRect.left;
    const remoteDeltaY = remoteRect.top - newRemoteRect.top;
    const remoteScaleX = remoteRect.width / newRemoteRect.width;
    const remoteScaleY = remoteRect.height / newRemoteRect.height;

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([localEl, remoteEl], { clearProps: "transform,scale" });
        updateDraggable();
        isAnimatingSwap.value = false;
      }
    });

    // Safety fallback
    setTimeout(() => {
      if (isAnimatingSwap.value) {
        isAnimatingSwap.value = false;
        updateDraggable();
      }
    }, 2000);

    tl.fromTo(localEl, 
      { x: localDeltaX, y: localDeltaY, scaleX: localScaleX, scaleY: localScaleY, transformOrigin: "top left" },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: "power3.inOut" }, 0
    );

    tl.fromTo(remoteEl, 
      { x: remoteDeltaX, y: remoteDeltaY, scaleX: remoteScaleX, scaleY: remoteScaleY, transformOrigin: "top left" },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: "power3.inOut" }, 0
    );
  });
}

watch(isInCall, (val) => {
  if (val && import.meta.client) {
    isVideosSwapped.value = false;
    updateDraggable();
  }
});

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

.connection-status-bar {
  margin-bottom: 1rem;
  padding: 0;
  background-color: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--lines-color);
  overflow: hidden;
  transition: all 0.3s ease;
  width: 100%;

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
    min-height: 0; // Fix for flex container height issues
  }
}

.online-users-panel {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 15px;
  border: 1px solid var(--lines-color);
  overflow-y: auto;

  @include mobile {
    max-height: 35%; // Slightly reduced to give more space to chat
    flex-shrink: 0;
  }

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

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
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

.input-area { padding: 10px 20px 20px; }

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

  &.is-fullscreen {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100dvw !important;
    height: 100dvh !important;
    z-index: 99999 !important;
    border-radius: 0 !important;
  }

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

  .video-grid {
    flex: 1;
    position: relative;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    &.videos-swapped {
      .remote-video-container {
        position: absolute !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 150px !important;
        height: auto !important;
        aspect-ratio: 16/9 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
        z-index: 10 !important;
        
        .remote-video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
      }
      
      .local-video-container {
        position: static !important;
        bottom: auto !important;
        right: auto !important;
        width: 100% !important;
        height: 100% !important;
        aspect-ratio: auto !important;
        border-radius: 0 !important;
        border: none !important;
        z-index: 1 !important;
        
        .local-video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      }
    }
  }
  .remote-video-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .remote-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @include tablet-to-up {
      height: 90%;
      width: 90%;
      .remote-video {
        object-fit: contain;
        border-radius: 12px;
      }
    }
  }
  .local-video-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 150px;
    aspect-ratio: 16/9;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.3);
    z-index: 20;
    cursor: grab;

    &:active { cursor: grabbing; }

    .local-video { width: 100%; height: 100%; object-fit: cover; }

    .resize-handle {
      position: absolute;
      top: 0;
      left: 0;
      width: 30px;
      height: 30px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: nwse-resize;
      z-index: 21;
      border-bottom-right-radius: 8px;
      
      &:hover {
        background: var(--accent-primary);
      }
    }
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

/* Incoming Call Modal */
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

/* Premium Audio Calling Visuals */
.audio-only-grid {
  background: radial-gradient(circle at center, #1b1c2b 0%, #0a0b12 100%) !important;
}

.audio-call-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
  height: 100%;
  width: 100%;
  color: white;

  .audio-avatar-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;

    .avatar-large-glow {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: var(--gradient-start);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      font-weight: bold;
      color: white;
      box-shadow: 0 0 35px rgba(255, 255, 255, 0.25);
      z-index: 2;
    }

    .pulse-ring {
      position: absolute;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.25);
      animation: audioPulse 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      z-index: 1;
      opacity: 0;

      &.ring-2 {
        animation-delay: 1s;
      }
      &.ring-3 {
        animation-delay: 2s;
      }
    }
  }

  .audio-call-info {
    text-align: center;
    h3 {
      font-size: 1.6rem;
      margin: 0 0 8px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .audio-status {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
      
      .voice-active {
        color: #4caf50;
        font-weight: 500;
        text-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
      }
    }
  }

  .audio-waves {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    height: 40px;
    margin-top: 10px;

    .bar {
      width: 4px;
      background: var(--accent-primary);
      border-radius: 2px;
      height: 6px;
      transition: height 0.25s ease;
    }

    &.animating {
      .bar-1 { animation: wave 1.2s ease-in-out infinite; }
      .bar-2 { animation: wave 0.9s ease-in-out infinite 0.2s; }
      .bar-3 { animation: wave 1.4s ease-in-out infinite 0.4s; }
      .bar-4 { animation: wave 1.1s ease-in-out infinite 0.1s; }
      .bar-5 { animation: wave 1.3s ease-in-out infinite 0.3s; }
    }
  }
}

@keyframes audioPulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.3);
    opacity: 0;
  }
}

@keyframes wave {
  0%, 100% { height: 6px; }
  50% { height: 38px; }
}
</style>