<template>
  <div>
    <h1>Socket.IO Test Page</h1>
    <div v-if="currentUser" class="connection-status">
      <span :class="{ 'connected': isConnected, 'disconnected': !isConnected }">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </span>
    </div>

    <!-- Display Current User Info -->
    <section v-if="currentUser">
      <p><strong>Your role:</strong> {{ currentUser.role }}</p>
      <p><strong>Welcome, </strong> {{ currentUser.name }} (User ID: {{ currentUser.userId }})</p>
      <p><strong>Your Socket ID:</strong> {{ currentUser.socketId }}</p>
    </section>
    <p v-else>Connecting...</p>

    <!-- Form to Send Private Message -->
    <section>
      <h2>Send Private Message</h2>
      <form @submit.prevent="sendPrivateMessage">
        <input
          v-model="recipientSocketId"
          placeholder="Recipient Socket ID"
          required
        />
        <input
          v-model="message"
          placeholder="Type your message"
          required
        />
        <button type="submit">Send</button>
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
        <li v-for="msg in filteredMessages" :key="msg.timestamp">
          <strong>From:</strong> {{ msg.fromName }} (Socket ID: {{ msg.fromSocketId }}) 
          <strong>To:</strong> {{ msg.toSocketId }} 
          <span>{{ msg.message }}</span> 
          <em>{{ msg.timestamp }}</em>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
// import type { Ref } from 'vue';

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
}

// State
const currentUser: Ref<User | null> = ref(null);
const recipientSocketId: Ref<string> = ref('');
const message: Ref<string> = ref('');
const messages: Ref<Message[]> = ref([]);
const page: Ref<number> = ref(1);
const limit: number = 20;

const baseUrl = useRuntimeConfig().public.originUrl;
// const isSecure = baseUrl.startsWith("https");

// Socket.IO Connection
const socket: Socket = io(baseUrl,{
  withCredentials: true,
  // autoConnect: true,
  // transports: isSecure
  //     ? ["websocket", "polling"]
  //     : ["polling", "websocket"],

});

const isConnected = ref(false);
const connectionError = ref<string | null>(null);

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

// Rate Limiting for Message Fetching (20 messages per second max)
const fetchMessages = debounce(() => {
  socket.emit('get-message-history', { page: page.value, limit });
}, 50); // 50ms debounce allows up to 20 fetches per second

// Lifecycle Hooks
onMounted(async () => {
  if (import.meta.client) {
    // Handle Connection
    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      isConnected.value = true;
      connectionError.value = null;
    });

    // Receive Socket ID and User Info
    socket.on('connection-established', (data) => {
      // currentUser.value = {
      //   socketId: data.socketId,
      //   userId: data.userId,
      //   name: data.name,
      //   role: data.role,
      // };
      currentUser.value = data; // TODO: testing it out, except if interface is its backup
    });

    // Fetch initial messages
    fetchMessages();

    // ===== cap specifics ================
    // Setup Capacitor Local Notifications
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    const isCapacitorDevice = info.platform !== 'web';

    if (isCapacitorDevice) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const deepLink = notification.notification.extra?.deepLink || '/messages';
        navigateTo(deepLink);
      });
    } else {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
    // ====================================

    // Receive Private Messages
    // socket.on('private-message', (data) => {
    //   // TODO: add push notification, when someone sends a message, make the push notification to the other user?s
    //   // TODO: make the push notifications compatible with both browsers and capacitorJs devices, because I use cap in my nuxt application
    //   messages.value.push({
    //     fromName: data.fromName,
    //     fromSocketId: connectedUsers.get(data.from)?.socketId || 'Unknown',
    //     toSocketId: socket.id,
    //     message: data.message,
    //     timestamp: data.timestamp,
    //   });
    // });
    socket.on('private-message', (data: Message) => {
      messages.value.push(data);// TODO: test it out, I think it'll crash out!
      triggerPushNotification(`New message from ${data.fromName}`, data.message, '/dashboard' );
    });

    // Receive Broadcast Messages
    // socket.on('broadcast', (data) => {
    //   messages.value.push({
    //     fromName: data.fromName,
    //     fromSocketId: connectedUsers.get(data.from)?.socketId || 'Unknown',
    //     toSocketId: 'All',
    //     message: data.message,
    //     timestamp: data.timestamp,
    //   });
    // });
    socket.on('broadcast', (data: Message) => {
      messages.value.push(data);
      triggerPushNotification(`Broadcast from ${data.fromName}`, data.message, '/dashboard');
    });

    // TODO: If client is not admin, filter out non-admin messages
    // Listen for message history
    socket.on('message-history', (newMessages: Message[]) => {
      messages.value = [...newMessages, ...messages.value];
    });

    // Handle errors from the server
    socket.on('error', (error) => {
      isConnected.value = false;
      console.error('Server error:', error.message);
    });
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    socket.disconnect();
  }
});

// Computed Property for Message Filtering
const filteredMessages = computed(() => {
  if (currentUser.value?.role === 'admin') { // TODO: secure it more!
    return messages.value;
  }
  return messages.value.filter(
    (msg) => msg.toSocketId === currentUser.value?.socketId || msg.toSocketId === 'All'
  );
});

// Methods
const sendPrivateMessage = () => {
  if (recipientSocketId.value && message.value) {
    socket.emit('private-message', {
      to: recipientSocketId.value, // TODO: is it reliable!
      message: message.value,
      timestamp: new Date().toISOString(),
    });
    message.value = '';
  }
};

// const fetchMessages = () => { // TODO: check its consequences
//   socket.emit('get-message-history', { page: page.value, limit });
// };

const loadMoreMessages = () => {
  page.value += 1;
  fetchMessages();
};

const sendBroadcast = () => {
  socket.emit('broadcast', {
    message: 'Hello everyone from ' + currentUser.value?.name + ' Role: ' + currentUser.value?.role,
    timestamp: new Date().toISOString(),
    // TODO: make timestamp appearance as prod message apps, separate time in day, weeks, months and years, telegram is good at this!
  });
};

// Note: For socket ID mapping, we'll assume connectedUsers is accessible or modify server
const connectedUsers: Map<string, User> = new Map(); // Ideally, get this from server

// Push Notification Logic
// const triggerPushNotification = (title: string, body: string) => {
//   if (import.meta.client && Notification.permission === 'granted') {
//     new Notification(title, { body });
//   }
// };

const triggerPushNotification = async (title: string, body: string, deepLink: string = '/messages') => {
  if (!import.meta.client) return;

  const { Device } = await import('@capacitor/device');
  const info = await Device.getInfo();
  const isCapacitorDevice = info.platform !== 'web';

  if (isCapacitorDevice) {
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
      navigateTo(deepLink);
    };
  }
};

if (import.meta.client) {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Notification permission granted');
    }
  });
}

// Debounce Utility
function debounce(func: Function, wait: number) {
  // This debounce of 50 ms makes 20 requests per second max
  let timeout: ReturnType<typeof setTimeout>;
  return function (...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

socket.on('online-users', (data) => {
  data.users.forEach(user => connectedUsers.set(user.userId, user));
});
</script>

<style lang="scss" scoped>
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