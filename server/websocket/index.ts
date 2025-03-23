import { defineWebSocketHandler } from "h3";

export default defineWebSocketHandler({
  open(peer) {
    // Access cookies from the request
    const accessToken = getCookie(peer.request.event, "accessToken");
    const refreshToken = getCookie(peer.request.event, "refreshToken");

    // Validate tokens here
    // If valid, you can store the peer with associated user info

    console.log("WebSocket connected", peer.id);
  },

  message(peer, message) {
    // Handle incoming messages
    try {
      const data = JSON.parse(message);
      // Process the message based on its type

      // You can send a response back
      peer.send(
        JSON.stringify({
          status: "success",
          message: "Message received",
        })
      );
    } catch (error) {
      console.error("Error processing message:", error);
    }
  },

  close(peer) {
    console.log("WebSocket disconnected", peer.id);
  },
});
