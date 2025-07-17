import { useSocketStore } from "~/stores/useSocketStore";

export function useWebRTC() {
  const socketStore = useSocketStore();

  // WebRTC variables
  const peerConnections = ref(new Map());
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null>(null);
  const isInCall = ref(false);
  const currentCallPartner = ref<string | null>(null);

  const localVideoRef = ref<HTMLVideoElement | null>(null);
  const remoteVideoRef = ref<HTMLVideoElement | null>(null);
  const isMuted = ref(false);
  const isVideoOff = ref(false);

  // Watch for stream changes to update video elements
  watch(localStream, (newStream) => {
    if (localVideoRef.value && newStream) {
      localVideoRef.value.srcObject = newStream;
    }
  });

  watch(remoteStream, (newStream) => {
    if (remoteVideoRef.value && newStream) {
      remoteVideoRef.value.srcObject = newStream;
    }
  });

  // Toggle audio mute
  const toggleMute = () => {
    if (localStream.value) {
      const audioTracks = localStream.value.getAudioTracks();
      audioTracks.forEach((track) => (track.enabled = !track.enabled));
      isMuted.value = !audioTracks[0]?.enabled;
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    if (localStream.value) {
      const videoTracks = localStream.value.getVideoTracks();
      videoTracks.forEach((track) => (track.enabled = !track.enabled));
      isVideoOff.value = !videoTracks[0]?.enabled;
    }
  };

  // STUN/ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      // You can add TURN servers for NAT traversal
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'username',
      //   credential: 'credential'
      // }
    ],
  };

  // Initiate a call
  const initiateCall = async (userId: string) => {
    if (isInCall.value) {
      alert("You are already in a call.");
      return;
    }
    try {
      // Get local media stream
      localStream.value = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Create peer connection
      const peerConnection = new RTCPeerConnection(iceServers);
      peerConnections.value.set(userId, peerConnection);

      // Add local tracks to connection
      localStream.value.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream.value);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to the other peer via your signaling server
          const socket = socketStore.getSocket;
          if (socket) {
            socket.emit("ice-candidate", {
              to: userId,
              candidate: event.candidate,
            });
          }
        }
      };

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        remoteStream.value = event.streams[0];
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const socket = socketStore.getSocket;
      if (socket) {
        socket.emit("call-offer", {
          to: userId,
          offer: peerConnection.localDescription,
        });
      }

      isInCall.value = true;
      currentCallPartner.value = userId;
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  // Handle incoming call offer
  const handleCallOffer = async (data: {
    from: string;
    fromName: string;
    offer: RTCSessionDescriptionInit;
  }) => {
    if (isInCall.value) { // TODO: check this collision
      const socket = socketStore.getSocket;
      if (socket) {
        socket.emit("call-declined", { to: data.from });
      }
      return;
    }
    const acceptCall = confirm(`Incoming call from ${data.fromName}. Accept?`);
    if (!acceptCall) {
      const socket = socketStore.getSocket;
      if (socket) {
        socket.emit("call-declined", { to: data.from });
      }
      return;
    }
    try {
      if (!localStream.value) {
        localStream.value = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(iceServers);
      peerConnections.value.set(data.from, peerConnection);

      // Add local tracks to connection
      localStream.value.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream.value);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = socketStore.getSocket;
          if (socket) {
            socket.emit("ice-candidate", {
              to: data.from,
              candidate: event.candidate,
            });
          }
        }
      };

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        remoteStream.value = event.streams[0];
      };

      peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === "disconnected" || peerConnection.iceConnectionState === "failed") {
          endCall();
        }
      };

      // Set remote description (the offer)
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      const socket = socketStore.getSocket;
      if (socket) {
        socket.emit("call-answer", {
          to: data.from,
          answer: peerConnection.localDescription,
        });
      }

      isInCall.value = true;
      currentCallPartner.value = data.from;
    } catch (error) {
      console.error("Error handling call offer:", error);
      endCall(); // TODO: de we have to end it?
    }
  };

  // Handle call answer
  const handleCallAnswer = async (data: {
    from: string;
    answer: RTCSessionDescriptionInit;
  }) => {
    try {
      const peerConnection = peerConnections.value.get(data.from);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    } catch (error) {
      console.error("Error handling call answer:", error);
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = (data: {
    from: string;
    candidate: RTCIceCandidateInit;
  }) => {
    try {
      const peerConnection = peerConnections.value.get(data.from);
      if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  };

  // End call
  const endCall = () => {
    if (currentCallPartner.value) {
      const peerConnection = peerConnections.value.get(
        currentCallPartner.value
      );
      if (peerConnection) {
        peerConnection.close();
        peerConnections.value.delete(currentCallPartner.value);
      }

      // Notify the other user
      const socket = socketStore.getSocket;
      if (socket) {
        socket.emit("call-ended", {
          to: currentCallPartner.value,
        });
      }
    }

    // Stop all tracks in local stream
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop());
      localStream.value = null;
    }

    remoteStream.value = null;
    isInCall.value = false;
    currentCallPartner.value = null;
  };

  // Setup socket listeners
  const setupSocketListeners = () => {
    const socket = socketStore.getSocket;
    if (socket) {
      socket.on("call-offer", handleCallOffer);
      socket.on("call-answer", handleCallAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("call-declined", (data) => {
        alert(`Call declined by ${data.fromName}`); // TODO: might change it to smoother UI other tan alert!
        endCall();
      });
      socket.on("call-ended", (data) => {
        alert(`Call ended by ${data.fromName}`);
        endCall();
      });
    }
  };

  // Cleanup function
  const cleanup = () => {
    endCall();
    const socket = socketStore.getSocket;
    if (socket) {
      socket.off("call-offer");
      socket.off("call-answer");
      socket.off("ice-candidate");
      socket.off("call-declined");
      socket.off("call-ended");
    }
  };

  // Clean up on component unmount
  onUnmounted(() => {
    cleanup();
  });

  return {
    localStream,
    remoteStream,
    isInCall,
    currentCallPartner,
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isVideoOff,
    initiateCall,
    handleCallOffer, // are they in dashboard
    handleCallAnswer, // are they in dashboard
    handleIceCandidate, // are they in dashboard
    endCall,
    toggleMute,
    toggleVideo,
    setupSocketListeners,
    cleanup, // are they in dashboard
  };
}
