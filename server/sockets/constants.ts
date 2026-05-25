// Redis key for online users
export const ONLINE_USERS_KEY = "online_users"; // socketId -> userData
export const UNIQUE_ONLINE_USERS_KEY = "unique_online_users"; // userId -> userData (canonical)
export const USER_CONN_COUNT_KEY = "user_conn_count"; // userId -> count

// WebRTC Signaling keys
export const WEBRTC_OFFERS_KEY = "webrtc_offers"; // offerId -> offerDataJSON
