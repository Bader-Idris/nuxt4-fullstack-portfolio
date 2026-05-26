import { useSocketStore } from "~/stores/useSocketStore";
import { useUserStore } from "~/stores/useUserSocket";

export function useWebRTC() {
  const socketStore = useSocketStore();
  const userStore = useUserStore();

  // WebRTC variables
  const peerConnections = ref(new Map<string, RTCPeerConnection>());
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null>(null);
  const isInCall = ref(false);
  const currentCallPartner = ref<string | null>(null);
  const callType = ref<"audio" | "video">("video"); // Default to video call
  const callStatus = ref<
    "idle" | "calling" | "ringing" | "connected" | "ended"
  >("idle");
  const answeredCalls = ref(new Set<string>()); // Track which calls have received answers
  const callStartTime = ref<number | null>(null);
  const incomingOffer = ref<RTCSessionDescriptionInit | null>(null);

  // UI references
  const localVideoRef = ref<HTMLVideoElement | null>(null);
  const remoteVideoRef = ref<HTMLVideoElement | null>(null);
  const remoteAudioRef = ref<HTMLAudioElement | null>(null);
  const isMuted = ref(false);
  const isVideoOff = ref(false);
  const isSpeakerOn = ref(true); // For mobile speaker control

  // STUN/TURN servers configuration
  const iceServers = computed(() => {
    return {
      iceServers: [
        // Google STUN servers
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        // Add TURN servers for production if needed for better NAT traversal
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'username',
        //   credential: 'credential'
        // }
      ],
    };
  });

  // Cleanup resources
  const cleanupMedia = () => {
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop());
      localStream.value = null;
    }
    if (remoteStream.value) {
      remoteStream.value.getTracks().forEach((track) => track.stop());
      remoteStream.value = null;
    }
  };

  // Handle media stream changes to update video elements
  watch(localStream, (newStream) => {
    if (localVideoRef.value && newStream) {
      localVideoRef.value.srcObject = newStream;
    }
  });

  watch(remoteStream, (newStream) => {
    if (remoteVideoRef.value && newStream) {
      remoteVideoRef.value.srcObject = newStream;
    }
    if (remoteAudioRef.value && newStream) {
      remoteAudioRef.value.srcObject = newStream;
    }
  });

  // Toggle audio mute
  const toggleMute = () => {
    isMuted.value = !isMuted.value;
    if (localStream.value) {
      const audioTracks = localStream.value.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !isMuted.value;
      });
    }
  };

  // Toggle video on/off (with renegotiation support)
  const toggleVideo = async () => {
    if (!isInCall.value || !currentCallPartner.value) return;

    const peerConnection = peerConnections.value.get(currentCallPartner.value);
    if (!peerConnection) return;

    const existingVideoTracks = localStream.value?.getVideoTracks() || [];
    if (existingVideoTracks.length > 0) {
      // Toggle existing track
      isVideoOff.value = !isVideoOff.value;
      existingVideoTracks.forEach((track) => {
        track.enabled = !isVideoOff.value;
      });
    } else {
      // Switch from audio to video (renegotiation) or start video if off
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (localStream.value) {
          localStream.value.addTrack(videoTrack);
        } else {
          localStream.value = videoStream;
        }

        const sender = peerConnection.addTrack(videoTrack, localStream.value!);
        
        // Trigger renegotiation
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socketStore.socket?.emit("call-offer", {
          to: currentCallPartner.value,
          offer,
          callType: "video",
        });

        callType.value = "video";
        isVideoOff.value = false;
      } catch (error: any) {
        console.error("Failed to enable video during call:", error);
        if (import.meta.client) {
          import("vue3-toastify").then(({ toast }) => {
            toast.error("Could not enable video. Please check your camera permissions.", {
              position: "top-center",
              theme: "dark",
            });
          });
        }
      }
    }
  };

  // Toggle speaker (for mobile)
  const toggleSpeaker = () => {
    isSpeakerOn.value = !isSpeakerOn.value;
  };

  // Create a new RTCPeerConnection
  const createPeerConnection = (userId: string): RTCPeerConnection => {
    const peerConnection = new RTCPeerConnection(iceServers.value);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketStore.socket) {
        socketStore.socket.emit("ice-candidate", {
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    // Handle track events
    peerConnection.ontrack = (event) => {
      remoteStream.value = event.streams[0];
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state changed:", peerConnection.connectionState);
      switch (peerConnection.connectionState) {
        case "connected":
          callStatus.value = "connected";
          if (!callStartTime.value) callStartTime.value = Date.now();
          break;
        case "disconnected":
          // Automatic Reconnection Attempt (ICE Restart)
          console.warn("WebRTC disconnected, attempting ICE restart...");
          attemptIceRestart(userId);
          
          setTimeout(() => {
            if (
              peerConnection.connectionState === "disconnected" &&
              callStatus.value !== "ended"
            ) {
              endCall("missed"); // If it stays disconnected, mark as missed/failed
            }
          }, 10000); // Wait longer for recovery
          break;
        case "failed":
          console.error("WebRTC connection failed, attempting recovery...");
          attemptIceRestart(userId);
          break;
        case "closed":
          if (callStatus.value !== "ended") endCall();
          break;
      }
    };

    return peerConnection;
  };

  const attemptIceRestart = async (userId: string) => {
    const pc = peerConnections.value.get(userId);
    if (!pc || pc.signalingState === "closed") return;

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socketStore.socket?.emit("call-offer", {
        to: userId,
        offer,
        callType: callType.value,
        isRestart: true
      });
    } catch (e) {
      console.error("Failed to initiate ICE restart:", e);
    }
  };

  // Helper for media constraints with echo cancellation
  const getMediaConstraints = (type: "audio" | "video", hasAudio: boolean, hasVideo: boolean): MediaStreamConstraints => {
    const audioConstraints = hasAudio ? {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } : false;

    return {
      audio: audioConstraints,
      video: (type === "video" && hasVideo) ? {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } : false
    };
  };

  // Start a call
  const initiateCall = async (
    userId: string,
    type: "audio" | "video" = "video",
  ) => {
    if (isInCall.value) {
      // Use a custom event or reactive state instead of alert
      console.warn("Already in a call");
      return Promise.reject(new Error("Already in a call"));
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudio = devices.some(d => d.kind === "audioinput");
      const hasVideo = devices.some(d => d.kind === "videoinput");

      // Even if no hardware, we still allow starting the call (receiving only)
      let constraints: MediaStreamConstraints = {
        audio: hasAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: (type === "video" && hasVideo) ? {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      };

      if (hasAudio || (type === "video" && hasVideo)) {
        localStream.value = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        console.warn("Starting call without local media (no hardware found)");
        localStream.value = new MediaStream();
      }

      callType.value = type;
      callStatus.value = "calling";
      isInCall.value = true;
      currentCallPartner.value = userId;

      const peerConnection = createPeerConnection(userId);
      peerConnections.value.set(userId, peerConnection);

      // Add tracks and set priority
      if (localStream.value) {
        for (const track of localStream.value.getTracks()) {
          const sender = peerConnection.addTrack(track, localStream.value);
          if (track.kind === "audio" && sender.setParameters) {
            const params = sender.getParameters();
            if (!params.encodings) params.encodings = [{}];
            params.encodings[0].priority = "high";
            params.encodings[0].networkPriority = "high";
            await sender.setParameters(params);
          }
        }
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true, // Always try to receive even if not sending
      });
      await peerConnection.setLocalDescription(offer);

      socketStore.socket?.emit("call-offer", { to: userId, offer, callType: type });
      return Promise.resolve(true);
    } catch (error: any) {
      console.error("Error starting call:", error);
      cleanupMedia();
      isInCall.value = false;
      currentCallPartner.value = null;
      callStatus.value = "idle";
      return Promise.reject(error);
    }
  };

  // Handle call offer
  const handleCallOffer = async (data: {
    from: string;
    fromName: string;
    offer: RTCSessionDescriptionInit;
    callType?: "audio" | "video";
    isRestart?: boolean;
  }) => {
    // Robustness: Allow renegotiation/restarts from the current partner
    if (isInCall.value && data.from === currentCallPartner.value) {
      const pc = peerConnections.value.get(data.from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketStore.socket?.emit("call-answer", {
            to: data.from,
            answer,
            callType: callType.value
          });
          return;
        } catch (e) {
          console.error("Renegotiation failed:", e);
        }
      }
    }

    if (isInCall.value || callStatus.value === "ringing") {
      socketStore.socket?.emit("call-declined", { to: data.from, reason: "busy" });
      return;
    }

    // Instead of confirm(), we set state for a custom UI
    currentCallPartner.value = data.from;
    callType.value = data.callType || "video";
    callStatus.value = "ringing";
    incomingOffer.value = data.offer;
    isInCall.value = false;

    // The actual "Accept" will be called from the custom UI calling acceptIncomingCall()
  };

  const acceptIncomingCall = async (offer: RTCSessionDescriptionInit) => {
    if (!currentCallPartner.value) return;
    
    try {
      isInCall.value = true;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudio = devices.some(d => d.kind === "audioinput");
      const hasVideo = devices.some(d => d.kind === "videoinput");

      const type = callType.value;
      const constraints: MediaStreamConstraints = {
        audio: hasAudio ? {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        } : false,
        video: (type === "video" && hasVideo) ? {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      };

      if (hasAudio || (type === "video" && hasVideo)) {
        localStream.value = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        localStream.value = new MediaStream();
      }

      const peerConnection = createPeerConnection(currentCallPartner.value);
      peerConnections.value.set(currentCallPartner.value, peerConnection);

      if (localStream.value) {
        for (const track of localStream.value.getTracks()) {
          const sender = peerConnection.addTrack(track, localStream.value);
          if (track.kind === "audio" && sender.setParameters) {
            const params = sender.getParameters();
            if (!params.encodings) params.encodings = [{}];
            params.encodings[0].priority = "high";
            params.encodings[0].networkPriority = "high";
            await sender.setParameters(params);
          }
        }
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      if (socketStore.socket) {
        socketStore.socket.emit("call-answer", { to: currentCallPartner.value, answer, callType: type }, async (candidates: any[]) => {
          if (candidates && Array.isArray(candidates)) {
            for (const c of candidates) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
            }
          }
        });
        callStatus.value = "connected";
      }
    } catch (error: any) {
      console.error("Error accepting call:", error);
      endCall();
    }
  };

  const declineIncomingCall = () => {
    if (currentCallPartner.value) {
      socketStore.socket?.emit("call-declined", { to: currentCallPartner.value, reason: "declined" });
    }
    endCall("declined");
  };

  // Handle call answer
  const handleCallAnswer = async (data: {
    from: string;
    answer: RTCSessionDescriptionInit;
    callType?: "audio" | "video";
  }) => {
    try {
      if (answeredCalls.value.has(data.from)) return;
      const pc = peerConnections.value.get(data.from);
      if (pc && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        callStatus.value = "connected";
        answeredCalls.value.add(data.from);
        if (data.callType) callType.value = data.callType;
      }
    } catch (error) {
      console.error("Error handling call answer:", error);
      endCall("failed");
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
    const pc = peerConnections.value.get(data.from);
    if (pc && pc.signalingState !== "closed") {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
    }
  };

  const handleCallDeclined = (data: { from: string; fromName: string; reason: string }) => {
    if (currentCallPartner.value === data.from) {
      if (import.meta.client) {
        import("vue3-toastify").then(({ toast }) => {
          toast.warning(`Call declined: ${data.reason === 'busy' ? 'User is busy' : 'User declined the call'}`, {
            position: "top-center",
            theme: "dark",
            autoClose: 5000,
          });
        });
      }
      endCall(data.reason); // Pass "declined" or "busy"
    }
  };

  const handleCallEnded = (data: { from: string }) => {
    if (currentCallPartner.value === data.from) endCall();
  };

  // End call
  const endCall = (reason: string = "ended") => {
    let duration = 0;
    const wasConnected = callStatus.value === "connected";
    const wasInCall = isInCall.value || callStatus.value === "calling" || callStatus.value === "ringing";

    if (callStartTime.value && wasConnected) {
      duration = Math.floor((Date.now() - callStartTime.value) / 1000);
    }

    const previousPartner = currentCallPartner.value;
    const previousType = callType.value;

    // Immediately update status to prevent further logic triggers
    callStatus.value = "ended";
    isInCall.value = false;

    // Close connections immediately
    peerConnections.value.forEach(pc => {
      pc.onconnectionstatechange = null;
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
    });
    peerConnections.value.clear();
    answeredCalls.value.clear();
    cleanupMedia();

    if (previousPartner && socketStore.socket) {
      // Notify the other peer
      socketStore.socket.emit("call-ended", { to: previousPartner });
      
      // Emit footprint for persistence
      if (wasInCall) {
        socketStore.socket.emit("call-fingerprint", {
          to: previousPartner,
          duration: wasConnected ? duration : 0,
          callType: previousType,
          status: reason === "ended" ? (wasConnected ? "completed" : "cancelled") : reason
        });
      }
    }

    currentCallPartner.value = null;
    callStartTime.value = null;
    isMuted.value = false;
    isVideoOff.value = false;
  };

  const setupSocketListeners = () => {
    if (!socketStore.socket) return;
    socketStore.socket.on("call-offer", handleCallOffer);
    socketStore.socket.on("call-answer", handleCallAnswer);
    socketStore.socket.on("ice-candidate", handleIceCandidate);
    socketStore.socket.on("call-declined", handleCallDeclined);
    socketStore.socket.on("call-ended", handleCallEnded);
    
    // Auto-reconnect/Robustness: Watch for socket reconnection
    socketStore.socket.on("connect", () => {
      if (isInCall.value && currentCallPartner.value) {
        console.log("Socket reconnected during call, attempting to maintain connection...");
        // In a real robust implementation, we might trigger ICE restart here
      }
    });
  };

  const removeSocketListeners = () => {
    if (!socketStore.socket) return;
    socketStore.socket.off("call-offer", handleCallOffer);
    socketStore.socket.off("call-answer", handleCallAnswer);
    socketStore.socket.off("ice-candidate", handleIceCandidate);
    socketStore.socket.off("call-declined", handleCallDeclined);
    socketStore.socket.off("call-ended", handleCallEnded);
  };

  const cleanup = () => {
    removeSocketListeners();
    if (isInCall.value) endCall();
    cleanupMedia();
  };

  onUnmounted(cleanup);

  return {
    localStream,
    remoteStream,
    isInCall,
    currentCallPartner,
    callType,
    callStatus,
    incomingOffer,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    initiateCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    handleCallOffer,
    handleCallAnswer,
    handleIceCandidate,
    handleCallDeclined,
    handleCallEnded,
    setupSocketListeners,
    removeSocketListeners,
    cleanup,
  };
}
