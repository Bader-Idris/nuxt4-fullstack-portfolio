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
        <CustomLink aria-label="login page" to="/login" class="internal-link">
          login page
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

// TODO: fix the cap auth mechanisms!

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
  msg: string
  [key: string]: any
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

  const url = `/api/v1/auth/register`;
  const data = {
    name: user.value,
    email: email.value,
    password: password.value,
  };

  try {
    const { data: response, error } = await useFetch<RegisterResponse>(url, {
      method: 'POST',
      body: data,
      baseURL: useRuntimeConfig().public.originUrl,
    });

    if (error.value) {
      // Handle API errors
      switch (error.value.statusCode) {
        case 400:
          toast(error.value.data?.message || 'Invalid request.', {
            theme: 'dark',
            type: 'error',
            position: 'top-center',
          });
          showPrompt.value = true;
          break;
        case 401:
          toast('Unauthorized. Please check your credentials.', {
            theme: 'dark',
            type: 'error',
            position: 'top-center',
          });
          break;
        default:
          toast('An unexpected error occurred.', {
            theme: 'dark',
            type: 'error',
            position: 'top-center',
          });
      }
    } else if (response.value) {
      // @ts-expect-error: setUser expects a user object, not a string
      useUserStore().setUser(user.value);

      toast('Successfully Registered', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });

      const redirectPath = (route.query.redirect as string) || '/dashboard';
      await navigateTo(localePath(redirectPath));
    }
  } catch (error) {
    // Handle network or unexpected errors
    console.error('Fetch error:', error);
    toast('Network error. Please try again.', {
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

    // Use the social callback endpoint to process the token from the plugin
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
    if (import.meta.client && (await useCapacitorDevice())) {
      // Wait a bit for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cookies = await CapacitorCookies.getCookies();
      console.log('🎈Google register cookies:🎈', cookies);
      if (cookies.accessToken) {
        accessTokenFromCookie = cookies.accessToken;
      }
    }

    // Get user info from the response
    if (response && response.user) {
      useUserStore().setUser(response.user);

      toast('Successfully registered/logged in with Google', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });

      const redirectPath = (route.query.redirect as string) || '/dashboard';
      await navigateTo(localePath(redirectPath));
    } else {
      throw new Error('User data not received from server');
    }
  } catch (error) {
    console.error('Google registration error:', error);
    toast('Google sign-up failed, please try again', {
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
    loading.value = false;
  }
};

// Facebook authentication function for Capacitor devices during registration using @capgo/capacitor-social-login
const facebookRegister = async () => {
  loading.value = true;

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

    // Process the Facebook registration using the social callback endpoint
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
    if (import.meta.client && (await useCapacitorDevice())) {
      // Wait a bit for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cookies = await CapacitorCookies.getCookies();
      console.log('🎈Facebook register cookies:🎈', cookies);
      if (cookies.accessToken) {
        accessTokenFromCookie = cookies.accessToken;
      }
    }

    // Get user info from the response
    if (response && response.user) {
      useUserStore().setUser(response.user);

      toast('Successfully registered/logged in with Facebook', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });

      const redirectPath = (route.query.redirect as string) || '/dashboard';
      await navigateTo(localePath(redirectPath));
    } else {
      throw new Error('User data not received from server');
    }
  } catch (error) {
    console.error('Facebook registration error:', error);
    toast('Facebook sign-up failed, please try again', {
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
    loading.value = false;
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
