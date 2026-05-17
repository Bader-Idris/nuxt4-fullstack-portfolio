<template>
  <div class="register">
    <form class="form" @submit.prevent="register">
      <h1>Register</h1>
      <label for="user">user name</label>
      <input v-model="user" name="user" type="text" class="input" >
      <label for="email">email</label>
      <input v-model="email" name="email" type="email" class="input" >
      <label for="password">Password</label>
      <input v-model="password" name="password" type="text" class="input" >

      <div class="policy-checklist">
        <label class="checkbox-label">
          <input v-model="agreePolicies" type="checkbox">
          I agree to the 
          <CustomLink to="/legal/terms" target="_blank" aria-label="Terms and Conditions" class="policy-link">Terms and Conditions</CustomLink>
          and 
          <CustomLink to="/privacy/policy" target="_blank" aria-label="Privacy Policy" class="policy-link">Privacy Policy</CustomLink>
        </label>
      </div>

      <button class="btn" :disabled="loading">
        <span v-if="loading" class="loader" >
          <CustomLoader />
        </span>
        <span v-else> Register </span>
      </button>
    </form>

    <div class="social-auth">
      <button class="btn social google" @click="socialLogin('google')">
        <Icon 
          name="flat-color-icons:google" 
          width="30"
          height="30"
          mode="svg"
          class="svg"
        />
      </button>
      <button class="btn social facebook" @click="socialLogin('facebook')">
        <Icon 
          name="basil:facebook-solid" 
          width="30" 
          height="30" 
          mode="svg"
          class="fb"
        />
      </button>
    </div>

    <div v-if="showPrompt" class="prompt">
      <CustomButton button-type="ghost">
        <CustomLink aria-label="login page" :to="localePath('/login')" class="internal-link">
          Go to login page
        </CustomLink>
      </CustomButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// import { useUserStore } from '~/stores/UserNameStore'
import { useUserStore } from '~/stores/useUserSocket';
import { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import { CapacitorCookies } from '@capacitor/core';

// Important for disabling layouts
definePageMeta({
  layout: 'default', // Specify the layout
  hideLayout: true,  // This will be accessible via usePageMeta()
});

useSeoMeta({
  title: 'Register page',
  description: "Sign up on Bader Idris's platform to access exclusive content, resources, and services. Join a tech-savvy community led by a skilled full-stack developer.",
})

const localePath = useLocalePath()
const user = ref<string>('')
const email = ref<string>('')
const password = ref<string>('')
const agreePolicies = ref<boolean>(false)
const loading = ref<boolean>(false)
const showPrompt = ref<boolean>(false)

// const router = useRouter();
const route = useRoute();

// Utility type for server response
interface RegisterResponse {
  user: {
    name: string;
    userId: string;
    role: string;
  };
}

// Access token from cookie
const accessToken = useCookie<string | undefined>('accessToken')

const register = async (): Promise<void> => {
  // Input validation to avoid unnecessary API calls
  if (!user.value || !email.value || !password.value) {
    toast('All fields are required.', {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
      dangerouslyHTMLString: true,
    });
    return;
  }

  if (!agreePolicies.value) {
    toast('You must agree to the Terms and Conditions and Privacy Policy.', {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
      dangerouslyHTMLString: true,
    })
    return
  }

  loading.value = true;
  showPrompt.value = false;

  const url = `/api/v1/auth/register`;
  const data = {
    name: user.value,
    email: email.value,
    password: password.value,
  };

  try {
    const response = await $fetch<RegisterResponse>(url, {
      method: 'POST',
      body: data,
      baseURL: useRuntimeConfig().public.originUrl,
    });

    if (response && response.user) {
      // Set user in store
      useUserStore().setUser({
        username: response.user.name,
        userId: response.user.userId,
        role: response.user.role,
      });

      toast('Successfully Registered! Please check your email to verify your account.', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });

      const redirectPath = (route.query.redirect as string) || '/dashboard';
      await navigateTo(localePath(redirectPath));
    }
  } catch (error: any) {
    // Handle network or unexpected errors
    console.error('Registration error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    const msg = error.data?.message || error.data?.statusMessage || 'Network error. Please try again.';
    
    // If email already exists, show the login prompt
    if (msg.toLowerCase().includes('exists')) {
      showPrompt.value = true;
    }

    toast(msg, {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
    });
  } finally {
    loading.value = false;
  }
};

const socialLogin = async (provider: string) => {
  const isCapacitorDevice = await useCapacitorDevice();
  
  if (provider === 'google') {
    if (isCapacitorDevice) {
      await googleRegister(); // Use a register-specific Google auth function
    } else {
      // Fallback for non-Capacitor (e.g., web)
      if (import.meta.client) {
        window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider}`;
      }
    }
  } else if (provider === 'facebook') {
    if (isCapacitorDevice) {
      await facebookRegister(); // Use a register-specific Facebook auth function
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

// Google authentication function for Capacitor devices during registration using @capgo/capacitor-social-login
const googleRegister = async () => {
  loading.value = true;
  console.log('--- googleRegister Native Start ---');

  try {
    const config = useRuntimeConfig();
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    
    console.log('Calling SocialLogin.login for Google...');
    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['openid', 'email', 'profile'],
      },
    });
    console.log('SocialLogin.login result received:', JSON.stringify(result, null, 2));

    if (!result.accessToken) {
      throw new Error('No access token received from Google');
    }

    // Use the dedicated Google social auth endpoint for Capacitor
    const socialUrl = '/api/v1/auth/social/google';
    console.log('Calling server social endpoint:', socialUrl);
    
    const response = await $fetch<any>(socialUrl, {
      method: 'POST',
      body: {
        accessToken: result.accessToken,
        idToken: result.idToken,
      },
      baseURL: config.public.originUrl,
      credentials: 'include',
    });
    console.log('Server response received:', JSON.stringify(response, null, 2));

    if (response && response.user) {
      await handleSocialRegisterSuccess(response, 'Google');
    } else {
      throw new Error('User data not received from server');
    }
  } catch (error: any) {
    handleSocialRegisterError(error, 'Google');
  } finally {
    console.log('--- googleRegister Native End ---');
    loading.value = false;
  }
};

// Facebook authentication function for Capacitor devices during registration using @capgo/capacitor-social-login
const facebookRegister = async () => {
  loading.value = true;
  console.log('--- facebookRegister Native Start ---');

  try {
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
    const response = await $fetch<any>(socialUrl, {
      method: 'POST',
      body: {
        accessToken: result.accessToken,
      },
      baseURL: config.public.originUrl,
      credentials: 'include',
    });

    console.log('Server response received:', JSON.stringify(response, null, 2));

    if (response && response.user) {
      await handleSocialRegisterSuccess(response, 'Facebook');
    } else {
      throw new Error('User data not received from server');
    }
  } catch (error: any) {
    handleSocialRegisterError(error, 'Facebook');
  } finally {
    console.log('--- facebookRegister Native End ---');
    loading.value = false;
  }
};

// Helper to handle successful social registration/login
const handleSocialRegisterSuccess = async (response: any, provider: string) => {
  console.log(`${provider} auth successful, setting user store...`);

  // Sync cookies for Capacitor
  if (import.meta.client && (await useCapacitorDevice())) {
    console.log('Capacitor device detected, syncing cookies...');
    await new Promise(resolve => setTimeout(resolve, 800));
    const cookies = await CapacitorCookies.getCookies();
    console.log('Synced Cookies:', JSON.stringify(cookies, null, 2));
    if (cookies.accessToken) {
      accessToken.value = cookies.accessToken;
    }
  }

  useUserStore().setUser({
    username: response.user.name,
    userId: response.user.userId,
    role: response.user.role,
  });

  toast(`Successfully authenticated with ${provider}`, {
    theme: 'auto',
    type: 'success',
    position: 'top-center',
    dangerouslyHTMLString: true,
  });

  const redirectPath = (route.query.redirect as string) || '/dashboard';
  console.log('Navigating to:', redirectPath);
  await navigateTo(localePath(redirectPath));
};

// Helper to handle social registration errors
const handleSocialRegisterError = (error: any, provider: string) => {
  console.error(`--- ${provider} Registration Error ---`);
  // Fix for [object Object] logging
  console.error('Error Details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  
  if (error.response) {
    console.error('Response Data:', JSON.stringify(error.response._data, null, 2));
  }
  
  toast(`${provider} sign-up failed. Please try again or use email.`, {
    theme: 'dark',
    type: 'error',
    position: 'top-center',
  });

  // Fallback to web flow if appropriate
  const isCapacitor = useRuntimeConfig().public.isCapacitor;
  if (import.meta.client && !isCapacitor) {
    console.log('FALLBACK: Attempting web-based auth flow');
    window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider.toLowerCase()}`;
  }
};
</script>

<style lang="scss">
.register {
  @include mainMiddleSettings;
  @include mobile {
    @include phone-borders;
    height: calc($full-viewport-height - 30px);
  }
  @include tablet-to-up {
    height: calc($full-viewport-height - 60px);
  }

  .form {
    @include flex-container(column, nowrap, unset, unset);
    max-width: 400px;
    margin: 0 auto;

    @include mobile {
      width: calc(100% - 30px);
    }

    .input {
      border: 1px solid gray;
      padding: 10px;
      margin-bottom: 20px;
      border-radius: 5px;
    }

    .policy-checklist {
      margin-bottom: 1.5rem;

      .checkbox-label {
        @include flex-container(row, nowrap, unset, center);
        font-size: 0.9rem;
        color: #fff;
        margin-bottom: 0.75rem;

        input {
          margin-right: 0.5rem;
        }
      }

      .policy-link {
        color: #007bff;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
          color: #0056b3;
        }
      }
    }

    .btn {
      background-color: #2c3e50;
      color: white;
      padding: 10px;
      border-radius: 5px;
      border: none;
      cursor: pointer;
    }
  }
}
.loader {
  @include flex-container(row, nowrap, center, center);
  height: 100%;
}
.social-auth {
  margin: 2rem auto;
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

.btn.social {
  @include flex-container(row, nowrap, center, center);
  gap: 1rem;
  padding: 10px 20px;
  height: 50px;
  cursor: pointer;
}
.social .fb {
  color: #3b5998;
}
.prompt {
  text-align: center;
}
</style>
