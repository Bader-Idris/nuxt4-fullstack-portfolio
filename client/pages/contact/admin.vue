<template>
  <div class="received-set">
    <h1>Admin Panel</h1>
    <div v-if="pending" class="loading-indicator">
      <span>Loading emails...</span>
    </div>
    <ul v-else-if="emails.length > 0">
      <li v-for="email in emails" :key="email.id">
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
import 'vue3-toastify/dist/index.css'
import { storeToRefs } from 'pinia'
import { useUserStore } from '~/stores/UserNameStore'
const { t } = useI18n()

// For CapacitorJS integration
const isCapacitor = ref(false)
onMounted(() => {
  isCapacitor.value = typeof window !== 'undefined' && window.Capacitor !== undefined
})

useSeoMeta({
  title: t('contact.admin.title'),
  description: t('contact.admin.description'),
})

useSchemaOrg([
  {
    "@type": "ContactPage",
    name: t('contact.admin.title'),
    description: t('contact.admin.description'),
  }
])

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
const { user } = storeToRefs(userStore)
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

// Client-only toast initialization
const showToast = (type: 'success' | 'error', message: string) => {
  if (import.meta.client) {
    import('vue3-toastify').then(({ toast }) => {
      toast(message, {
        theme: 'auto',
        type,
        position: 'top-center',
        timeout: type === 'success' ? 3000 : 5000
      })
    })
  }
}

// Access token from cookie
const accessToken = useCookie<string | undefined>('accessToken')

// Unified auth check handler
const checkAdminAccess = () => {
  // Server-side check
  if (import.meta.server) {
    if (!accessToken.value) {
      throw createError({
        statusCode: 403,
        statusMessage: t('errors.adminAccessRequired')
      })
    }
    return true
  }

  // Client-side check
  if (!user.value || user.value.role !== 'admin') {
    showToast('error', t('errors.adminAccessRequired'))
    router.push({
      path: localePath('/login'),
      query: { redirect: route.fullPath }
    })
    return false
  }
  return true
}

// Define the fetch function separately for better organization
const fetchEmails = async (): Promise<Email[]> => {
  // Check admin access first
  if (!checkAdminAccess()) return []

  try {
    const config = useRuntimeConfig()

    // Properly handle cookies for both SSR and CSR
    const headers = {}

    // For SSR, forward all cookies from the original request
    if (import.meta.server) {
      const reqHeaders = useRequestHeaders(['cookie'])
      Object.assign(headers, reqHeaders)
    }
    // For CSR in production, ensure the token is included
    else if (accessToken.value) {
      // You might need to adjust this based on how your API expects auth
      // headers['Authorization'] = `Bearer ${accessToken.value}`
      headers['Authorization'] = `${accessToken.value}`
    }

    const response = await $fetch('/api/v1/received_emails', {
      baseURL: config.public.originUrl,
      headers
    })

    if (response && response.data) {
      // Store in local ref for template access
      emails.value = response.data

      // Show success toast on client only
      if (import.meta.client) {
        showToast('success', t('messages.emailsLoaded'))
      }

      return response.data
    }
    return []
  } catch (error) {
    const status = error.statusCode || 500
    const message = status === 403 ? t('errors.adminAccessRequired') :
      status === 401 ? t('errors.sessionExpired') :
        t('errors.serverError')

    // Handle client-side errors
    if (import.meta.client) {
      showToast('error', message)
      if ([401, 403].includes(status)) {
        router.push({
          path: localePath('/login'),
          query: { redirect: route.fullPath }
        })
      }
    } else {
      // Handle server-side errors
      throw createError({ statusCode: status, statusMessage: message })
    }
    return []
  }
}

// Use useAsyncData with lazy option for more control
const { pending, refresh } = useAsyncData<Email[]>(
  'admin-emails',
  fetchEmails,
  {
    // Don't execute immediately - we'll control this based on environment
    immediate: false,
    // Handle server errors properly
    server: true,
    // Transform function to ensure emails ref is always updated
    transform: (data) => {
      emails.value = data || []
      return data
    }
  }
)

// Capacitor cookie handling function
const handleCapacitorCookies = async () => {
  if (isCapacitor.value) {
    try {
      // Import CapacitorCookies only on client side
      const { CapacitorCookies } = await import('@capacitor/core')
      // Get cookies from Capacitor
      const cookies = await CapacitorCookies.getCookies()
      // If we have the token in Capacitor cookies, we can proceed
      if (cookies.accessToken) {
        accessToken.value = cookies.accessToken
      }
    } catch (e) {
      console.error('Error accessing Capacitor cookies:', e)
    }
  }
}

// Lifecycle handling
onMounted(async () => {
  if (import.meta.client) {
    await handleCapacitorCookies()
    // Refresh data on client mount
    refresh()
  }
})

// Server-side initialization
if (import.meta.server) {
  // On server, we check access and execute immediately
  checkAdminAccess() // Will throw error if not authenticated
  refresh()
}
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
