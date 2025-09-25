<template>
  <div class="login">
    <form class="form" @submit.prevent="login">
      <h1>Login</h1>
      <div class="input-container">
        <label for="email">Email</label>
        <input 
          id="email"
          v-model="email" 
          name="email" 
          type="text" 
          class="input" 
          aria-labelledby="email" 
        >
      </div>
      <div class="input-container">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password" 
          name="password" 
          type="password" 
          class="input" 
          aria-labelledby="password" 
        >
      </div>
      <button class="btn" :disabled="isAnyLoading">
        <span v-if="loading" class="loader" >
          <CustomLoader />
        </span>
        <span v-else> Login </span>
      </button>
    </form>

    <div class="social-auth">
      <button class="btn social google" :disabled="isAnyLoading" @click="socialLogin('google')">
        <Icon 
          name="flat-color-icons:google" 
          width="30"
          height="30"
          mode="svg"
          class="svg"
        />
      </button>
      <button class="btn social facebook" :disabled="isAnyLoading" @click="socialLogin('facebook')">
        <Icon 
          name="basil:facebook-solid" 
          width="30" 
          height="30" 
          mode="svg"
          class="fb"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';
import { useApiError } from '~/composables/useApiError';
import { CapacitorCookies } from '@capacitor/core';
// import { useUserStore } from '~/stores/UserNameStore';
import { useUserStore } from '~/stores/useUserSocket';

// Define page meta
definePageMeta({
  layout: 'default',
  hideLayout: true,
});

// SEO Meta
useSeoMeta({
  title: 'Login Page',
  description: "Log in to Bader Idris's portfolio platform to explore projects, insights, and opportunities. Your gateway to cutting-edge web and multi-platform solutions.",
});

const route = useRoute()
const router = useRouter()

const localePath = useLocalePath();
const { getFriendlyErrorMessage } = useApiError();

// State for email, password, and loading
const email = ref<string>('');
const password = ref<string>('');
const loading = ref<boolean>(false);
const googleLoading = ref<boolean>(false); // Specific loading state for Google auth
// Access token from cookie
const accessToken = useCookie<string | undefined>('accessToken')
const isCapacitorDevice: Promise<boolean> = useCapacitorDevice()

// Computed property to disable buttons during any login process
const isAnyLoading = computed(() => loading.value || googleLoading.value);

// UserStore instance
const userStore = useUserStore();

// Define interfaces for API response and user data
interface LoginResponse {
  user: {
    name: string;
    userId: string;
    role: string;
  };
}

interface User {
  username: string;
  userId: string;
  role: string;
}

// Function to handle login
const login = async (): Promise<void> => {
  loading.value = true;

  const url = `/api/v1/auth/login`;
  const data = {
    email: email.value,
    password: password.value,
  };

  try {
    const result = await $fetch<LoginResponse>(url, {
      method: 'POST',
      body: data,
      baseURL: useRuntimeConfig().public.originUrl,
    });

    // Set user in store
    const user: User = {
      username: result.user.name,
      userId: result.user.userId,
      role: result.user.role,
    };
    userStore.setUser(user);

    // Display success toast message
    toast('Successfully logged in', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      dangerouslyHTMLString: true,
    });

    // Redirect after successful login
    router.push({
      path: localePath('/dashboard'),
      query: { redirect: route.fullPath }
    })
    // await navigateTo(localePath('/dashboard'), {
    //   redirectCode: 302,
    // });

  } catch (error) {
    console.error('Login error: ', error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    toast(friendlyMessage, {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
      dangerouslyHTMLString: true,
    });
  } finally {
    loading.value = false;
  }
};

// Function to handle social login
const socialLogin = async (provider: string) => {
  if (provider === 'google') {
    if (await isCapacitorDevice) {
      await google(); // Trigger Google auth for Capacitor devices
    } else {
      // Fallback for non-Capacitor (e.g., web)
      if (import.meta.client) {
        window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider}`;
      }
    }
  } else {
    // Handle other providers (e.g., Facebook) as needed
    if (import.meta.client) {
      window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider}`;
    }
  }
};

// Google authentication function for Capacitor devices
const google = async () => {
  googleLoading.value = true;

  try {
    // Dynamically import GoogleAuth plugin
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    await GoogleAuth.initialize();

    // =============================================
    // TODO: Only for reference!
    // await GoogleAuth.signIn();
    // TODO: get the user info from google then set it in the store
    // =============================================

    // Perform Google sign-in
    const googleResponse = await GoogleAuth.signIn();
    const { serverAuthCode, authentication, email, name } = googleResponse;

    if (!serverAuthCode) {
      throw new Error('No serverAuthCode received from Google');
    }

    // Log for debugging
    console.log('🎈serverAuthCode:🎈', serverAuthCode);
    console.log('🎈authentication:🎈', authentication);
    console.log('🎈googleResponse:🎈', googleResponse);

    // Simulate the callback by sending the serverAuthCode to the callback endpoint
    const response = await $fetch('/api/v1/auth/google/callback', {
      method: 'GET', // Match the server's expected method
      query: { code: serverAuthCode }, // Pass as query param like the web flow
      baseURL: useRuntimeConfig().public.originUrl,
      credentials: 'include', // Ensure cookies are sent/received
    });

    // The server redirects to /dashboard?tokenUser=..., but $fetch follows redirects
    // and returns the final response. We expect the cookies to be set by the server.
    console.log('🎈server response:🎈', response);

    // Extract user data from the redirected URL query if present
    // Since $fetch follows redirects, we may need to parse the Location header or rely on cookies
    // For simplicity, assume the server sets cookies and we fetch user data from them

    // Handle Capacitor cookies
    let accessTokenFromCookie = null;
    if (import.meta.client && (await isCapacitorDevice)) {
      const cookies = await CapacitorCookies.getCookies();
      console.log('🎈cookies:🎈', cookies);
      if (cookies.accessToken) {
        accessToken.value = cookies.accessToken;
        accessTokenFromCookie = cookies.accessToken;
      }
    }

    // Since server doesn't return user data in body (it redirects), we can:
    // 1. Use data from GoogleAuth.signIn() if cookies are set
    // 2. Or fetch user data separately if needed
    if (!accessTokenFromCookie) {
      throw new Error('No access token received in cookies');
    }

    // Set user in store using Google response data (as a fallback)
    const userData = {
      username: name || 'Unknown', // Fallback if name is missing
      userId: googleResponse.id || authentication.idToken.split('.')[2], // Extract from idToken if needed
      role: 'user', // Default role, adjust if server provides it
    };
    userStore.setUser(userData);

    // Display success toast message
    toast('Successfully logged in with Google', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      dangerouslyHTMLString: true,
    });

    // Navigate to dashboard (no query parameters needed since user is set in store)
    await navigateTo(localePath('/dashboard'), {
      redirectCode: 302,
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    toast('Google sign-in failed, please try again', {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
    });

    // Fallback: If native fails, attempt web flow
    if (import.meta.client) {
      console.log('Falling back to web flow');
      window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/google`;
    }
  } finally {
    googleLoading.value = false;
  }
};
</script>

<style lang="scss">

.login {
  @include mainMiddleSettings;
  @include mobile {
    @include phone-borders;
    height: calc($full-viewport-height - 30px);
  }
  @include tablet-to-up {
    height: calc($full-viewport-height - 60px);
  }

  .form {
    width: 384px;
    height: 520px;
    position: relative;
    margin: auto;
    @include flex-container(column, nowrap, center, stretch);

    @include mobile {
      width: calc(100% - 30px);
    }

    h1 {
      text-align: center;
      margin-bottom: 50px;
    }

    .input-container {
      @include flex-container(column, nowrap, unset, unset);
      margin-bottom: 20px;

      label {
        margin-bottom: 5px;
      }

      .input {
        border: 1px solid gray;
        padding: 10px;
        border-radius: 5px;
      }
    }

    .btn {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 500;
      font-size: 20px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 50px;

      .loader {
        @include flex-container(row, nowrap, center, center);
        height: 100%;
      }
    }
  }
}

.social-auth {
  margin: 0 auto;
  max-width: 400px;
  @include flex-container(row, nowrap, space-evenly, center);
  gap: 1rem;

  @include mobile {
    width: calc(100% - 30px);
  }
  .btn {
    cursor: pointer;
  }
}
</style>
