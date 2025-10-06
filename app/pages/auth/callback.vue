<template>
  <div class="auth-callback-container">
    <div class="spinner" />
    <p>Finalizing authentication, please wait...</p>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/useUserSocket';

const userStore = useUserStore();
const localePath = useLocalePath();

onMounted(async () => {
  try {
    // After redirect from OAuth, we have the cookie.
    // Call the /api/me endpoint to get the user data.
    const { user } = await $fetch('/api/v1/auth/me');

    if (user) {
      // This is the crucial step: set the user in the store.
      // The watcher in the store will handle localStorage and socket connection.
      userStore.setUser(user);
      
      // Redirect to the dashboard with a fully authenticated session.
      await navigateTo(localePath('/dashboard'), { replace: true });
    } else {
      // This should not happen if the cookie is valid.
      throw new Error('Could not retrieve user information.');
    }
  } catch (error) {
    console.error('Authentication callback failed:', error);
    // If anything goes wrong, send the user back to the login page.
    await navigateTo(localePath('/login?error=auth_failed'), { replace: true });
  }
});
</script>

<style scoped>
.auth-callback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20px;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;
  animation: spin 1s ease infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>