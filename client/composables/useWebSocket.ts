export function useWebSocket() {
  const socket = ref(null);
  const isConnected = ref(false);
  const messages = ref([]);

  const connect = () => {
    // Get user data from localStorage
    let userData = null;
    if (import.meta.client) {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          userData = JSON.parse(userStr);
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }
    }

    // Create WebSocket connection
    // The tokens in cookies will be automatically sent with the request
    socket.value = new WebSocket(
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        window.location.host
      }/ws`
    );

    socket.value.onopen = () => {
      isConnected.value = true;
      console.log("WebSocket connected");

      // Send authentication data if needed
      if (userData) {
        sendMessage({
          type: "auth",
          data: {
            username: userData.username,
            userId: userData.userId,
            role: userData.role,
          },
        });
      }
    };

    socket.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        messages.value.push(data);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    socket.value.onclose = () => {
      isConnected.value = false;
      console.log("WebSocket disconnected");
    };
  };

  const sendMessage = (data) => {
    if (socket.value && isConnected.value) {
      socket.value.send(JSON.stringify(data));
    }
  };

  onMounted(() => {
    connect();
  });

  onBeforeUnmount(() => {
    if (socket.value) {
      socket.value.close();
    }
  });

  return {
    isConnected,
    messages,
    sendMessage,
  };
}
