import { io, type Socket } from "socket.io-client";
import { useUserStore } from "~/stores/UserNameStore";

export function useAuthenticatedSocket() {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);
  const onlineUsers = ref<any[]>([]);
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null>(null);
  const peerConnection = ref<RTCPeerConnection | null>(null);
  const isInCall = ref(false);
  const currentCallPartner = ref<string | null>(null);

  const initSocket = () => {
    if (socket.value) return;

    const config = useRuntimeConfig();
    const baseUrl = config.public.originUrl;
    const isSecure = baseUrl.startsWith("https");

    socket.value = io(baseUrl, {
      path: "/socket.io/",
      autoConnect: true,
      withCredentials: true,
      transports: isSecure
        ? ["websocket", "polling"]
        : ["polling", "websocket"],
    });

    socket.value.on("connect", () => {
    // socket.value.on("connection", () => {
      isConnected.value = true;
      connectionError.value = null;
      console.log("Socket connected");
      const userStore = useUserStore();
      if (userStore.user?.role === "admin") {
        socket.value?.emit("get-online-users");
      }
    });

    socket.value.on("connect_error", (err) => {
      isConnected.value = false;
      connectionError.value = err.message;
      console.error("Socket connection error:", err);
      if (err.message === "Invalid authentication") {
        navigateTo("/login");
      }
    });

    socket.value.on("disconnect", () => {
      isConnected.value = false;
      console.log("Socket disconnected");
    });

    socket.value.on("online-users", (data) => {
      onlineUsers.value = data.users || [];
    });

    socket.value.on("call-request", async (data) => {
      if (isInCall.value) {
        socket.value?.emit("call-rejected", { to: data.from, reason: "busy" });
        return;
      }
      const accepted = await showIncomingCallDialog(data.name);
      if (accepted) {
        const success = await initializeWebRTC();
        if (!success) {
          socket.value?.emit("call-rejected", {
            to: data.from,
            reason: "media-error",
          });
          return;
        }
        currentCallPartner.value = data.from;
        isInCall.value = true;
        await peerConnection.value?.setRemoteDescription(
          new RTCSessionDescription(data.sdp)
        );
        const answer = await peerConnection.value?.createAnswer();
        await peerConnection.value?.setLocalDescription(answer);
        socket.value?.emit("call-answer", {
          to: data.from,
          sdp: peerConnection.value?.localDescription,
        });
      } else {
        socket.value?.emit("call-rejected", {
          to: data.from,
          reason: "declined",
        });
      }
    });

    socket.value.on("call-answer", async (data) => {
      await peerConnection.value?.setRemoteDescription(
        new RTCSessionDescription(data.sdp)
      );
    });

    socket.value.on("ice-candidate", async (data) => {
      if (peerConnection.value && data.candidate) {
        await peerConnection.value.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    });

    socket.value.on("end-call", () => {
      endCall();
    });

    socket.value.on("call-rejected", (data) => {
      endCall();
      alert(`Call was rejected: ${data.reason}`);
    });

    // Placeholders for dashboard to handle
    socket.value.on("private-message", () => {});
    socket.value.on("broadcast", () => {});
  };

  const initializeWebRTC = async () => {
    try {
      localStream.value = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      peerConnection.value = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      localStream.value.getTracks().forEach((track) => {
        peerConnection.value?.addTrack(track, localStream.value!);
      });
      remoteStream.value = new MediaStream();
      peerConnection.value.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.value?.addTrack(track);
        });
      };
      peerConnection.value.onicecandidate = (event) => {
        if (event.candidate && currentCallPartner.value) {
          socket.value?.emit("ice-candidate", {
            to: currentCallPartner.value,
            candidate: event.candidate,
          });
        }
      };
      return true;
    } catch (error) {
      console.error("Error initializing WebRTC:", error);
      alert("Failed to access media devices. Please check permissions.");
      return false;
    }
  };

  const startCall = async (userId: string) => {
    if (isInCall.value) {
      alert("You are already in a call.");
      return;
    }
    const success = await initializeWebRTC();
    if (!success) return;
    currentCallPartner.value = userId;
    isInCall.value = true;
    const offer = await peerConnection.value?.createOffer();
    await peerConnection.value?.setLocalDescription(offer);
    socket.value?.emit("call-request", {
      to: userId,
      sdp: peerConnection.value?.localDescription,
    });
  };

  const endCall = () => {
    if (currentCallPartner.value) {
      socket.value?.emit("end-call", { to: currentCallPartner.value });
    }
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop());
      localStream.value = null;
    }
    remoteStream.value = null;
    if (peerConnection.value) {
      peerConnection.value.close();
      peerConnection.value = null;
    }
    isInCall.value = false;
    currentCallPartner.value = null;
  };

  const showIncomingCallDialog = (callerName: string) => {
    return new Promise((resolve) => {
      const accepted = confirm(`Incoming call from ${callerName}. Accept?`);
      resolve(accepted);
    });
  };

  onMounted(() => {
    initSocket();
  });

  onUnmounted(() => {
    if (isInCall.value) endCall();
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
  });

  return {
    socket,
    isConnected,
    connectionError,
    onlineUsers,
    localStream,
    remoteStream,
    isInCall,
    currentCallPartner,
    startCall,
    endCall,
    initSocket,
  };
}
