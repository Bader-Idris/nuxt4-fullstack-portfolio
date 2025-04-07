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
    messages: [] as Message[],
    page: 1,
    limit: 20,
  }),
  actions: {
    addMessage(message: Message) {
      // Check for duplicates by ID before adding
      if (!this.messages.some((m) => m.id === message.id)) {
        this.messages.push(message);
      }
    },
    setMessages(newMessages: Message[]) {
      // Filter out duplicates when setting messages
      const uniqueMessages = newMessages.filter(
        (newMsg) =>
          !this.messages.some((existingMsg) => existingMsg.id === newMsg.id)
      );
      this.messages = [...this.messages, ...uniqueMessages];
    },
    clearMessages() {
      this.messages = [];
    },
    incrementPage() {
      this.page++;
    },
  },
  getters: {
    getFilteredMessages: (state) => {
      // You can add filtering logic here based on user role
      return state.messages;
    },
  },
});
