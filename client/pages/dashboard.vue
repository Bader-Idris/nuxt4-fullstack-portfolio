<template>
  <div class="dashboard">
    <p v-if="user">Welcome, {{ user.username }}!</p>
    <p v-if="user">Your role: {{ user.role }}</p>
    <p v-else>Redirecting...</p>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/UserNameStore';

useSeoMeta({
  title: 'Dashboard for registered users',
  description: 'Access exclusive content, resources, and services on Bader Idris\'s platform. Join a tech-savvy community led by a skilled full-stack developer.',
})

definePageMeta({
  // middleware: 'auth', // Use the auth middleware
  // requiresAdmin: true, // Require admin role for this page
})

const route = useRoute();
const userStore = useUserStore();
// Create a ref to hold the user data
const user = ref(null);

// Only access localStorage on the client side
onMounted(() => {
  // Check localStorage first
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    const tokenUser = JSON.parse(storedUser);
    userStore.setUser(tokenUser);
    user.value = tokenUser; // Set the user for display
  } else {
    // If no user in localStorage, check query parameters
    const tokenUserEncoded = route.query.tokenUser;
    if (tokenUserEncoded) {
      const tokenUser = JSON.parse(decodeURIComponent(tokenUserEncoded));
      userStore.setUser(tokenUser);
      user.value = tokenUser; // Set the user for display
      // Optionally, you can store it in localStorage for future use
      localStorage.setItem('user', JSON.stringify(tokenUser));
    }
  }
});

if (import.meta.client) {
  watch(() => userStore.user, (newUser) => {
    user.value = newUser;
  });
}
</script>

<style lang="scss">
.dashboard {
  @include mainMiddleSettings;

  @media (max-width: 768px) {
    @include phone-borders;
  }
}
</style>
