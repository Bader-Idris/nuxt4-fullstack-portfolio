<template>
  <div class="received-set">
    <h1>Admin Panel</h1>
    <div v-if="pending" class="loading-indicator">
      <span>Loading emails...</span>
    </div>
    <ul v-else-if="emails.length > 0">
      <li v-for="email in emails" :key="email._id">
        <p><strong>From:</strong> {{ email.name }} ({{ email.email }})</p>
        <p><strong>IP:</strong> {{ email.ip }}</p>
        <p>
          <strong>Created At:</strong> {{ new
          Date(email.createdAt).toLocaleString() }}
        </p>
        <p class="message">
          {{ email.message }}
        </p>
      </li>
    </ul>
    <p v-else>
      No emails to display.
    </p>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue3-toastify'
import { useUserStore } from '~/stores/UserNameStore'
import 'vue3-toastify/dist/index.css'

useSeoMeta({
  title: 'Admin Emails | Bader Idris',
  description: 'Exclusive to admins only',
})

interface Email {
  id: string
  name: string
  email: string
  message: string
  ip: string
  createdAt: string
}


const emails = ref<Email[]>([])
const userStore = useUserStore()
const route = useRoute()
const localePath = useLocalePath()

// Get redirect path with query preservation
const getRedirectPath = () => ({ // TODO: this requires fixes!
  path: localePath('/login'),
  query: { redirect: route.fullPath }
})

// Professional fetch implementation
const { execute, pending } = useLazyFetch<{ data: Email[] }>('/api/v1/received_emails', {
  immediate: false,
  server: false,
  credentials: 'include',
  async onResponse({ response }) {
    if (response.ok) {
      emails.value = response._data?.data || []
      showSuccessToast('Emails loaded successfully')
    }
  },
  async onResponseError({ response }) {
    handleFetchError(response?.status)
  }
})

// Centralized error handling
const handleFetchError = (statusCode?: number) => {
  const errorMap: Record<number, string> = {
    401: 'Session expired - please login again',
    403: 'Insufficient permissions',
    500: 'Server error - please try again later'
  }

  showErrorToast(errorMap[statusCode || 500] || 'Failed to fetch emails')

  if ([401, 403].includes(statusCode || 0)) {
    return navigateTo(getRedirectPath(), { redirectCode: 302 })
  }
}

// Toast helpers
const showSuccessToast = (message: string) => {
  toast(message, {
    theme: 'auto',
    type: 'success',
    position: 'top-center',
    timeout: 3000
  })
}

const showErrorToast = (message: string) => {
  toast(message, {
    theme: 'dark',
    type: 'error',
    position: 'top-center',
    timeout: 5000
  })
}

// Auth check composable
const checkAdminAccess = () => {
  if (!userStore.user || userStore.user.role !== 'admin') {
    showErrorToast('Admin access required')
    return navigateTo(getRedirectPath(), { redirectCode: 302 })
  }
  return true
}

// Universal fetch handler
const fetchEmails = async () => {
  if (!checkAdminAccess()) return navigateTo(getRedirectPath(), { redirectCode: 302 })

  try {
    await execute()
  } catch (error) {
    handleFetchError(error.statusCode)
  }
}

// SSR/CSR compatible data fetching
onServerPrefetch(async () => {
  if (import.meta.server && checkAdminAccess()) {
    await fetchEmails()
  }
})

onMounted(async () => {
  if (import.meta.client) {
    await fetchEmails()
  }
})
</script>

<style lang="scss">
.received-set {
  height: 580px;
  overflow: auto scroll;
  position: absolute;
  height: 100%;
  top: 0;
  color: #4d5bce;
  font-weight: bold;
  background: #fea55f;
  padding: 20px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  @media (max-width: 768px) {
    width: calc(100% - 10px);
    margin-left: 20px;
  }

  @media (min-width: 769px) {
    width: 50%;
    margin-left: 350px;
  }

  h1 {
    text-align: center;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 10px;

    li {
      display: flex;
      padding: 20px 0;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
      border: 2px solid;
    }
  }

  .message {
    border: 5px dotted #43d9ad;
    padding: 15px;
        flex: 1;
    flex-basis: 100%;
  }
}
</style>
