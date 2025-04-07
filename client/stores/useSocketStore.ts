export const useSocketStore = defineStore("socket", {
  state: () => ({
    isConnected: false,
    socket: null,
    connectionError: null,
    currentUser: null,
  }),
  actions: {
    setConnection(status: boolean) {
      this.isConnected = status;
      // console.log('Connection Status:', status);
    },
    setSocket(socket: any) {
      this.socket = socket;
    },
    setConnectionError(error: string | null) {
      // TODO: support it with i18n
      this.connectionError = error;
    },
    setCurrentUser(user: any) {
      this.currentUser = user;
    },
  },
  getters: {
    getSocket: (state) => state.socket,
    getConnectionStatus: (state) => state.isConnected,
  },
});
