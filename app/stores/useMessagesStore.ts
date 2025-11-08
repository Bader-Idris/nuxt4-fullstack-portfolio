import { useUserStore } from '~/stores/useUserSocket';

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

interface Contact {
  userId: string;
  name: string;
  lastMessage: {
    id: string;
    message: string;
    timestamp: string;
    from: string;
    to: string;
  };
}

export const useMessagesStore = defineStore("messages", {
  state: () => ({
    // A map to hold messages for each conversation (recipient)
    conversations: new Map<string, Message[]>(),
    page: 1,
    limit: 20,
    isLoading: false,

    // Contacts related state
    contacts: [] as Contact[],
    contactsPage: 1,
    contactsLimit: 20,
    isLoadingContacts: false,
    hasMoreContacts: true,
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
      this.clearContacts(); // Also clear contacts when clearing all data
    },
    incrementPage() {
      this.page++;
    },

    // Contacts related actions
    async fetchContacts() {
      if (this.isLoadingContacts || !this.hasMoreContacts) return;

      this.isLoadingContacts = true;
      const { useSocketStore } = await import('~/stores/useSocketStore');
      const socketStore = useSocketStore();

      socketStore.socket?.emit('get-contacts', { page: this.contactsPage, limit: this.contactsLimit }, (response: { contacts: Contact[], error?: string }) => {
        if (response.error) {
          console.error('Error fetching contacts:', response.error);
          this.isLoadingContacts = false;
          return;
        }

        if (response.contacts.length > 0) {
          this.contacts.push(...response.contacts);
          this.contactsPage++;
        } else {
          this.hasMoreContacts = false;
        }
        this.isLoadingContacts = false;
      });
    },
    clearContacts() {
      this.contacts = [];
      this.contactsPage = 1;
      this.hasMoreContacts = true;
    },
  },
  getters: {
    getMessagesForRecipient: (state) => (recipientId: string): Message[] => {
      return state.conversations.get(recipientId) || [];
    },
    isEndOfHistory: (state) => (recipientId: string): boolean => {
        const conversation = state.conversations.get(recipientId);
        return conversation ? conversation.length < state.page * state.limit : false;
    },
  },
});