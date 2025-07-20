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
          <input type="checkbox" v-model="agreePolicies" />
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
      // @ts-ignore Handle successful registration
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

const socialLogin = (provider: string) => {
  if (import.meta.client) {
    window.location.href = `${useRuntimeConfig().public.originUrl}/api/v1/auth/${provider}`;
  }
};
</script>

<style lang="scss">
.register {
  @include mainMiddleSettings;
  @include mobile {
    @include phone-borders;
    height: calc(100vh - 30px);
  }
  @include tablet-to-up {
    height: calc(100vh - 60px);
  }

  .form {
    display: flex;
    flex-direction: column;
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
        display: flex;
        align-items: center;
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
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.social-auth {
  margin: 2rem auto;
  max-width: 400px;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  gap: 1rem;

  @include mobile {
    width: calc(100% - 30px);
  }
  .btn {
    cursor: pointer;
  }
}

.btn.social {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
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
