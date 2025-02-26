import { defineStore } from 'pinia'

// Define the structure of the User object
interface User {
  userId: string
  username: string
  role: string
}

// Define the state interface
interface UserState {
  user: User | null // user can be either User or null
}

// Define and export the Pinia store
export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    // Initialize user from localStorage or null
    user: JSON.parse(
      localStorage.getItem('user') || 'null',
    ),
  }),

  actions: {
    // Action to set the user in the store and localStorage
    setUser(user: User): void {
      this.user = user
      localStorage.setItem(
        'user',
        JSON.stringify(user),
      )
    },

    // Action to clear the user in the store and localStorage
    clearUser(): void {
      this.user = null
      localStorage.removeItem('user')
    },
  },

  getters: {
    // Getter to check if the user is logged in
    isLoggedIn: (state): boolean => {
      return !!(
        state.user
        && state.user.username
        && state.user.userId
        && state.user.role
      )
    },
  },
})
