interface OnlineUser {
  userId: string;
  socketId: string;
  name: string;
  role: string;
}

export const useOnlineUsersStore = defineStore("onlineUsers", {
  state: () => ({
    users: [] as OnlineUser[],
  }),
  actions: {
    setUsers(users: OnlineUser[]) {
      this.users = users;
    },
    addUser(user: OnlineUser) {
      // Avoid duplicates
      if (!this.users.some((u) => u.userId === user.userId)) {
        this.users.push(user);
      }
    },
    removeUser(userId: string) {
      this.users = this.users.filter((u) => u.userId !== userId);
    },
    clearUsers() {
      this.users = [];
    },
  },
  getters: {
    getOnlineUsers: (state) => state.users,
  },
});