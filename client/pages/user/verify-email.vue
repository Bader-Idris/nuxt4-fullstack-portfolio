<template>
  <div class="verify-comp">
    <div v-if="verified" class="verify">
      <p>Your email has been verified</p>
      <p>
        <span>{{ seconds < 10 ? '0' + seconds : seconds }}</span> seconds to go
            to the main page
      </p>
    </div>
    <div v-else class="warn">
      <p>Please check your email again</p>
      <CustomButtons
        class="go-back"
        button-type="primary"
        aria-label="go to main page">
        <CustomLink :to="localePath('/')">
          <span> or go back to main page </span>
        </CustomLink>
      </CustomButtons>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import { useIntervalFn } from '@vueuse/core'
import { useRoute, useLocalePath, useAsyncData } from '#imports'

const localePath = useLocalePath()
const route = useRoute()

type VerifyEmailResponse = {
  message: string
}

const email = route.query.email?.toString()
const verificationToken = route.query.verificationToken?.toString()
const seconds = ref(10)
const verified = ref(false)

// Use useAsyncData to handle server-side and client-side verification
const { data, error } = await useAsyncData(
  `verify-email-${route.fullPath}`, // Unique key based on URL
  () => {
    if (!email || !verificationToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing verification parameters',
      })
    }

    return $fetch<VerifyEmailResponse>('/api/v1/auth/verify-email', {
      baseURL: useRuntimeConfig().public.originUrl,
      method: 'POST',
      body: { email, verificationToken },
    })
  }
)

// Set verification status based on response
if (data.value?.message === 'Email Verified') {
  verified.value = true
}

useSeoMeta({
  title: 'Verify Email',
  description: 'A redirect page for email verification via email',
})

// Countdown timer
const { pause } = useIntervalFn(() => {
  seconds.value--
  if (seconds.value <= 0) {
    pause()
    if (verified.value) navigateTo(localePath('/'))
  }
}, 1000)

// Client-side toast notifications
onMounted(() => {
  if (import.meta.client) {
    if (verified.value) {
      toast('Email verified successfully', { theme: 'dark', type: 'success' })
    } else if (error.value) {
      const message = error.value.statusMessage || error.value.data?.message || 'Verification failed'
      toast(message, { theme: 'dark', type: 'error' })
    }
  }
})
</script>

<style lang="scss">
.verify-comp {
  @include mainMiddleSettings;

  @media (max-width: 768px) {
    @include phone-borders;
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

    @media screen and (min-width: 769px) {
      margin: auto 50px;
      width: 50%;
      transform: translate(50%, 50%);
    }

    @media screen and (max-width: 768px) {
      margin: 20px;
    }
  }

  .warn {
    @media screen and (max-width: 768px) {
      // width: 100%;
      // left: 0;
    }
  }
}
</style>
