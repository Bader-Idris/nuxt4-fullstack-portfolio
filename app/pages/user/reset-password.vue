<template>
  <div class="reset-password-form">
    <form @submit.prevent="resetPassword">
      <h2>Reset Your Password</h2>
      <input
        v-model="newPassword"
        type="password"
        placeholder="Enter new password"
        required
      >
      <input
        v-model="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        required
      >
      <CustomButton
        button-type="primary"
        aria-label="Reset Password"
      >
        <span>Reset Password</span>
      </CustomButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'

type ResetPasswordResponse = {
  success: boolean
  message?: string
}

const localePath = useLocalePath()
const route = useRoute()
const newPassword = ref('')
const confirmPassword = ref('')

const email = computed(() => route.query.email?.toString() || '')
// TODO: fix this token to be brought from the cookies, or should it be sent from server, check forgot password function
const token = computed(() => route.query.token?.toString() || '')

async function resetPassword() {
  if (newPassword.value !== confirmPassword.value) {
    toast('Passwords do not match', { theme: 'dark', type: 'error' })
    return
  }

  if (!newPassword.value) {
    toast('Please enter a new password', { theme: 'dark', type: 'error' })
    return
  }

  if (!email.value || !token.value) {
    toast('Invalid email or token', { theme: 'dark', type: 'error' })
    return
  }

  try {
    const { data } = await useFetch<ResetPasswordResponse>(
      '/api/v1/auth/reset-password',
      {
        method: 'POST',
        body: {
          email: email.value,
          password: newPassword.value,
          token: token.value,
        },
        baseURL: useRuntimeConfig().public.originUrl,
        server: false, // Ensure client-side only execution
      },
    )

    if (data.value?.success) {
      toast('Password reset successfully', { theme: 'dark', type: 'success' })
      await navigateTo(localePath('/dashboard'), { replace: true })
    }
  }
  catch (error: any) {
    toast(error.data?.message || 'An error occurred', {
      theme: 'dark',
      type: 'error',
    })
    console.error('Password reset error:', error)
  }
}
</script>

<style lang="scss">
.reset-password-form {
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
  }

  > form {
    @include flex-container(column, nowrap, center, center);
    margin-top: 20px;

    > * {
      margin: 10px;
      padding: 10px;
    }
  }

  .warn,
  .verify {
    background-color: #007acc;
    color: white;
    padding: 30px;
    position: relative;
    left: 0;
    top: 0;
    border-radius: 4px;
    text-align: center;

    @include tablet-to-up {
      margin: auto 50px;
      width: 50%;
      transform: translate(50%, 50%);
    }

    @include mobile {
      margin: 20px;
    }
  }
}
</style>
