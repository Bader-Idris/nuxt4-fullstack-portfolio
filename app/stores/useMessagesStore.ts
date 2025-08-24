interface Message {
  fromName: string;
  fromSocketId: string;
  toSocketId: string;
  message: string;
  timestamp: string;
  id: string;
  from?: string;
  to?: string;
}

export const useMessagesStore = defineStore("messages", {
  state: () => ({
    // A map to hold messages for each conversation (recipient)
    conversations: new Map<string, Message[]>(),
    page: 1,
    limit: 20,
    isLoading: false,
  }),
  actions: {
    setLoading(isLoading: boolean) {
      this.isLoading = isLoading;
    },
    addMessage(message: Message) {
      const recipientId = message.from === useUserStore().user.userId ? message.to : message.from;
      if (!recipientId) return;

      const conversation = this.conversations.get(recipientId) || [];
      // Check for duplicates by ID before adding
      if (!conversation.some((m) => m.id === message.id)) {
        conversation.push(message);
        this.conversations.set(recipientId, conversation);
      }
    },
    setMessages(recipientId: string, newMessages: Message[]) {
      const existingMessages = this.conversations.get(recipientId) || [];
      const uniqueNewMessages = newMessages.filter(
        (newMsg) => !existingMessages.some((existingMsg) => existingMsg.id === newMsg.id)
      );
      this.conversations.set(recipientId, [...uniqueNewMessages, ...existingMessages]);
      this.isLoading = false;
    },
    clearAllData() {
      this.conversations.clear();
      this.page = 1;
    },
    incrementPage() {
      this.page++;
    },
  },
  getters: {
    getMessagesForRecipient: (state) => (recipientId: string): Message[] => {
      return state.conversations.get(recipientId) || [];
    },
    isEndOfHistory: (state) => (recipientId: string): boolean => {
        const conversation = state.conversations.get(recipientId);
        // This is a simplification. A more robust solution would involve the server
        // indicating if there are more messages to load.
        return conversation ? conversation.length < state.page * state.limit : false;
    },
  },
});
