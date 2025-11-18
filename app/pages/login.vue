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
const facebookLoading = ref<boolean>(false); // Specific loading state for Facebook auth
// Access token from cookie
const accessToken = useCookie<string | undefined>('accessToken')
const isCapacitorDevice: Promise<boolean> = useCapacitorDevice()

// Computed property to disable buttons during any login process
const isAnyLoading = computed(() => loading.value || googleLoading.value || facebookLoading.value);

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
  } else if (provider === 'facebook') {
    if (await isCapacitorDevice) {
      await facebook(); // Trigger Facebook auth for Capacitor devices
    } else {
      // Fallback for non-Capacitor (e.g., web)
      if (import.meta.client) {
        window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider}`;
      }
    }
  } else {
    // Handle other providers as needed
    if (import.meta.client) {
      window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider}`;
    }
  }
};

// Google authentication function for Capacitor devices using @capgo/capacitor-social-login
const google = async () => {
  googleLoading.value = true;

  try {
    // Dynamically import the social login plugin
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    
    // Perform Google sign-in
    const result = await SocialLogin.signIn({
      provider: 'google',
      googleOptions: {
        // Add any specific Google options here
      }
    });

    if (!result.idToken) {
      throw new Error('No ID token received from Google');
    }

    // The backend expects an OAuth code, but the plugin returns an access token
    // We can still use the existing callback endpoint by passing the access token
    // However, since our backend expects an authorization code, we need to simulate
    // the existing flow by using the callback endpoint approach
    
    // For Google, we might need to pass the idToken instead of serverAuthCode
    // Our current backend expects the code parameter in the callback
    // Since SocialLogin.signIn() returns profile data directly, we can bypass the callback
    // and directly handle the user creation/login in the backend via a new API endpoint
    
    // For now, let's use the callback flow by sending the data to a custom endpoint
    // that processes social login results
    const response = await $fetch('/api/v1/auth/social/callback', {
      method: 'POST',
      body: {
        provider: 'google',
        idToken: result.idToken,
        profile: {
          name: result.profile?.name || result.profile?.displayName,
          email: result.profile?.email,
          id: result.profile?.id
        }
      },
      baseURL: useRuntimeConfig().public.originUrl,
      credentials: 'include',
    });

    // The server sets cookies, but for Capacitor we need to sync them
    let accessTokenFromCookie = null;
    if (import.meta.client && (await isCapacitorDevice)) {
      // Wait a bit for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cookies = await CapacitorCookies.getCookies();
      console.log('🎈Google cookies:🎈', cookies);
      if (cookies.accessToken) {
        accessToken.value = cookies.accessToken;
        accessTokenFromCookie = cookies.accessToken;
      }
    }

    // Set user in store using response data
    if (response && response.user) {
      const userData = {
        username: response.user.name,
        userId: response.user.userId,
        role: response.user.role,
      };
      userStore.setUser(userData);

      // Display success toast message
      toast('Successfully logged in with Google', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });

      // Navigate to dashboard
      await navigateTo(localePath('/dashboard'), {
        redirectCode: 302,
      });
    } else {
      throw new Error('User data not received from server');
    }
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

// Facebook authentication function for Capacitor devices using @capgo/capacitor-social-login
const facebook = async () => {
  facebookLoading.value = true;

  try {
    // Dynamically import the social login plugin
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    
    // Perform Facebook sign-in
    const result = await SocialLogin.signIn({
      provider: 'facebook',
      facebookOptions: {
        // Add any specific Facebook permissions here if needed
        permissions: ['public_profile', 'user_friends', 'email'],
      }
    });

    if (!result.accessToken) {
      throw new Error('No access token received from Facebook');
    }

    // Use the social callback endpoint to process the token from the plugin
    const response = await $fetch('/api/v1/auth/social/callback', {
      method: 'POST',
      body: {
        provider: 'facebook',
        accessToken: result.accessToken,
        profile: {
          name: result.profile?.name || result.profile?.displayName,
          email: result.profile?.email,
          id: result.profile?.id
        }
      },
      baseURL: useRuntimeConfig().public.originUrl,
      credentials: 'include',
    });

    // The server sets cookies, but for Capacitor we need to sync them
    let accessTokenFromCookie = null;
    if (import.meta.client && (await isCapacitorDevice)) {
      // Wait a bit for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cookies = await CapacitorCookies.getCookies();
      console.log('🎈Facebook cookies:🎈', cookies);
      if (cookies.accessToken) {
        accessToken.value = cookies.accessToken;
        accessTokenFromCookie = cookies.accessToken;
      }
    }

    // Set user in store using response data
    if (response && response.user) {
      const userData = {
        username: response.user.name,
        userId: response.user.userId,
        role: response.user.role,
      };
      userStore.setUser(userData);

      // Display success toast message
      toast('Successfully logged in with Facebook', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });

      // Navigate to dashboard
      await navigateTo(localePath('/dashboard'), {
        redirectCode: 302,
      });
    } else {
      throw new Error('User data not received from server');
    }
  } catch (error) {
    console.error('Facebook authentication error:', error);
    toast('Facebook sign-in failed, please try again', {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
    });

    // Fallback: If native fails, attempt web flow
    if (import.meta.client) {
      console.log('Falling back to web flow');
      window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/facebook`;
    }
  } finally {
    facebookLoading.value = false;
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
