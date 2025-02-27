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
        aria-label="go to main page"
      >
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
import { useRoute, useFetch,  useLocalePath } from '#imports'

const localePath = useLocalePath()

type VerifyEmailResponse = {
  success: boolean
  message?: string
}

const route = useRoute()
const email = computed(() => route.query.email?.toString() || '')
const verificationToken = computed(() => route.query.verificationToken?.toString() || '')
const seconds = ref(10)
const verified = ref(false)

useSeoMeta({
  title: 'Verify Email',
  description: 'A redirect page for email verification via email',
})

const { pause } = useIntervalFn(() => {
  seconds.value--
  if (seconds.value <= 0) {
    pause()
    if (verified.value) navigateTo(localePath('/'))
  }
}, 1000)

async function verifyEmail() {
  if (!email.value || !verificationToken.value) {
    toast('Missing verification parameters', { theme: 'dark', type: 'error' })
    return
  }

  try {
    const { data } = await useFetch<VerifyEmailResponse>(
      '/api/v1/auth/verify-email',
      {
        baseURL: useRuntimeConfig().public.originUrl,
        method: 'POST',
        body: {
          email: email.value,
          verificationToken: verificationToken.value, // Ensure this matches your server's expected parameter
        },
        immediate: false,
        server: false,
      },
    )

    if (data.value?.success) {
      verified.value = true
      toast('Email verified successfully', { theme: 'dark', type: 'success' })
    } else {
      toast(data.value?.message || 'Verification failed', {
        theme: 'dark',
        type: 'error',
      })
    }
  } catch (error: any) {
    toast(error.data?.message || 'Verification failed', {
      theme: 'dark',
      type: 'error',
    })
    console.error('Verification error:', error)
  }
}

onMounted(() => {
  if (import.meta.client) {
    verifyEmail()
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
