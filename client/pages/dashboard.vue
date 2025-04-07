<template>
  <div class="dashboard">
    <h1>Socket.IO Test Page</h1>
    <div v-if="socketStore.currentUser" class="connection-status">
      <span
        :class="{ 'connected': socketStore.isConnected, 'disconnected': !socketStore.isConnected }">
        {{ socketStore.isConnected ? 'Connected' : 'Disconnected' }}
      </span>
    </div>

    <!-- Display Current User Info -->
    <section v-if="socketStore.currentUser">
      <p><strong>Your role:</strong> {{ socketStore.currentUser.role }}</p>
      <p><strong>Welcome, </strong> {{ socketStore.currentUser.name }} (User ID:
        {{
        socketStore.currentUser.userId }})</p>
      <p><strong>Your Socket ID:</strong> {{ socketStore.currentUser.socketId }}
      </p>
    </section>
    <!-- TODO: could be more of a lovely loader! -->
    <p v-else>Connecting...</p>

    <!-- Form to Send Private Message -->
    <section>
      <h2>Send Private Message</h2>
      <form @submit.prevent="sendPrivateMessage">
        <input
          v-model="recipientUserId" 
          placeholder="Recipient User ID"
          required
        ></input>
        <input
          v-model="message" 
          placeholder="Type your message"
          required
        ></input>
        <CustomButtons button-type="primary" type="submit">
          Send
        </CustomButtons>
      </form>
    </section>

    <section class="chat-section">
      <h2 v-if="recipientUserId">Chatting with {{ getRecipientName() }}</h2>
      <!-- <div class="chat-container" ref="chatContainer"> -->
      <div class="chat-container">
        <div v-for="msg in messagesStore.getFilteredMessages" :key="msg.id" :class="['message', msg.from === currentUserId ? 'sent' : 'received']">
          <div class="message-header">
            <span class="sender-name">{{ msg.fromName }}</span>
          </div>
          <div class="message-content">
            <span>{{ msg.message }}</span>
          </div>
          <div class="message-timestamp">{{ formatTimestamp(msg.timestamp) }}</div>
        </div>
      </div>
    </section>

    
    <!-- Display Received Messages -->
    <!-- <section>
      <h2>Messages</h2>
      <ul>
          <li v-for="msg in messagesStore.getFilteredMessages" :key="msg.id">
            <strong>From:</strong> {{ msg.fromName }} (Socket ID: {{ msg.fromSocketId }}) 
            <strong>From:</strong>{{ msg.fromName }} (User ID: {{ msg.from }})
            <strong>To:</strong> {{ msg.to }}
            <span>{{ msg.message }}</span>
            <em>{{ msg.timestamp }}</em>
          </li>
      </ul>
    </section> -->

    <div class="online-users">
      <h3>Online Users</h3>
      <div v-if="onlineUsersStore.users.length === 0" class="no-users">
        No users online
      </div>
      <ul v-else>
        <li v-for="onlineUser in onlineUsersStore.getOnlineUsers"
          :key="onlineUser.userId" 
          class="user-item"
        >
          <div class="user-info">
            <span class="user-name">{{ onlineUser.name }}</span>
            <span class="user-status">Online</span>
          </div>
          <div class="user-actions">
            <button 
              @click="startChatWith(onlineUser.userId)" 
              class="chat-btn"
              :disabled="recipientUserId === onlineUser.userId">
              <Icon name="heroicons:chat-bubble-left-solid" width="16" /> Chat
            </button>
            <button 
              @click="initiateCall(onlineUser.userId)" 
              class="call-btn"
              :disabled="isInCall">
              <Icon name="heroicons:video-camera-solid" width="16" /> Call
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Video Call UI -->
    <div v-if="isInCall" class="video-call-container">
      <div class="call-info">
        <p>Calling: {{ getUserName(currentCallPartner) }}</p>
      </div>
      <div class="video-grid">
        <!-- Remote Video (Main) -->
        <div class="remote-video-container">
          <video
            ref="remoteVideoRef" 
            autoplay
            playsinline
            class="remote-video"
          />
          <div v-if="!remoteStream" class="connecting-overlay">
            <span>Connecting...</span>
            <div class="spinner"></div>
          </div>
        </div>

        <!-- Local Video (Picture-in-Picture) -->
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

      <!-- Call Controls -->
      <div class="call-controls">
        <button @click="toggleMute" 
          class="control-btn"
          :class="{ 'active': isMuted }">
          <Icon
            v-if="isMuted"
            width="24" 
            name="heroicons:microphone-off" 
          />
          <Icon name="heroicons:microphone" v-else width="24" />
        </button>
        <button 
          @click="toggleVideo" 
          class="control-btn"
          :class="{ 'active': isVideoOff }">
          <Icon 
            v-if="isVideoOff"
            name="heroicons:video-camera-slash" 
            width="24" />
          <Icon name="heroicons:video-camera" v-else width="24" />
        </button>
        <button @click="endCall" class="control-btn end-call">
          <Icon name="heroicons:phone-x-mark" width="24" />
        </button>
      </div>
    </div>

    <!-- Broadcast Message -->
    <section>
      <h2>Send Broadcast</h2>
      <button @click="sendBroadcast">Send Broadcast Message</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { io, type Socket } from 'socket.io-client';
import { debounce } from 'lodash-es';
import { useSocketStore } from '~/stores/useSocketStore';
import { useMessagesStore } from '~/stores/useMessagesStore';
import { useOnlineUsersStore } from '~/stores/useOnlineUsersStore';
import { useWebRTC } from '~/components/webRTC'; // TODO: should it be in composables instead?

useSeoMeta({
  title: 'Dashboard - Secure Chat & Video',
  description: 'Access exclusive content, resources, and services on Bader Idris\'s platform.',
});

// Use Pinia stores
const socketStore = useSocketStore();
const messagesStore = useMessagesStore();
const onlineUsersStore = useOnlineUsersStore();

// State
const recipientUserId: Ref<string> = ref('');
const message: Ref<string> = ref('');
const localePath = useLocalePath()
const isCapacitorDevice = useCapacitorDevice();
const baseUrl = useRuntimeConfig().public.originUrl;
const currentUserId = computed(() => socketStore.currentUser?.userId);
// const transport = ref("N/A");

// Use the WebRTC composable
const {
  localStream,
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
} = useWebRTC();

// Socket variable
let socket: Socket;

// Function to get cookie string for Capacitor
async function getCookieStringForCapacitor(): Promise<string> {
  if (!await isCapacitorDevice) return '';
  try {
    const { CapacitorCookies } = await import('@capacitor/core');
    const cookies = await CapacitorCookies.getCookies();
    // Format cookies into a string: "key1=value1; key2=value2"
    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  } catch (e) {
    console.error('Error getting cookies in Capacitor:', e);
    return '';
  }
}

const getUserName = (userId) => {
  const user = onlineUsersStore.users.find((u) => u.userId === userId);
  return user ? user.name : 'Unknown';
};

const getRecipientName = () => {
  const recipient = onlineUsersStore.users.find(u => u.userId === recipientUserId.value);
  return recipient ? recipient.name : 'Unknown';
};

// const formatTimestamp = (timestamp) => {
//   const date = new Date(timestamp);
//   const now = new Date();
//   if (date.toDateString() === now.toDateString()) {
//     return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//   } else {
//     return date.toLocaleDateString();
//   }
// };

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true, // Use AM/PM format
  };

  if (diffDays === 0) {
    // Today: Show only time (e.g., "3:45 PM")
    return date.toLocaleTimeString([], options);
  } else if (diffDays === 1) {
    // Yesterday: "Yesterday, 3:45 PM"
    return `Yesterday, ${date.toLocaleTimeString([], options)}`;
  } else if (diffDays < 7) {
    // Within a week: "Monday, 3:45 PM"
    return date.toLocaleString([], { weekday: 'long', ...options });
  } else if (date.getFullYear() === now.getFullYear()) {
    // This year: "March 15, 3:45 PM"
    return date.toLocaleString([], { month: 'long', day: 'numeric', ...options });
  } else {
    // Older: "March 15, 2023, 3:45 PM"
    return date.toLocaleString([], { month: 'long', day: 'numeric', year: 'numeric', ...options });
  }
};

// Start a chat with a user
const startChatWith = (userId) => {
  if (isInCall.value) {
    alert('Cannot start a chat while in a call.');
    return;
  }
  recipientUserId.value = userId;
  console.log(`Chat started with user: ${getUserName(userId)}`);
  // Optionally, focus on a message input field if you have one
  // e.g., messageInputRef.value.focus();
};

// Lifecycle Hooks
onMounted(async () => {
  if (import.meta.client) {
    // Base Socket.IO options
    const options: any = {
      withCredentials: true, // web cookies
      // TODO: I like telegram approach with this of latency
      reconnection: true, // Enable automatic reconnection
      reconnectionAttempts: 5, // Limit reconnection attempts
      reconnectionDelay: 1000, // Initial delay between attempts (ms)
      reconnectionDelayMax: 5000, // Max delay with exponential backoff
    };

    if (await isCapacitorDevice) {
      // properly handling cap cookies
      const cookieString = await getCookieStringForCapacitor();
      if (cookieString) {
        options.extraHeaders = {
          cookie: cookieString,
        };
      }
      options.reconnection = true
      options.reconnectionAttempts = 5
      options.reconnectionDelay = 1000
      options.reconnectionDelayMax = 5000
    }

    // Initialize Socket.IO connection
    socket = io(baseUrl, options);
    socketStore.setSocket(socket);

    // Handle Connection
    socket.on('connect', () => {
      socketStore.setConnection(true);
      socketStore.setConnectionError(null);

      // transport.value = socket.io.engine.transport.name; // check https://socket.io/how-to/use-with-nuxt
      // socket.io.engine.on("upgrade", (rawTransport) => {
      //   transport.value = rawTransport.name;
      // });

      // TODO: limit rating is required! Fetch initial messages
      fetchMessages();
    });

    socket.on('reconnect', (attempt) => {
      console.log(`Reconnected after ${attempt} attempts`);
      socketStore.setConnection(true);
      socketStore.setConnectionError(null);
      fetchMessages(); // Re-sync data
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      socketStore.setConnection(false);
      socketStore.setConnectionError(error.message || 'Failed to connect to server');
      // Redirect to login on authentication failure
      if (
        error.message === 'Authentication required' ||
        error.message === 'Token validation failed' ||
        error.message === 'Invalid authentication'
      ) {
        navigateTo(localePath('/login'));
      }
    });

    socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
      socketStore.setConnectionError('Reconnection failed');
    });

    socket.on('reconnect_failed', () => {
      console.error('Reconnection failed after maximum attempts');
      socketStore.setConnectionError('Failed to reconnect. Please check your network.');
    });

    socket.on("disconnect", (reason) => {
      socketStore.setConnection(false);

      // transport.value = "N/A";
      console.log('Disconnected:', reason);
      // TODO: test its security consequences out
      if (reason === 'io server disconnect') {
        socket.connect(); // Try to reconnect if server forced disconnect
      }
    });

    // TODO: if planning to make admin user the default option
    // const adminUser = onlineUsersStore.users.find((u) => u.role === 'admin');
    // if (adminUser) {
    //   recipientUserId.value = adminUser.userId;
    //   console.log(`Default recipient set to admin: ${getUserName(adminUser.userId)}`);
    // }

    // Receive Current User Info
    socket.on('connection-established', (data) => {
      socketStore.setCurrentUser(data);
    });

    // Listen for online users updates
    socket.on('online-users', (users) => {
      onlineUsersStore.setUsers(users);
    });

    // Listen for user joined
    socket.on('user-joined', (user) => {
      onlineUsersStore.addUser(user);
      // console.log('onlineUsersStore', onlineUsersStore.getOnlineUsers);
      /*
[
  {
    "userId": "67e3f8e577863389d585d7e3",
    "socketId": "NvvHxO4XJ5X6U-kzAAAe",
    "name": "UserBader",
    "role": "user"
  },
  {
    "userId": "67c038f44eab6f2ff957ed9b",
    "socketId": "_xaVOMV7qliaw3eAAAAh",
    "name": "bader",
    "role": "admin"
  }
]
       */
    });

    // Listen for user left
    socket.on('user-left', (userId) => {
      onlineUsersStore.removeUser(userId);
    });

    // WebRTC signaling
    setupSocketListeners();
    // TODO: add push notification, when someone sends a message, make the push notification to the other user?s
    // TODO: make the push notifications compatible with both browsers and capacitorJs devices, because I use cap in my nuxt application
    // Receive Private Messages
    socket.on('private-message', (data) => {
      const messageData: any =  { // TODO: fix using any type
        fromName: data.fromName,
        fromSocketId: data.fromSocketId || 'Unknown',
        toSocketId: socket.id,
        message: data.message,
        timestamp: data.timestamp,
        id: data.id,
        from: data.from,
        to: data.to
      };
      messagesStore.addMessage(messageData);
      triggerPushNotification(`New message from ${data.fromName}`, data.message, '/dashboard');
    });

    // Receive Broadcast Messages
    socket.on('broadcast', (data) => {
      messagesStore.addMessage(data);
      triggerPushNotification(`Broadcast from ${data.fromName}`, data.message, '/dashboard');
    });

    // TODO: If client is not admin, filter out non-admin messages
    // Listen for message history
    socket.on('message-history', (newMessages) => {
      messagesStore.setMessages(newMessages);
    });

    // Handle errors from the server
    socket.on('error', (error) => {
      socketStore.setConnection(false);
      console.error('Server error:', error.message);
    });

    if (await isCapacitorDevice) {
      // local notification is useless, we need push notifications
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const deepLink = notification.notification.extra?.deepLink || '/messages';
        navigateTo(localePath(deepLink));
      });
    } else {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }

  }
});

onUnmounted(() => {
  if (import.meta.client) {
    // TODO: will this break the mobile capacitor app?
    const socket = socketStore.getSocket;
    if (socket) socket.disconnect();
  }
});

// Methods
const sendPrivateMessage = () => {
  // ? The recipient receives the message immediately, but the sender does not see it immediately!
  // TODO: handle deleting messages from each side, and from the server, and updating the data after editing
  if (recipientUserId.value && message.value) {
    // TODO: we might need to change the way socket is initialized
    // const socket = socketStore.getSocket;
    if (socket) {
      const timestamp = new Date().toISOString();
      const messageData = {
        to: recipientUserId.value,
        message: message.value,
        timestamp,
      };

      // Send to server
      socket.emit('private-message', messageData);
      // Add to local store immediately for the sender
      // messagesStore.addMessage({
      //   id: `local-${Date.now()}`, // Temporary ID until server confirms
      //   fromName: socketStore.currentUser?.name || 'You',
      //   fromSocketId: socket.id,
      //   toSocketId: 'pending', // We don't know recipient's socket ID yet
      //   from: socketStore.currentUser?.userId,
      //   to: recipientUserId.value,
      //   message: message.value,
      //   timestamp: timestamp
      // });
      message.value = '';
    }
  }
};

const sendBroadcast = () => {
  // const socket = socketStore.getSocket;
  const currentUser = socketStore.currentUser;

  if (socket && currentUser) {
    const timestamp = new Date().toISOString();
    const broadcastMessage = 'Hello everyone from ' + currentUser.name + ' Role: ' + currentUser.role;

    socket.emit('broadcast', {
      message: broadcastMessage,
      timestamp: timestamp,
    });

    // Add to local store immediately
    messagesStore.addMessage({
      id: `local-broadcast-${Date.now()}`,
      fromName: currentUser.name,
      fromSocketId: socket.id,
      toSocketId: 'broadcast',
      from: currentUser.userId,
      to: 'everyone',
      message: broadcastMessage,
      timestamp: timestamp
    });
  }
};

const fetchMessages = debounce(() => {
  // const socket = socketStore.getSocket;
  if (socket) {
    // TODO: update after changes occur
    // TODO: is this like post method, and can we make it as put if so!
    // TODO: try to add the edit option to test http put for each message
    socket.emit('get-message-history', {
      page: messagesStore.page,
      limit: messagesStore.limit
    });
    // 50 ms debounce allows up to 20 fetches per second, but with arrays, that'll be a lot
  }
}, 150);

// const loadMoreMessages = () => {
//   page.value += 1;
//   fetchMessages();
// };

// Note: For socket ID mapping, we'll assume connectedUsers is accessible or modify server
// const connectedUsers: Map<string, User> = new Map(); // Ideally, get this from server

const triggerPushNotification = async (title: string, body: string, deepLink: string = '/messages') => {
  if (!import.meta.client) return;
  if (await isCapacitorDevice) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          extra: { deepLink },
        },
      ],
    });
  } else if (Notification.permission === 'granted') {
    const notification = new Notification(title, { body });
    notification.onclick = () => {
      navigateTo(localePath(deepLink));
    };
  }
};
// try to implement the nuxt debounce or vueUse.useDebounceFn instead of installing the es one
</script>

<style lang="scss" scoped>
.dashboard {
  overflow: auto !important;
  padding-bottom: 100px;
  @include mainMiddleSettings;
  @media (max-width: 768px) {
    @include phone-borders;
    height: calc(100vh - 90px) !important;
  }
  @media (min-width: 769px) {
    height: calc(100vh - 180px) !important;
  }
}

section {
  margin: 20px 0;
}

input {
  margin-right: 10px;
  padding: 5px;
}

button {
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  margin: 10px 0;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.connection-status {
  margin-bottom: 1rem;
}

.connected {
  color: green;
}

.disconnected {
  color: red;
}

.chat-section {
  margin: 20px 0;
}

.chat-container {
  max-height: 400px;
  /* Adjust height as needed */
  overflow-y: auto;
  padding: 10px;
  background-color: #f9f9f9;
  /* Light gray background */
  border-radius: 8px;
}

.message {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
}

.sent {
  align-items: flex-end;
}

.received {
  align-items: flex-start;
}

.message-header {
  font-size: 0.9em;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.sent .message-header {
  color: #2E7D32;
  /* Darker green for sent messages */
}

.received .message-header {
  color: #1976D2;
  /* Blue for received messages */
}

.message-content {
  padding: 10px;
  border-radius: 10px;
  max-width: 70%;
  word-wrap: break-word;
}

.sent .message-content {
  background-color: #DCF8C6;
  /* Light green for sent messages */
}

.received .message-content {
  background-color: #FFFFFF;
  /* White for received messages */
  border: 1px solid #DDDDDD;
}

.message-timestamp {
  font-size: 0.8em;
  color: #888888;
  margin-top: 5px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .message-content {
    max-width: 90%;
    /* Wider bubbles on small screens */
  }
}

.video-call-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #121212;
  z-index: 1000;
  display: flex;
  flex-direction: column;
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
  width: 150px;
  height: 200px;
  bottom: 20px;
  right: 20px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.connecting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 1.5rem;
}

.spinner {
  margin-top: 20px;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.call-controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.8);
}

.control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #333;
  color: white;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background-color: #444;
}

.control-btn.active {
  background-color: #555;
}

.end-call {
  background-color: #e53935;
}

.end-call:hover {
  background-color: #c62828;
}
</style>