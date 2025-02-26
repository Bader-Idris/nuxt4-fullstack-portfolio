<template>
  <div class="verify-comp">
    <div
      v-if="verified"
      class="verify"
    >
      <p>your email's been verified</p>
      <p>
        <span>{{ seconds < 10 ? '0' + seconds : seconds }}</span> seconds to go
        to the main page
      </p>
    </div>
    <div
      v-else
      class="warn"
    >
      <p>please check your email again</p>
      <CustomButtons
        class="go-back"
        button-type="primary"
        aria-label="go to main page"
      >
        <CustomLink to="/">
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

type VerifyEmailResponse = {
  success: boolean
  message?: string
}

const route = useRoute()
const email = computed(() => route.query.email?.toString() || '')
const token = computed(() => route.query.token?.toString() || '')
const seconds = ref(10)
const verified = ref(false)

useSeoMeta({
  title: 'Projects I created during my career',
  description: 'Explore projects by Bader Idris, showcasing expertise in responsive web design, e-commerce, multi-step forms, todo apps, and stunning agency web apps. Powered by Vue.js, TypeScript, Node.js, and more.',
})

const { pause } = useIntervalFn(() => {
  seconds.value--
  if (seconds.value <= 0) {
    pause()
    if (verified.value) navigateTo('/')
  }
}, 1000)

async function verifyEmail() {
  if (!email.value || !token.value) {
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
          verificationToken: token.value,
        },
        server: false,
      },
    )

    if (data.value?.success) {
      verified.value = true
      toast('Email verified successfully', { theme: 'dark', type: 'success' })
    }
  }
  catch (error: any) {
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
