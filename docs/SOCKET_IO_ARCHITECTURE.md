# Socket.IO & Authentication Architecture

This document details the real-time communication layer and the secure authentication strategy used across the platform.

## 1. Real-Time Layer (Socket.IO)

The application uses **Socket.IO 4.x** to provide low-latency, bidirectional communication for chat, signaling, and real-time updates.

### A. Modular Architecture

The Socket.IO implementation is organized into human-isolated topics for maximum maintainability:

- **`server/sockets/index.ts`**: The main orchestrator that initializes handlers and middleware.
- **`server/sockets/handlers/`**: Topic-specific event handlers (RTC, Chat, Presence, Broadcast, Lifecycle).
- **`server/sockets/state.ts`**: Encapsulated Redis state logic for online users.
- **`server/sockets/types.ts`**: Centralized, professional type definitions for all events, providing full client-server type safety.
- **`server/sockets/rate-limiters.ts`**: Production-ready rate limiting for connections and high-cost actions.

### B. Horizontal Scaling with Redis

To support multiple server instances (replicas) behind a load balancer, the system implements the **@socket.io/redis-streams-adapter**.

- **Message Pub/Sub:** All events emitted on one instance are broadcast to all other instances via Redis Streams.
- **Sticky Sessions:** Nginx is configured to use a custom `io` cookie to ensure a client stays connected to the same backend instance during the polling-to-websocket upgrade.

### C. Presence Management (Redis State)

Real-time presence is managed using atomic Redis operations to ensure consistency across the cluster:

1.  **`online_users` (Hash):** Maps every active `socketId` to its specific session data (including `deviceId`).
2.  **`unique_online_users` (Hash):** Maps `userId` to a canonical user object. This is the source of truth for the "Online Users" list in the UI.
3.  **`user_conn_count` (Hash):** An atomic counter (`HINCRBY`) that tracks the number of active connections per user. This enables professional **Multi-Device Support**.

### D. Multi-Device Flow

- **Connecting:** When a user connects, the counter is incremented. If the count is `1`, a `user-joined` event is broadcast globally.
- **Disconnecting:** When a socket disconnects, the counter is decremented. Only when the count reaches `0` is a `user-left` event broadcast, signaling that the user is completely offline.

---

## 2. Persistence Layer (MongoDB)

While Redis handles transient state (presence), **MongoDB** provides long-term persistence.

- **Chat History:** All private messages and broadcasts are saved to the `Message` collection before emission.
- **Scalable Retrieval:** Message history is fetched with pagination to ensure the UI remains performant even with thousands of messages.

---

## 3. Authentication Strategy

The system implements a dual-token JWT strategy designed for both security and seamless user experience.

### A. Access & Refresh Tokens

- **Access Token:** A short-lived JWT containing the user's basic profile (`userId`, `name`, `role`).
- **Refresh Token:** A long-lived, opaque string stored in the `Token` collection. It is used to automatically generate new access tokens without requiring the user to re-login.

### B. Cookie Security (`SameSite=Lax`)

Cookies are configured with specific attributes to balance security and compatibility:

- **`HttpOnly`:** Prevents client-side scripts from accessing tokens (mitigates XSS).
- **`Secure`:** Enforced in production to ensure tokens are only sent over HTTPS.
- **`SameSite=Lax` (Critical for Social Auth):** We use `Lax` instead of `Strict` to support **Social Login (Google/Facebook)**. OAuth providers redirect users back to our domain via POST/GET requests. Browsers often block `Strict` cookies during these cross-site transitions, leading to authentication failures. `Lax` ensures the session remains active during the redirect.

### C. Synchronized Auth Middleware

The authentication logic is synchronized between the **Nitro HTTP Server** and the **Socket.IO Server**:

1.  The middleware first attempts to validate the `accessToken`.
2.  If expired, it looks for the `refreshToken` cookie.
3.  It validates the refresh token against MongoDB and checks the `isValid` flag.
4.  If valid, it populates the user context (`event.context.user` or `socket.data.user`) for the remainder of the session.

---

## 4. Professional Implementation Notes

- **Nginx Integration:** The architecture respects the `map $cookie_io $backend` configuration in Nginx, allowing for professional sticky session management based on device identity.
- **Fail-Safe:** The socket connection handler is wrapped in a global `try-catch` block to prevent `unhandledRejection` errors from crashing the Node.js process during authentication failures or session timeouts.
- **Type Safety:** The entire socket layer uses professional TypeScript interfaces for `ServerToClientEvents`, `ClientToServerEvents`, and `SocketData`, providing robust compile-time checks and IDE autocompletion.