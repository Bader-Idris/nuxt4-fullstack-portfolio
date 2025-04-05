<template>
  <div class="dashboard">
    <h1>Socket.IO Test Page</h1>
    <div v-if="currentUser" class="connection-status">
      <span :class="{ 'connected': isConnected, 'disconnected': !isConnected }">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </span>
    </div>

    <!-- <div class="online-users">
      <h3>Online Users</h3>
      <div v-if="onlineUsers.length === 0" class="no-users">
        No users online
      </div>
      <ul v-else>
        <li v-for="onlineUser in onlineUsers" :key="onlineUser.userId"
          class="user-item">
          <div class="user-info">
            <span class="user-name">{{ onlineUser.name }}</span>
            <span class="user-status">Online</span>
          </div>
          <div class="user-actions">
            <button @click="startChatWith(onlineUser.userId)" class="chat-btn">
              <Icon name="heroicons:chat-bubble-left-solid" width="16" /> Chat
            </button>
            <button @click="startCall(onlineUser.userId)" class="call-btn">
              <Icon name="heroicons:video-camera-solid" width="16" /> Call
            </button>
          </div>
        </li>
      </ul>
    </div> -->

    <!-- Display Current User Info -->
    <section v-if="currentUser">
      <p><strong>Your role:</strong> {{ currentUser.role }}</p>
      <p><strong>Welcome, </strong> {{ currentUser.name }} (User ID: {{
        currentUser.userId }})</p>
      <p><strong>Your Socket ID:</strong> {{ currentUser.socketId }}</p>
    </section>
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
        <CustomButtons 
          button-type="primary"
          type="submit"
        >
          Send
        </CustomButtons>
      </form>
    </section>

    <!-- Broadcast Message -->
    <section>
      <h2>Send Broadcast</h2>
      <button @click="sendBroadcast">Send Broadcast Message</button>
    </section>

    <!-- Display Received Messages -->
    <section>
      <h2>Messages</h2>
      <ul>
        <ClientOnly>
          <li v-for="msg in filteredMessages" :key="msg.id">
            <!-- <strong>From:</strong> {{ msg.fromName }} (Socket ID: {{ msg.fromSocketId }})  -->
            <strong>From:</strong>{{ msg.fromName }} (User ID: {{ msg.from }})
            <strong>To:</strong> {{ msg.to }}
            <span>{{ msg.message }}</span>
            <em>{{ msg.timestamp }}</em>
          </li>
        </ClientOnly>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { io, type Socket } from 'socket.io-client';
// import type { Socket } from 'socket.io-client';
import { debounce } from 'lodash-es';

useSeoMeta({
  title: 'Dashboard - Secure Chat & Video',
  description: 'Access exclusive content, resources, and services on Bader Idris\'s platform.',
});

// Define Types
interface User {
  socketId: string;
  userId: string;
  name: string;
  role: string;
}

interface Message {
  fromName: string;
  fromSocketId: string;
  toSocketId: string;
  message: string;
  timestamp: string;
  id: string;
}

// State
// const isCapacitor = ref(false);
const currentUser: Ref<User | null> = ref(null);
const recipientUserId: Ref<string> = ref('');
const message: Ref<string> = ref('');
const messages: Ref<Message[]> = ref([]);
const page: Ref<number> = ref(1);
const limit: number = 20;
const isConnected = ref(false);
// const transport = ref("N/A");
const connectionError = ref<string | null>(null);

const baseUrl = useRuntimeConfig().public.originUrl;
// const isSecure = baseUrl.startsWith("https");
const localePath = useLocalePath()

// Socket variable
let socket: Socket;

const isCapacitorDevice = useCapacitorDevice();
// console.log('isCapacitorDevice', await isCapacitorDevice); // TODO: test its value for proper handling

// const {
//   socket,
//   isConnected,
//   onlineUsers,
//   localStream,
//   remoteStream,
//   isInCall,
//   startCall,
//   endCall,
//   initSocket,
// } = useAuthenticatedSocket();

// Function to get cookie string for Capacitor
async function getCookieStringForCapacitor(): Promise<string> {
  if (!await isCapacitorDevice) return ''; // TODO: test this out
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

// Rate Limiting for Message Fetching (20 messages per second max)
// const fetchMessages = debounce(() => {
//   socket.emit('get-message-history', { page: page.value, limit });
// }, 50); // 50ms debounce allows up to 20 fetches per second

// Lifecycle Hooks
onMounted(async () => {
  if (import.meta.client) {
    // Base Socket.IO options
    const options: any = {
      withCredentials: true, // Required for web to include cookies automatically
      // TODO: after testing it with ssl, it stops the whole front side of the app for both mobile and web
      // transports: isSecure
      //     ? ["websocket", "polling"]
      //     : ["polling", "websocket"],
      // TODO: test it after adding the adapter!
      // transports: ['websocket', 'polling'],
      // TODO: I like telegram approach with this of latency
      reconnection: true, // Enable automatic reconnection
      reconnectionAttempts: 5, // Limit reconnection attempts
      reconnectionDelay: 1000, // Initial delay between attempts (ms)
      reconnectionDelayMax: 5000, // Max delay with exponential backoff
    };

    if (await isCapacitorDevice) {
      const cookieString = await getCookieStringForCapacitor();
      if (cookieString) {
        options.extraHeaders = {
          cookie: cookieString,
        };
      }
      // TODO: Test After Deploying the new version
      // options.transports = isSecure
      //   ? ["websocket", "polling"]
      //   : ["polling", "websocket"]; // might need to set it to ["websocket"] only https://github.com/ionic-team/capacitor/issues/7568
      options.reconnection = true
      options.reconnectionAttempts = 5
      options.reconnectionDelay = 1000
      options.reconnectionDelayMax = 5000
    }

    // Initialize Socket.IO connection
    socket = io(baseUrl, options);

    // Handle Connection
    socket.on('connect', () => {
      // console.log('Connected to Socket.IO server');
      isConnected.value = true;
      connectionError.value = null;
      // transport.value = socket.io.engine.transport.name; // check https://socket.io/how-to/use-with-nuxt
      // socket.io.engine.on("upgrade", (rawTransport) => {
      //   transport.value = rawTransport.name;
      // });

      // TODO: limit rating is required! Fetch initial messages
      fetchMessages();
    });

    socket.on('reconnect', (attempt) => {
      console.log(`Reconnected after ${attempt} attempts`);
      isConnected.value = true;
      connectionError.value = null;
      fetchMessages(); // Re-sync data
      // TODO: is this like post, and can we make it as put if so!
    });

    socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
      connectionError.value = 'Reconnection failed';
    });

    socket.on('reconnect_failed', () => {
      console.error('Reconnection failed after maximum attempts');
      connectionError.value = 'Failed to reconnect. Please check your network.';
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      isConnected.value = false;
      // TODO: support it with i18n
      connectionError.value = error.message || 'Failed to connect to server';
      // Redirect to login on authentication failure
      if (
        error.message === 'Authentication required' ||
        error.message === 'Token validation failed' ||
        error.message === 'Invalid authentication'
      ) {
        navigateTo(localePath('/login'));
      }
    });

    // Receive Current User Info
    socket.on('connection-established', (data) => {
      currentUser.value = data;
    });

    socket.on("disconnect", (reason) => {
      isConnected.value = false;
      // transport.value = "N/A";
      console.log('Disconnected:', reason);
      // TODO: test its security consequences out
      if (reason === 'io server disconnect') {
        socket.connect(); // Try to reconnect if server forced disconnect
      }
    });

    // Receive Private Messages
    //   // TODO: add push notification, when someone sends a message, make the push notification to the other user?s
    //   // TODO: make the push notifications compatible with both browsers and capacitorJs devices, because I use cap in my nuxt application
    // socket.on('private-message', (data: Message) => {
    socket.on('private-message', (data) => {
      // messages.value.push(data);// TODO: test it out, I think it'll crash out!
      messages.value.push({
        fromName: data.fromName,
        fromSocketId: connectedUsers.get(data.from)?.socketId || 'Unknown',
        toSocketId: socket.id,
        message: data.message,
        timestamp: data.timestamp,
        id: data.id
      });
      triggerPushNotification(`New message from ${data.fromName}`, data.message, '/dashboard');
    });

    // Receive Broadcast Messages
    socket.on('broadcast', (data: Message) => {
      messages.value.push(data);
      triggerPushNotification(`Broadcast from ${data.fromName}`, data.message, '/dashboard');
    });

    // TODO: If client is not admin, filter out non-admin messages
    // Listen for message history
    socket.on('message-history', (newMessages: Message[]) => {
      messages.value = [...newMessages, ...messages.value];
    });

    // socket.on('online-users', (data) => {
    //   data.users.forEach(user => connectedUsers.set(user.userId, user));
    // });

    // Handle errors from the server
    socket.on('error', (error) => {
      isConnected.value = false;
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
    if (socket) socket.disconnect();
  }
});

// onBeforeUnmount(() => {
//   if (import.meta.client) {
//     socket.off("connect", onConnect);
//     socket.off("disconnect", onDisconnect);
//   }
// });

// Computed Property for Message Filtering
const filteredMessages = computed(() => {
  // TODO: this needs to be more professionally handled, when new socket io messages come to fetch them and add them to the dom
  // console.log('messages.value: ', Array.from(toRaw(messages.value))[0]);//           Object.values(toRaw(messages.value))

  // if (currentUser.value?.role === 'admin') { // TODO: secure it more!
    return messages.value;
  // return Array.from(toRaw(messages.value));
  // }

  // TODO: filtering is broken, it sends nothing to non admins
  // return messages.value.filter(
  //   (msg) => msg.toSocketId === currentUser.value?.socketId || msg.toSocketId === 'All'
  // );
});

// Methods
const sendPrivateMessage = () => {
  if (recipientUserId.value && message.value) {
    socket.emit('private-message', {
      to: recipientUserId.value, // TODO: is it reliable!
      message: message.value,
      timestamp: new Date().toISOString(),
    });
    message.value = '';
  }
};

const sendBroadcast = () => {
  socket.emit('broadcast', {
    message: 'Hello everyone from ' + currentUser.value?.name + ' Role: ' + currentUser.value?.role,
    timestamp: new Date().toISOString(),
    // TODO: make timestamp appearance as prod message apps, separate time in day, weeks, months and years, telegram is good at this!
  });
};

const fetchMessages = debounce(() => {
  socket.emit('get-message-history', { page: page.value, limit });
  // 50 ms debounce allows up to 20 fetches per second, but with arrays, that'll be a lot
}, 150);

// const loadMoreMessages = () => {
//   page.value += 1;
//   fetchMessages();
// };

// Note: For socket ID mapping, we'll assume connectedUsers is accessible or modify server
// const connectedUsers: Map<string, User> = new Map(); // Ideally, get this from server

// Push Notification Logic
// const triggerPushNotification = (title: string, body: string) => {
//   if (import.meta.client && Notification.permission === 'granted') {
//     new Notification(title, { body });
//   }
// };

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

// Debounce Utility
// function debounce(func: Function, wait: number) {
//   // This debounce of 50 ms makes 20 requests per second max
//   let timeout: ReturnType<typeof setTimeout>;
//   return function (...args: any[]) {
//     clearTimeout(timeout);
//     timeout = setTimeout(() => func(...args), wait);
//   };
// }

</script>

<style lang="scss" scoped>
.dashboard {
  overflow: auto !important;
  padding-bottom: 100px;
  @include mainMiddleSettings;
  @media (max-width: 768px) {
    @include phone-borders;
    height: calc(100vh - 30px);
  }
  @media (min-width: 769px) {
    height: calc(100vh - 60px);
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
</style>