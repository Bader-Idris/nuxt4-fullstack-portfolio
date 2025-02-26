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
      <button class="btn" :disabled="loading">
        <span v-if="loading">
          <CustomLoader />
        </span>
        <span v-else> Register </span>
      </button>
    </form>

    <div class="social-auth">
      <button class="btn social google" @click="socialLogin('google')">
        <NuxtImg src="/google-icon.svg" alt="Google" />
        Continue with Google
      </button>
      <button class="btn social facebook" @click="socialLogin('facebook')">
        <svgSocialsFbSvg class="svg" />
        Continue with Facebook
      </button>
    </div>

    <div v-if="showPrompt" class="prompt">
      <CustomLink aria-label="login page" to="/login" class="internal-link">
        login page
      </CustomLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/UserNameStore'
import { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
// import Fb from '~/components/svg/socials/FbSvg.vue'

// Important for disabling layouts
definePageMeta({
  layout: 'default', // Specify the layout
  hideLayout: true,  // This will be accessible via usePageMeta()
});

useSeoMeta({
  title: 'Register | Bader Idris',
  description: "Sign up on Bader Idris's platform to access exclusive content, resources, and services. Join a tech-savvy community led by a skilled full-stack developer.",
})

const user = ref<string>('')
const email = ref<string>('')
const password = ref<string>('')
const loading = ref<boolean>(false)
const showPrompt = ref<boolean>(false)

const router = useRouter();
const route = useRoute();

// Utility type for server response
interface RegisterResponse {
  msg: string
  [key: string]: any
}

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
          toast(error.value.data?.msg || 'Invalid request.', {
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
      // @ts-ignore Handle successful registration
      useUserStore().setUser(user.value);

      toast('Successfully Registered', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        dangerouslyHTMLString: true,
      });

      const redirectPath = (route.query.redirect as string) || '/protected';
      await navigateTo(redirectPath);
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

const socialLogin = (provider: string) => {
  if (import.meta.client) {
    window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider}`;
  }
};
</script>

<style lang="scss">
.register {
  @include mainMiddleSettings;

  @media (max-width: 768px) {
    @include phone-borders;
  }

  .form {
    display: flex;
    flex-direction: column;
    max-width: 400px;
    margin: 0 auto;

    .input {
      border: 1px solid gray;
      padding: 10px;
      margin-bottom: 20px;
      border-radius: 5px;
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

/* TODO: check them out! */
.social-auth {
  margin: 2rem auto;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (max-width: 768px) {
    width: calc(100% - 30px);
  }
}

.btn.social {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  padding: 10px 20px;
  height: 50px;
}

.btn.social img {
  width: 20px;
  height: 20px;
}
</style>
