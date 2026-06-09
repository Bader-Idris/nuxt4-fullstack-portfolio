// app/plugins/01.auth.ts
import { useUserStore } from "~/stores/useUserSocket";

export default defineNuxtPlugin(async (_nuxtApp) => {
  // This plugin runs once on app startup.
  // Its purpose is to initialize the user's session.

  const userStore = useUserStore();

  // If the user is already authenticated (e.g., from a previous login in the same session),
  // we don't need to fetch them again.
  if (userStore.isAuthenticated) {
    return;
  }

  // Detect if we should attempt restoration
  let shouldRestore = false;

  if (import.meta.server) {
    const cookies = useRequestHeaders(["cookie"]);
    if (cookies.cookie?.includes("accessToken") || cookies.cookie?.includes("refreshToken")) {
      shouldRestore = true;
    }
  } else {
    // On the client, check localStorage and cookies
    const storedUser = localStorage.getItem("user");
    const hasStoredUser = storedUser && storedUser !== "null" && storedUser !== "undefined";
    const hasAuthCookies = document.cookie.includes("accessToken") || document.cookie.includes("refreshToken");
    
    if (hasStoredUser || hasAuthCookies) {
      shouldRestore = true;
    }
  }

  if (!shouldRestore) {
    return;
  }

  try {
    if (import.meta.server) {
      console.log("Attempting to restore user session on server...");
    } else {
      console.log("Attempting to restore user session on client...");
    }

    const headers = useRequestHeaders(["cookie"]);
    const config = useRuntimeConfig();
    
    const data = await $fetch("/api/v1/auth/me", {
      baseURL: config.public.originUrl,
      headers: headers as any,
      timeout: 5000,
    });

    if (data && data.user) {
      userStore.setUser(data.user);
      if (import.meta.server) {
        console.log("User session restored successfully on server.");
      } else {
        console.log("User session restored successfully on client.");
      }
    }
  } catch (error: any) {
    // This will fail if the user is not logged in (401 Unauthorized), which is expected.
    const status = error?.data?.statusCode || error?.status || 500;
    if (status !== 401) {
      console.log("Error restoring user session:", error.message);
    }
  }
});