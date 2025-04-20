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
        this.saveToLocalStorage();
      }
    },
    setMessages(newMessages: Message[]) {
      const reversedNewMessages = [...newMessages].reverse();
      const uniqueNewMessages = reversedNewMessages.filter(
        (newMsg) =>
          !this.messages.some((existingMsg) => existingMsg.id === newMsg.id)
      );
      this.messages = [...uniqueNewMessages, ...this.messages];
      console.log("Updated messages length:", this.messages.length);
      // Persist to localStorage
      // this.saveToLocalStorage();
    },
    clearMessages() {
      this.messages = [];
      this.page = 1;
      // Clear localStorage for this conversation
      // this.saveToLocalStorage();
    },
    incrementPage() {
      this.page++;
    },
    saveToLocalStorage(recipientUserId: string) {
      const key = `chat_messages_${recipientUserId || "default"}`;
      // const key = `chat_messages_${this.page}`;
      localStorage.setItem(key, JSON.stringify(this.messages));
    },
    loadFromLocalStorage(recipientUserId: string) {
      const key = `chat_messages_${recipientUserId || "default"}`;
      // const key = `chat_messages_${this.page}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        this.messages = JSON.parse(stored);
      }
    },
  },
  getters: {
    getFilteredMessages: (state) => {
      // You can add filtering logic here based on user role
      return state.messages;
    },
  },
});
