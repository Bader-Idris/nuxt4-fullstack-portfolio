<template>
  <div class="login">
    <form class="form" @submit.prevent="login">
      <h1>Login</h1>
      <div class="input-container">
        <label for="email">Email</label>
        <input v-model="email" name="email" type="text" class="input" aria-labelledby="email" >
      </div>
      <div class="input-container">
        <label for="password">Password</label>
        <input v-model="password" name="password" type="password" class="input" aria-labelledby="password" >
      </div>
      <button class="btn" :disabled="loading">
        <span v-if="loading">
          <CustomLoader />
        </span>
        <span v-else> Login </span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import { useUserStore } from '~/stores/UserNameStore'
import { useLocalePath } from '#imports'

// Define page meta
definePageMeta({
  layout: 'default',
  // hideLayout: true,
})

// SEO Meta
useSeoMeta({
  title: 'Login Page | Bader Idris',
  description: "Log in to Bader Idris's portfolio platform to explore projects, insights, and opportunities. Your gateway to cutting-edge web and multi-platform solutions.",
})

const localePath = useLocalePath()
// State for email, password, and loading
const email = ref<string>('')
const password = ref<string>('')
const loading = ref<boolean>(false)

// UserStore instance
const userStore = useUserStore()

// Define interfaces for API response and user data
interface LoginResponse {
  user: {
    name: string
    userId: string
    role: string
  }
}

interface User {
  username: string
  userId: string
  role: string
}

// Function to handle login
const login = async (): Promise<void> => {
  loading.value = true; // TODO: check out using reloading of useFetch

  const url = `/api/v1/auth/login`
  const data = {
    email: email.value,
    password: password.value
  }

  try {
    const response = await useFetch<LoginResponse>(url, {
      method: 'POST',
      body: data,
      baseURL: useRuntimeConfig().public.originUrl,
    })

    if (!response.data.value) {
      throw new Error('Invalid response format')
    }

    const result = response.data.value

    // Check and validate the response for required fields
    if (!result.user || !result.user.name || !result.user.userId || !result.user.role) {
      throw new Error('Invalid response format')
    }

    // Set user in store
    const user: User = {
      username: result.user.name,
      userId: result.user.userId,
      role: result.user.role
    }
    userStore.setUser(user)

    // Display success toast message
    toast('Successfully logged in', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      dangerouslyHTMLString: true
    })

    // Redirect after successful login
    const redirectPath = useRoute().query.redirect as string || '/dashboard'
    await navigateTo(localePath(redirectPath))
  } catch (error) {
    console.error('Login error: ', error)
    toast('Login failed, please try again', {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
      dangerouslyHTMLString: true
    })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss">

.login {
  @include mainMiddleSettings;

  @media (max-width: 768px) {
    @include phone-borders;
  }

  .form {
    width: 384px;
    height: 520px;
    position: relative;
    display: flex;
    margin: auto;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;

    // @include softForm;
    h1 {
      text-align: center;
      margin-bottom: 50px;
    }

    .input-container {
      display: flex;
      flex-direction: column;
      margin-bottom: 20px;

      label {
        margin-bottom: 5px;
      }

      .input {
        border: 1px solid gray;
        padding: 10px;
        border-radius: 5px;
      }
    }

    .btn {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 500;
      font-size: 20px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 50px;

      span {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
      }
    }
  }
}
</style>
