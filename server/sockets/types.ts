/**
 * Professional Type Definitions for Socket.IO Events
 * Use these for client-side type safety and server-side validation.
 */

export interface ServerToClientEvents {
  "connection-established": (data: {
    socketId: string;
    userId: string;
    name: string;
    role: string;
  }) => void;
  "online-users": (users: any[]) => void;
  "user-joined": (data: {
    userId: string;
    socketId: string;
    name: string;
    role: string;
  }) => void;
  "user-left": (userId: string) => void;
  "call-offer": (data: {
    from: string;
    fromName: string;
    offer: any;
    callType: string;
  }) => void;
  "call-answer": (data: {
    from: string;
    answer: any;
    callType: string;
  }) => void;
  "ice-candidate": (data: { from: string; candidate: any }) => void;
  "call-declined": (data: {
    from: string;
    fromName: string;
    reason: string;
  }) => void;
  "call-ended": (data: { from: string; fromName: string }) => void;
  "private-message": (data: {
    from: string;
    fromName: string;
    to: string;
    message: string;
    timestamp: Date;
    id: string;
  }) => void;
  "message-history": (data: { recipientId: string; messages: any[] }) => void;
  broadcast: (data: {
    from: string;
    fromName: string;
    message: string;
    timestamp: Date;
    id: any;
  }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "call-offer": (data: { to: string; offer: any; callType: string }) => void;
  "call-answer": (data: { to: string; answer: any; callType: string }) => void;
  "ice-candidate": (data: { to: string; candidate: any }) => void;
  "call-declined": (data: { to: string; reason: string }) => void;
  "call-ended": (data: { to: string }) => void;
  "private-message": (data: {
    to: string;
    message: string;
    timestamp: Date;
  }) => void;
  "get-message-history": (
    data: { recipientId: string; page?: number; limit?: number },
    callback: (res: { messages?: any[]; error?: string }) => void,
  ) => void;
  "get-contacts": (
    data: { page?: number; limit?: number },
    callback: (res: { contacts?: any[]; error?: string }) => void,
  ) => void;
  "get-online-users": (
    data: any,
    callback: (res: { users?: any[]; error?: string }) => void,
  ) => void;
  "update-active-chat": (recipientId: string) => void;
  broadcast: (data: { message: string; timestamp: Date }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user: {
    userId: string;
    name: string;
    role: string;
  };
}