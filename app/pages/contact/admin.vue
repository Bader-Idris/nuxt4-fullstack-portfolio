<template>
  <div class="admin-contact-panel">
    <h1>Admin Panel</h1>
    <div v-if="pending" class="loading-indicator">
      <span>Loading emails...</span>
    </div>
    <ul v-else-if="emails.length > 0">
      <li v-for="email in emails" :key="email.id">
        <p><strong>From:</strong> {{ email.name }} ({{ email.email }})</p>
        <p><strong>IP:</strong> {{ email.ip }}</p>
        <p>
          <strong>Created At:</strong>
          {{ new Date(email.createdAt).toLocaleString() }}
        </p>
        <div class="message-content">
          <ReadonlyTiptap :content="email.message" />
        </div>
      </li>
    </ul>
    <p v-else>No emails to display.</p>
  </div>
</template>

<script setup lang="ts">
import "vue3-toastify/dist/index.css";
import { storeToRefs } from "pinia";
import { CapacitorCookies } from "@capacitor/core";
// import { useUserStore } from '~/stores/UserNameStore'
import { useUserStore } from "~/stores/useUserSocket";
const { t } = useI18n();

// For CapacitorJS integration
const isCapacitor = ref(false);
onMounted(() => {
  isCapacitor.value =
    typeof window !== "undefined" && window.Capacitor !== undefined;
});

useSeoMeta({
  title: t("contact.admin.title"),
  description: t("contact.admin.description"),
});

useSchemaOrg([
  defineWebPage({
    name: () => t("contact.admin.title"),
    description: () => t("contact.admin.description"),
  }),
  defineWebSite({
    name: 'Bader Idris Portfolio',
    url: 'https://baderidris.com'
  })
]);

interface Email {
  id: string;
  name: string;
  email: string;
  message: string;
  ip: string;
  createdAt: string;
}

const emails = ref<Email[]>([]);
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();

// Client-only toast initialization
const showToast = (type: "success" | "error", message: string) => {
  if (import.meta.client) {
    import("vue3-toastify").then(({ toast }) => {
      toast(message, {
        theme: "auto",
        type,
        position: "top-center",
        timeout: type === "success" ? 3000 : 5000,
      });
    });
  }
};

// Access token from cookie
const accessToken = useCookie<string | undefined>("accessToken");

// Unified auth check handler
const checkAdminAccess = () => {
  // Server-side check
  if (import.meta.server) {
    if (!accessToken.value) {
      throw createError({
        statusCode: 403,
        statusMessage: t("errors.adminAccessRequired"),
      });
    }
    return true;
  }

  // Client-side check
  if (!user.value || user.value.role !== "admin") {
    showToast("error", t("errors.adminAccessRequired"));
    router.push({
      path: localePath("/login"),
      query: { redirect: route.fullPath },
    });
    return false;
  }
  return true;
};

// Define the fetch function separately for better organization
const fetchEmails = async (): Promise<Email[]> => {
  // Check admin access first
  if (!checkAdminAccess()) return [];

  try {
    const config = useRuntimeConfig();

    // Properly handle cookies for both SSR and CSR
    const headers = {};

    // For SSR, forward cookies from the original request.
    // For CSR, Nuxt's $fetch will automatically handle sending cookies for same-origin requests.
    if (import.meta.server) {
      const reqHeaders = useRequestHeaders(["cookie"]);
      Object.assign(headers, reqHeaders);
    }

    const response = await $fetch("/api/v1/received_emails", {
      baseURL: config.public.originUrl,
      headers,
    });

    if (response && response.data) {
      // Show success toast on client only
      if (import.meta.client) {
        showToast("success", t("messages.emailsLoaded"));
      }

      return response.data;
    }
    return [];
  } catch (error) {
    const status = error.statusCode || 500;
    const message =
      status === 403
        ? t("errors.adminAccessRequired")
        : status === 401
          ? t("errors.sessionExpired")
          : t("errors.serverError");

    // Handle client-side errors
    if (import.meta.client) {
      showToast("error", message);
      if ([401, 403].includes(status)) {
        router.push({
          path: localePath("/login"),
          query: { redirect: route.fullPath },
        });
      }
    } else {
      // Handle server-side errors
      throw createError({ statusCode: status, statusMessage: message });
    }
    return [];
  }
};

// Initialize data fetching only once per component instance
const hasInitialized = ref(false);

// Use useAsyncData to handle server/client data fetching
const { pending, data, refresh } = useAsyncData<Email[]>(
  "admin-emails",
  () => fetchEmails(),
  {
    server: true,
    // Don't execute immediately to control when it runs
    immediate: false,
  },
);

// Watch the data to update local emails ref when server data is available
watch(
  data,
  (newData) => {
    if (newData !== undefined && newData !== null) {
      emails.value = newData;
    }
  },
  { immediate: true },
);

// Capacitor cookie handling function
const handleCapacitorCookies = async () => {
  if (isCapacitor.value) {
    try {
      // Get cookies from Capacitor
      const cookies = await CapacitorCookies.getCookies();
      // If we have the token in Capacitor cookies, we can proceed
      if (cookies.accessToken) {
        accessToken.value = cookies.accessToken;
      }
    } catch (e) {
      console.error("Error accessing Capacitor cookies:", e);
    }
  }
};

// Add a manual refresh function for when needed (e.g., pull to refresh)
const refreshEmails = async () => {
  if (import.meta.client) {
    await handleCapacitorCookies();
    await refresh();
  }
};

// Initialize data fetching once when component mounts
onMounted(async () => {
  if (hasInitialized.value) return; // Prevent duplicate initialization

  hasInitialized.value = true;

  if (import.meta.client) {
    await handleCapacitorCookies();
  }

  // Fetch data - this will either come from server cache (if hydrated) or make a new request
  await refresh();
});

// Server-side initialization
if (import.meta.server) {
  // On server, we check access and execute immediately
  checkAdminAccess(); // Will throw error if not authenticated
  // Execute the fetch on the server
  refresh();
}
</script>

<style lang="scss">
.admin-contact-panel {
  padding: 40px 20px;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;

  @include tablet-to-up {
    padding: 60px 40px;
  }

  h1 {
    margin-bottom: 30px;
    color: var(--accent-primary);
    font-size: 2rem;
  }

  ul {
    list-style: none;
    padding: 0;
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    gap: 30px;

    li {
      padding: 25px;
      background: var(--bg-secondary);
      border: 1px solid var(--lines-color);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);

      &:hover {
        border-color: var(--accent-secondary);
      }
    }
  }

  .message-content {
    border: 1px solid var(--lines-color);
    padding: 20px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-radius: 12px;
    width: 100%;
    overflow-x: auto;
  }
  
  strong {
    color: var(--accent-secondary);
    margin-right: 5px;
  }
}
</style>