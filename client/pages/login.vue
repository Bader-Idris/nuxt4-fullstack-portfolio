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
import { useUserStore } from '~/stores/UserNameStore';

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

const localePath = useLocalePath();

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
    const { data: response, error } = await useLazyAsyncData<LoginResponse>(
      'login',
      () =>
        $fetch(url, {
          method: 'POST',
          body: data,
          baseURL: useRuntimeConfig().public.originUrl,
        })
    );

    // Check for errors
    if (error.value) {
      throw new Error(error.value.message || 'Login failed');
    }

    // Ensure response data is valid
    if (!response.value) {
      throw new Error('No response received from the server');
    }

    const result = response.value;

    // Validate the response structure
    if (!result.user || !result.user.name || !result.user.userId || !result.user.role) {
      throw new Error('Invalid response format');
    }

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
    // const redirectPath = useRoute().query.redirect as string || '/dashboard';
    // TODO: fix it when having a redirect queryString to somewhere else
    await navigateTo(localePath('/dashboard'), {
      redirectCode: 302,
    });
  } catch (error) {
    console.error('Login error: ', error);

    // Display error toast message only if it's a genuine error
    if (error instanceof Error) {
      toast(error.message || 'Login failed, please try again', {
        theme: 'dark',
        type: 'error',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });
    }
  } finally {
    loading.value = false;
  }
};

// const socialLogin = (provider: string) => {
//   if (import.meta.client) {
//     window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider}`;
//   }
// };

// Function to handle social login
const socialLogin = async (provider: string) => {
  if (provider === 'google') {
    if (await isCapacitorDevice) {
      await google(); // Trigger Google auth for Capacitor devices
    } else {
      // Fallback for non-Capacitor (e.g., web)
      if (import.meta.client) {
        window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/google`;
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

    // Perform Google sign-in and extract access token
    const {
      authentication: { accessToken: googleAccessToken },
    } = await GoogleAuth.signIn();

    // Send Google access token to your server for validation
    const response = await $fetch('/api/v1/auth/google', {
      method: 'POST',
      body: { googleAccessToken },
      baseURL: useRuntimeConfig().public.originUrl,
      credentials: 'include',
    });

    const { user: serverUser } = response
    if (!serverUser || !serverUser.name || !serverUser.userId || !serverUser.role) {
      throw new Error('Invalid response format from server')
    }

    // Set user in store
    const userData = {
      username: serverUser.name,
      userId: serverUser.userId,
      role: serverUser.role,
    }
    userStore.setUser(userData)

    // Handle Capacitor cookies (client-side only)
    if (import.meta.client && await isCapacitorDevice) {
      const { CapacitorCookies } = await import('@capacitor/core')
      const cookies = await CapacitorCookies.getCookies()
      if (cookies.accessToken) {
        accessToken.value = cookies.accessToken
      }
    }

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
  } finally {
    googleLoading.value = false;
  }
};
</script>

<style lang="scss">

.login {
  @include mainMiddleSettings;
  @media (max-width: 768px) {
    @include phone-borders;
    height: calc(100vh - 30px);
  }
  @media (min-width: 769px) {
    height: calc(100vh - 60px);
  }

  .form {
    width: 384px;
    height: 520px;
    position: relative;
    display: flex;
    margin: auto;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;

    @media (max-width: 768px) {
      width: calc(100% - 30px);
    }

    h1 {
      text-align: center;
      margin-bottom: 50px;
    }

    .input-container {
      display: flex;
      flex-direction: column;
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
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
      }
    }
  }
}

.social-auth {
  margin: 0 auto;
  max-width: 400px;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  gap: 1rem;

  @media (max-width: 768px) {
    width: calc(100% - 30px);
  }
  .btn {
    cursor: pointer;
  }
}
</style>
