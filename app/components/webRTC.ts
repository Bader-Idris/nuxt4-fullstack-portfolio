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
  const callType = ref<'audio' | 'video'>('video'); // Default to video call
  const callStatus = ref<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const answeredCalls = ref(new Set<string>()); // Track which calls have received answers

  // UI references
  const localVideoRef = ref<HTMLVideoElement | null>(null);
  const remoteVideoRef = ref<HTMLVideoElement | null>(null);
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
      localStream.value.getTracks().forEach(track => track.stop());
      localStream.value = null;
    }
    if (remoteStream.value) {
      remoteStream.value.getTracks().forEach(track => track.stop());
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

  // Toggle speaker (for mobile)
  const toggleSpeaker = () => {
    isSpeakerOn.value = !isSpeakerOn.value;
    // On mobile, you might need to use Capacitor's audio management
    // This is a placeholder for actual speaker routing
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
      // Only use the first stream for simplicity
      remoteStream.value = event.streams[0];
    };

    // Handle connection state changes with improved resilience
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', peerConnection.connectionState);
      switch (peerConnection.connectionState) {
        case 'connected':
          callStatus.value = 'connected';
          break;
        case 'disconnected':
          // Don't end call immediately on disconnect - allow for reconnection
          console.log('Connection temporarily lost, attempting to reconnect...');
          // Wait briefly to see if it reconnects automatically before ending call
          setTimeout(() => {
            if (peerConnection.connectionState === 'disconnected' && callStatus.value !== 'ended') {
              // If still disconnected after delay, end call
              endCall();
            }
          }, 5000); // Wait 5 seconds before ending call
          break;
        case 'failed':
          console.error('Connection failed, ending call');
          endCall();
          break;
        case 'closed':
          console.log('Connection closed');
          endCall();
          break;
      }
    };

    // Handle ICE connection state changes - making it resilient to temporary network issues
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', peerConnection.iceConnectionState);
      switch (peerConnection.iceConnectionState) {
        case 'connected':
        case 'completed':
          callStatus.value = 'connected';
          break;
        case 'disconnected':
          // Don't end call immediately on disconnect - allow for reconnection
          console.log('Connection temporarily lost, attempting to reconnect...');
          // Could implement reconnection logic here if needed
          break;
        case 'failed':
          // Only end call on failure, not just disconnection
          console.error('Connection failed, ending call');
          endCall();
          break;
        case 'closed':
          if (callStatus.value !== 'ended') {
            endCall();
          }
          break;
      }
    };

    return peerConnection;
  };

  // Start a call with a specific user
  const initiateCall = async (userId: string, type: 'audio' | 'video' = 'video') => {
    if (isInCall.value) {
      alert("You are already in a call.");
      return Promise.reject(new Error("Already in a call"));
    }

    // Check if the user is online before initiating a call
    const { useOnlineUsersStore } = await import('~/stores/useOnlineUsersStore');
    const onlineUsersStore = useOnlineUsersStore();
    const isUserOnline = onlineUsersStore.users.some(user => user.userId === userId);

    if (!isUserOnline && userId !== userStore.user.userId) {
      alert('This user is no longer online.');
      return Promise.reject(new Error("User not online"));
    }

    try {
      // Check for available media devices first
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Determine what devices are available
      const hasAudio = devices.some(device => device.kind === 'audioinput' && device.deviceId !== 'default' && device.deviceId !== 'communications');
      const hasVideo = type === 'video' && devices.some(device => device.kind === 'videoinput' && device.deviceId !== 'default');

      // Define media constraints with better audio settings to prevent feedback
      let audioConstraints: boolean | MediaTrackConstraints = hasAudio;
      if (hasAudio) {
        audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Optional: specify a specific audio device if available
          // deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined
        };
      }

      const mediaConstraints: MediaStreamConstraints = {
        video: (hasVideo && type === 'video') ? true : false,
        audio: type === 'audio' ? audioConstraints : (hasAudio ? audioConstraints : false),
      };

      // Try to access media devices only if they are available
      if ((hasAudio && (type === 'audio' || type === 'video')) || (hasVideo && type === 'video')) {
        localStream.value = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      } else {
        // If no devices are available but it's an audio call, we can try to create a connection anyway
        // but warn the user
        if (type === 'audio') {
          console.warn("No audio input devices found, proceeding with audio call that may not capture audio...");
        } else if (type === 'video') {
          console.warn("No video input devices found, proceeding with video call without local video...");
        }
      }

      // Update call state
      callType.value = type;
      callStatus.value = 'calling';
      isInCall.value = true;
      currentCallPartner.value = userId;

      // Create peer connection
      const peerConnection = createPeerConnection(userId);
      peerConnections.value.set(userId, peerConnection);

      // Add local tracks to connection if available
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream.value!);
        });
      }

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await peerConnection.setLocalDescription(offer);

      // Send offer via socket
      if (socketStore.socket) {
        socketStore.socket.emit("call-offer", {
          to: userId,
          offer,
          callType: type,
        });
        return Promise.resolve(true);
      } else {
        throw new Error("Socket not available");
      }
    } catch (error: any) {
      console.error("Error starting call:", error);

      // Handle specific device not found error more gracefully
      if (error.name === 'NotFoundError' || error.message.includes('Requested device not found')) {
        alert(`Cannot start ${type} call: media device not found. Please check your camera and microphone permissions.`);
      } else if (error.name === 'NotAllowedError') {
        alert(`Cannot start ${type} call: media access denied. Please check your browser permissions.`);
      } else if (error.message) {
        alert(`Cannot start ${type} call: ${error.message}`);
      }

      cleanupMedia();
      isInCall.value = false;
      currentCallPartner.value = null;
      callStatus.value = 'idle';
      return Promise.reject(error);
    }
  };

  // Handle incoming call offer
  const handleCallOffer = async (data: {
    from: string;
    fromName: string;
    offer: RTCSessionDescriptionInit;
    callType?: 'audio' | 'video';
  }) => {
    if (isInCall.value) {
      // Busy: reject the call
      if (socketStore.socket) {
        socketStore.socket.emit("call-declined", { 
          to: data.from,
          reason: 'busy'
        });
      }
      return;
    }

    const callTypeLocal = data.callType || 'video';
    
    // Show call modal/confirmation
    const acceptCall = confirm(`Incoming ${callTypeLocal} call from ${data.fromName}. Accept?`);
    
    if (!acceptCall) {
      if (socketStore.socket) {
        socketStore.socket.emit("call-declined", { 
          to: data.from,
          reason: 'declined'
        });
      }
      return;
    }

    try {
      // Check for available media devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Determine what devices are available
      const hasAudio = devices.some(device => device.kind === 'audioinput' && device.deviceId !== 'default' && device.deviceId !== 'communications');
      const hasVideo = callTypeLocal === 'video' && devices.some(device => device.kind === 'videoinput' && device.deviceId !== 'default');
      
      // Define media constraints with better audio settings to prevent feedback
      let audioConstraints: boolean | MediaTrackConstraints = hasAudio;
      if (hasAudio && (callTypeLocal === 'audio' || callTypeLocal === 'video')) {
        audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Optional: specify a specific audio device if available
          // deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined
        };
      }

      const mediaConstraints: MediaStreamConstraints = {
        video: (hasVideo && callTypeLocal === 'video') ? true : false,
        audio: callTypeLocal === 'audio' ? audioConstraints : (hasAudio ? audioConstraints : false),
      };

      // Try to access media devices only if they are available
      if ((hasAudio && (callTypeLocal === 'audio' || callTypeLocal === 'video')) || (hasVideo && callTypeLocal === 'video')) {
        localStream.value = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      } else {
        // If no devices are available but it's an audio call, we can try to create a connection anyway
        // but warn the user
        if (callTypeLocal === 'audio') {
          console.warn("No audio input devices found, proceeding with audio call that may not capture audio...");
        } else if (callTypeLocal === 'video') {
          console.warn("No video input devices found, proceeding with video call without local video...");
        }
      }

      // Update call state
      callType.value = callTypeLocal;
      callStatus.value = 'ringing';
      isInCall.value = true;
      currentCallPartner.value = data.from;

      // Create peer connection
      const peerConnection = createPeerConnection(data.from);
      peerConnections.value.set(data.from, peerConnection);

      // Add local tracks to connection if available
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream.value!);
        });
      }

      // Set remote description (the offer)
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      // Create and send answer
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callTypeLocal === 'video',
      });
      await peerConnection.setLocalDescription(answer);

      // Send answer via socket
      if (socketStore.socket) {
        socketStore.socket.emit("call-answer", {
          to: data.from,
          answer,
        });
        callStatus.value = 'connected';
      }
    } catch (error: any) {
      console.error("Error handling call offer:", error);
      
      // Handle specific device not found error more gracefully
      if (error.name === 'NotFoundError' || error.message.includes('Requested device not found')) {
        alert(`Cannot accept ${callTypeLocal} call: media device not found. Please check your camera and microphone permissions.`);
      } else if (error.name === 'NotAllowedError') {
        alert(`Cannot accept ${callTypeLocal} call: media access denied. Please check your browser permissions.`);
      } else if (error.message) {
        alert(`Cannot accept ${callTypeLocal} call: ${error.message}`);
      }
      
      endCall();
    }
  };

  // Handle call answer from remote user
  const handleCallAnswer = async (data: {
    from: string;
    answer: RTCSessionDescriptionInit;
    callType?: 'audio' | 'video';
  }) => {
    try {
      // Prevent duplicate processing of answers
      if (answeredCalls.value.has(data.from)) {
        console.warn("Answer already processed for this call, ignoring duplicate");
        return;
      }

      const peerConnection = peerConnections.value.get(data.from);
      if (peerConnection) {
        // Check the signaling state before attempting to set the remote description
        if (peerConnection.signalingState === 'have-local-offer') {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          callStatus.value = 'connected';
          answeredCalls.value.add(data.from); // Mark this call as answered
          
          // Update call type if provided
          if (data.callType) {
            callType.value = data.callType;
          }
        } else if (peerConnection.signalingState === 'stable') {
          console.warn("Peer connection already stable, ignoring answer for", data.from);
        } else {
          console.warn("Invalid signaling state for setting remote description:", peerConnection.signalingState, "for", data.from);
        }
      }
    } catch (error) {
      console.error("Error handling call answer:", error);
      if (error instanceof Error && (error.message.includes('wrong state') || error.message.includes('stable'))) {
        console.warn("Call answer received in wrong state, this may be a duplicate or race condition");
        // Don't end the call for state errors as they can be harmless race conditions
      } else {
        endCall();
      }
    }
  };

  // Handle ICE candidate from remote user
  const handleIceCandidate = async (data: {
    from: string;
    candidate: RTCIceCandidateInit;
  }) => {
    try {
      const peerConnection = peerConnections.value.get(data.from);
      if (peerConnection && peerConnection.signalingState !== 'closed') {
        // Only add ICE candidates if we're still in a valid state for negotiation
        if (peerConnection.signalingState === 'have-local-offer' || 
            peerConnection.signalingState === 'have-remote-offer' || 
            peerConnection.signalingState === 'stable') {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          console.warn("Peer connection not in proper state for ICE candidates:", peerConnection.signalingState);
        }
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
      if (error instanceof Error && error.message.includes('Unknown ufrag')) {
        console.warn("Received ICE candidate for already established connection, this is normal");
        // This is typically not an error condition, just means candidates came in after connection
      }
    }
  };

  // Handle call decline
  const handleCallDeclined = (data: {
    from: string;
    fromName: string;
    reason: string;
  }) => {
    console.log(`Call declined by ${data.fromName}: ${data.reason}`);
    if (currentCallPartner.value === data.from) {
      alert(`Call declined by ${data.fromName} - Reason: ${data.reason}`);
      endCall();
    }
  };

  // Handle call ended by remote user
  const handleCallEnded = (data: {
    from: string;
    fromName: string;
  }) => {
    console.log(`Call ended by ${data.fromName}`);
    if (currentCallPartner.value === data.from) {
      endCall();
    }
  };

  // End the current call
  const endCall = () => {
    console.log('Ending call');
    
    // Update call state
    callStatus.value = 'ended';
    isInCall.value = false;
    
    // Close all peer connections
    peerConnections.value.forEach((connection, userId) => {
      connection.close();
      peerConnections.value.delete(userId);
    });
    
    // Clear answered calls tracking
    answeredCalls.value.clear();
    
    // Stop media tracks
    cleanupMedia();
    
    // Notify remote user if socket is available
    if (currentCallPartner.value && socketStore.socket) {
      socketStore.socket.emit("call-ended", {
        to: currentCallPartner.value,
      });
    }
    
    // Reset state
    currentCallPartner.value = null;
    callType.value = 'video';
    isMuted.value = false;
    isVideoOff.value = false;
  };

  // Setup socket listeners for WebRTC signaling
  const setupSocketListeners = () => {
    if (!socketStore.socket) {
      console.warn("Socket not available, cannot setup WebRTC listeners");
      return;
    }

    // Listen for WebRTC signaling events
    socketStore.socket.on("call-offer", handleCallOffer);
    socketStore.socket.on("call-answer", handleCallAnswer);
    socketStore.socket.on("ice-candidate", handleIceCandidate);
    socketStore.socket.on("call-declined", handleCallDeclined);
    socketStore.socket.on("call-ended", handleCallEnded);
  };

  // Remove socket listeners
  const removeSocketListeners = () => {
    if (!socketStore.socket) return;

    socketStore.socket.off("call-offer", handleCallOffer);
    socketStore.socket.off("call-answer", handleCallAnswer);
    socketStore.socket.off("ice-candidate", handleIceCandidate);
    socketStore.socket.off("call-declined", handleCallDeclined);
    socketStore.socket.off("call-ended", handleCallEnded);
  };

  // Cleanup function
  const cleanup = () => {
    console.log('Cleaning up WebRTC');
    
    // Remove socket listeners
    removeSocketListeners();
    
    // End any ongoing call
    if (isInCall.value) {
      endCall();
    }
    
    // Close any remaining peer connections
    peerConnections.value.forEach(connection => {
      connection.close();
    });
    peerConnections.value.clear();
    answeredCalls.value.clear();
    
    // Stop media tracks
    cleanupMedia();
  };

  // Clean up on component unmount
  onUnmounted(() => {
    cleanup();
  });

  return {
    // Reactive state
    localStream,
    remoteStream,
    isInCall,
    currentCallPartner,
    callType,
    callStatus,
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    
    // Methods
    initiateCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    handleCallOffer,
    handleCallAnswer,
    handleIceCandidate,
    handleCallDeclined,
    handleCallEnded,
    
    // Setup methods
    setupSocketListeners,
    removeSocketListeners,
    cleanup,
  };
}