<template>
  <div class="received-set">
    <h1>Admin Panel</h1>
    <ul v-if="emails.length > 0">
      <li
        v-for="email in emails"
        :key="email._id"
      >
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
  title: 'fetch emails | Bader Idris',
  description: 'Exclusive to admins only',
})

interface Email {
  _id: string
  name: string
  email: string
  message: string
  ip: string
  createdAt: string
}

const emails = ref<Email[]>([])
const userStore = useUserStore()
const isMounted = ref(false)

// Use client-only fetch with authorization check
const { execute } = useFetch('/api/v1/received_emails', {
  credentials: 'include',
  immediate: false,
  server: false,
  onResponse({ response }) {
    if (response.ok) {
      if (response._data?.emails) {
        emails.value = response._data.emails
        toast('Emails successfully loaded!', {
          theme: 'auto',
          type: 'success',
          position: 'top-center',
        })
      }
    }
    else {
      toast(`Failed to fetch emails: ${response.statusText}`, {
        theme: 'dark',
        type: 'error',
        position: 'top-center',
      })
    }
  },
  onResponseError() {
    toast('An unexpected error occurred while fetching emails.', {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
    })
  },
})

onMounted(() => {
  isMounted.value = true
  if (!userStore.user || userStore.user.role !== 'admin') {
    toast('Unauthorized: You must be an admin to view this page.', {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
    })
    return
  }
  execute()
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
  }
}
</style>
