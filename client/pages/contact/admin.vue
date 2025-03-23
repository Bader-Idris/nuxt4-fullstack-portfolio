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


// Unified auth check handler
const checkAdminAccess = () => {
  // Server-side check
  if (import.meta.server) {
    const nuxtApp = useNuxtApp()
    const cookies = parseCookies(nuxtApp.ssrContext?.event)
    if (!cookies.accessToken) {
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

// Data fetching handler
const { pending, execute } = useLazyAsyncData<Email[]>(
  'admin-emails',
  async () => {
    if (!checkAdminAccess()) return []

    const { data, error } = await $fetch<{ data: Email[] }>(
      '/api/v1/received_emails',
      {
        credentials: 'include',
        server: false,
        retry: 0,
        headers: import.meta.server ? {
          cookie: useRequestHeaders(['cookie']).cookie || ''
        } : undefined
      }
    )

    if (error.value) {
      const status = error.value.statusCode
      const message = status === 403 ? t('errors.adminAccessRequired') :
        status === 401 ? t('errors.sessionExpired') :
          t('errors.serverError')

      if (import.meta.client) {
        showToast('error', message)
        if ([401, 403].includes(status)) {
          router.push({
            path: localePath('/login'),
            query: { redirect: route.fullPath }
          })
        }
      } else {
        throw createError({ statusCode: status, statusMessage: message })
      }
      return []
    }

    emails.value = data.value?.data || []
    showToast('success', t('messages.emailsLoaded'))
    return emails.value
  },
  {
    server: false,
    immediate: false
  }
)

// Lifecycle handling
onMounted(async () => {
  if (import.meta.client) {
    await execute()
  }
})

// Server-side initialization
if (import.meta.server) {
  checkAdminAccess() // Will automatically throw error if not authenticated
  await execute()
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
