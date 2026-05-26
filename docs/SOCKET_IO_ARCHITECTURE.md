# System Architecture: Real-Time & Authentication

This document provides a definitive technical overview of the platform's real-time communication layer and secure authentication strategy.

---

## 1. Authentication Strategy

The platform implements a **Stateless Dual-Token JWT Strategy** synchronized across HTTP and WebSocket layers, optimized for security and seamless session persistence.

### A. Token Lifecycle & Management

| Token Type | Storage | Lifetime | Purpose |
| :--- | :--- | :--- | :--- |
| **Access Token** | HTTP-Only Cookie | Short (1h) | Primary authorization for API and Socket.io sessions. |
| **Refresh Token** | HTTP-Only Cookie & MongoDB | Long (30d) | Rotates Access Tokens; allows for remote session revocation. |

### B. Security Implementation

- **HTTP-Only Cookies**: Tokens are inaccessible to client-side scripts, neutralizing XSS-based token theft.
- **SameSite=Lax**: Specifically chosen to support **Social Auth (OAuth2)** redirects. While `Strict` is more secure for internal links, `Lax` ensures that users returning from Google/Facebook redirects maintain their session context.
- **Synchronized Middleware**: Both the **Nitro HTTP Server** and the **Socket.io Server** share the same authentication logic. If an Access Token is expired, the middleware automatically attempts a silent refresh using the Refresh Token before processing the request/connection.

---

## 2. Real-Time Layer (Socket.io)

Built for massive scale, the real-time layer uses a distributed approach powered by Redis.

### A. Infrastructure & Horizontal Scaling

| Component | Implementation | Technical Rationale |
| :--- | :--- | :--- |
| **Cluster Sync** | `@socket.io/redis-streams-adapter` | Propagates events across multiple Node.js instances via Redis Streams. |
| **Sticky Sessions** | Nginx `ip_hash` | Required for the initial HTTP Long-Polling handshake before WebSocket upgrade. |
| **Session Recovery** | `connectionStateRecovery` | Transparently resumes sessions and buffers missed packets during brief network drops. |

### B. Presence & Multi-Device Support

We use atomic Redis operations to track user state accurately across the cluster.

1.  **`online_users` (Hash)**: Maps specific `socketId` to device/session metadata.
2.  **`user_conn_count` (Counter)**: Tracks the number of active connections per `userId`.
    *   **Logic**: `user-joined` is only emitted when the count goes `0 -> 1`. `user-left` is only emitted when the count goes `1 -> 0`. This enables users to be logged in on desktop and mobile simultaneously without presence "flickering."

---

## 3. WebRTC Signaling & Robustness

Signaling is the "orchestration" layer for Peer-to-Peer (P2P) media streams.

### A. Production Handshake Pattern

| Phase | Technical Detail | Purpose |
| :--- | :--- | :--- |
| **Offer Caching** | Redis Hash | Buffers call offers to handle asynchronous joining. |
| **ICE Backlog** | Redis List | Caches network candidates until the remote peer has set their `RemoteDescription`. |
| **Atomic ACK** | Socket.io Acknowledgment | Delivers the entire candidate backlog in one transaction to prevent race conditions. |

### B. Resilience & Human Decision Logic

- **ICE Restart**: If the P2P connection state fluctuates (e.g., Wi-Fi to 5G), the client initiates a "Restart" offer to re-negotiate the path without dropping the call.
- **Immediate Termination**: Human-initiated "End Call" clicks bypass all timeouts and retry logic. The system immediately clears local media, closes the peer connection, notifies the remote peer, and emits a **Call Footprint**.

---

## 4. Persistence Layer (MongoDB)

| Collection | Data Stored | Strategy |
| :--- | :--- | :--- |
| **`Message`** | Text & Footprints | Indexed by `from`, `to`, and `timestamp` for sub-millisecond history retrieval. |
| **`User`** | Profile & Settings | Includes `lastActiveChat` for persistent UI context. |
| **`Token`** | Refresh Tokens | Stored with `isValid` flags for instantaneous global logout. |

---

## 5. Architectural Mandates

1.  **Type Safety**: All events are defined in `server/sockets/types.ts` to ensure end-to-end TypeScript compliance.
2.  **Privacy**: Sensitive chat and calling containers are tagged with `data-clarity-mask` to prevent recording by behavioral analytics (Microsoft Clarity).
3.  **Auditability**: Every call results in a durable "Footprint" (System Message) in the database, tracking duration and termination reason (Completed, Cancelled, Missed).
