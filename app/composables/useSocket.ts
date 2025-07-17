import { io } from 'socket.io-client';

export const useSocket = () => {
  const socket = ref(null);
  const messages = ref([]);
  const isCalling = ref(false);
  const localStream = ref(null);
  const remoteStream = ref(null);
  const peerConnection = ref(null);

  const connect = () => {
    if (socket.value) return;

    socket.value = io(useRuntimeConfig().public.originUrl, {
      withCredentials: true,
    });

    socket.value.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.value.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    socket.value.on('chat message', (data) => {
      messages.value.push(data);
    });

    socket.value.on('call_request', (data) => {
      console.log(`Call request from ${data.from.name}`);
      // Handle as admin
    });

    socket.value.on('call_response', (data) => {
      if (data.response === 'accept') {
        // Proceed with call as user
      } else {
        console.log('Call rejected');
      }
    });

    socket.value.on('offer', (data) => {
      console.log(`Received offer from ${data.from.name}`);
      // Handle offer as admin
    });

    socket.value.on('answer', (data) => {
      console.log(`Received answer from ${data.from.name}`);
      // Handle answer as user
    });
  };

  const sendMessage = (message) => {
    if (socket.value) {
      socket.value.emit('chat message', message);
    }
  };

  const initiateCall = async () => {
    try {
      localStream.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      peerConnection.value = new RTCPeerConnection();
      localStream.value.getTracks().forEach((track) => {
        peerConnection.value.addTrack(track, localStream.value);
      });

      // Send call request to admin
      socket.value.emit('call_request');

      // Wait for response
      socket.value.once('call_response', async (data) => {
        if (data.response === 'accept') {
          const offer = await peerConnection.value.createOffer();
          await peerConnection.value.setLocalDescription(offer);
          socket.value.emit('offer', offer);

          socket.value.once('answer', async (answerData) => {
            await peerConnection.value.setRemoteDescription(answerData.answer);
            isCalling.value = true;
          });
        }
      });
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  const hangUp = () => {
    if (peerConnection.value) {
      peerConnection.value.close();
      peerConnection.value = null;
    }
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop());
      localStream.value = null;
    }
    isCalling.value = false;
  };

  return {
    socket,
    messages,
    isCalling,
    connect,
    sendMessage,
    initiateCall,
    hangUp,
  };
};