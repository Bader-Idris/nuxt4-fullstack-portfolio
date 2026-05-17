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

    <div v-if="userNotFound" class="prompt">
      <CustomButton button-type="ghost">
        <CustomLink aria-label="register page" :to="localePath('/register')" class="internal-link">
          No account found? Register here
        </CustomLink>
      </CustomButton>
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
const userNotFound = ref<boolean>(false); // State to show registration link
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
  userNotFound.value = false;

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
  } catch (error: any) {
    console.error('Login error: ', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    const friendlyMessage = getFriendlyErrorMessage(error);
    
    // Check if error is specifically about non-existent user (401 is general, but often implies no match)
    if (error.status === 401 || error.status === 404) {
      userNotFound.value = true;
    }

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
  console.log('--- googleLogin Native Start ---');

  try {
    // Dynamically import the social login plugin
    const config = useRuntimeConfig();
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    
    console.log('Calling SocialLogin.login for Google...');
    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['openid', 'profile', 'email'],
      }
    });
    console.log('SocialLogin.login result:', JSON.stringify(result, null, 2));

    if (!result.accessToken) {
      throw new Error('No access token received from Google');
    }

    // Use the dedicated Google social auth endpoint for Capacitor
    const socialUrl = '/api/v1/auth/social/google';
    console.log('Sending token to server:', socialUrl);
    
    const response = await $fetch<any>(socialUrl, {
      method: 'POST',
      body: {
        accessToken: result.accessToken,
        // profile: {
        //   name: result.profile?.name || result.profile?.displayName,
        //   email: result.profile?.email,
        //   id: result.profile?.id
        // }
        idToken: result.idToken, // Optional, but good for extra validation if server supports it
      },
      baseURL: config.public.originUrl,
      credentials: 'include',
    });
    
    console.log('Server response:', JSON.stringify(response, null, 2));

    if (response && response.user) {
      await handleSocialLoginSuccess(response, 'Google');
    } else {
      throw new Error('User data not received from server');
    }
  } catch (error: any) {
    handleSocialLoginError(error, 'Google');
  } finally {
    console.log('--- googleLogin Native End ---');
    googleLoading.value = false;
  }
};

// Facebook authentication function for Capacitor devices using @capgo/capacitor-social-login
const facebook = async () => {
  facebookLoading.value = true;
  console.log('--- facebookLogin Native Start ---');

  try {
    // Dynamically import the social login plugin
    const config = useRuntimeConfig();
    const { SocialLogin } = await import('@capgo/capacitor-social-login');

    console.log('Calling SocialLogin.login for Facebook...');
    const result = await SocialLogin.login({
      provider: 'facebook',
      options: {
        permissions: ['public_profile', 'email'],
      }
    });
    console.log('SocialLogin.login result:', JSON.stringify(result, null, 2));

    if (!result.accessToken) {
      throw new Error('No access token received from Facebook');
    }

    const socialUrl = '/api/v1/auth/social/facebook';
    console.log('Sending token to server:', socialUrl);

    const response = await $fetch<any>(socialUrl, {
      method: 'POST',
      body: {
        accessToken: result.accessToken,
        // profile: {
        //   name: result.profile?.name || result.profile?.displayName,
        //   email: result.profile?.email,
        //   id: result.profile?.id
        // }
      },
      baseURL: config.public.originUrl,
      credentials: 'include',
    });

    console.log('Server response:', JSON.stringify(response, null, 2));

    if (response && response.user) {
      await handleSocialLoginSuccess(response, 'Facebook');
    } else {
      throw new Error('User data not received from server');
    }
  } catch (error: any) {
    handleSocialLoginError(error, 'Facebook');
  } finally {
    console.log('--- facebookLogin Native End ---');
    facebookLoading.value = false;
  }
};

// Helper to handle successful social login
const handleSocialLoginSuccess = async (response: any, provider: string) => {
  console.log(`${provider} auth successful, setting user store...`);
  
  // Sync cookies for Capacitor
  if (import.meta.client && (await isCapacitorDevice)) {
    console.log('Capacitor device detected, syncing cookies...');
    await new Promise(resolve => setTimeout(resolve, 800)); // Wait for cookies to be set
    const cookies = await CapacitorCookies.getCookies();
    console.log('Synced Cookies:', JSON.stringify(cookies, null, 2));
    if (cookies.accessToken) {
      accessToken.value = cookies.accessToken;
    }
  }

  const userData = {
    username: response.user.name,
    userId: response.user.userId,
    role: response.user.role,
  };
  userStore.setUser(userData);

  toast(`Successfully logged in with ${provider}`, {
    theme: 'auto',
    type: 'success',
    position: 'top-center',
    dangerouslyHTMLString: true,
  });

  console.log('Navigating to dashboard...');
  await navigateTo(localePath('/dashboard'), {
    redirectCode: 302,
  });
};

// Helper to handle social login errors
const handleSocialLoginError = (error: any, provider: string) => {
  console.error(`--- ${provider} Authentication Error ---`);
  // Fix for [object Object] logging
  console.error('Error Details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  
  if (error.response) {
    console.error('Response Data:', JSON.stringify(error.response._data, null, 2));
  }

  toast(`${provider} sign-in failed. Please try again or use email.`, {
    theme: 'dark',
    type: 'error',
    position: 'top-center',
  });

  // Fallback to web flow if appropriate
  if (import.meta.client && !isCapacitorDevice) {
    console.log('FALLBACK: Attempting web-based auth flow');
    window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider.toLowerCase()}`;
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
