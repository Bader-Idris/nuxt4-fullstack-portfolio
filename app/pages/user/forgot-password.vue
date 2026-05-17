<template>
  <div class="reset-password-form">
    <!-- TODO: add toast -->
    <form @submit.prevent="forgotPassword">
      <h2>add your email to reset the password</h2>
      <label for="email">Email</label>
      <input
        v-model="email"
        name="email"
        type="text"
        class="input"
        aria-labelledby="email"
      />
      <CustomButton button-type="primary" aria-label="Reset Password">
        <span>send email</span>
      </CustomButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";

type ForgotPasswordResponse = {
  success: boolean;
  message?: string;
};

const localePath = useLocalePath();
const email = ref("");

useSeoMeta({
  title: "Projects I created during my career",
  description:
    "Explore projects by Bader Idris, showcasing expertise in responsive web design, e-commerce, multi-step forms, todo apps, and stunning agency web apps. Powered by Vue.js, TypeScript, Node.js, and more.",
});

async function forgotPassword() {
  if (!email.value) {
    toast("Please enter a valid email", { theme: "dark", type: "error" });
    return;
  }

  try {
    const { data } = await useFetch<ForgotPasswordResponse>(
      "/api/v1/auth/forgot-password",
      {
        baseURL: useRuntimeConfig().public.originUrl,
        method: "POST",
        body: { email: email.value },
        server: false,
      },
    );

    if (data.value?.success) {
      toast("Email sent successfully", { theme: "dark", type: "success" });
      await navigateTo(localePath("/dashboard"), { replace: true });
    }
  } catch (error: any) {
    toast(error.data?.message || "An error occurred", {
      theme: "dark",
      type: "error",
    });
    console.error("Password reset error:", error);
  }
}
</script>

<style lang="scss">
.reset-password-form {
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
  }

  > form {
    @include flex-container(column, nowrap, center, center);
    margin: 20px auto;
    max-width: 600px;

    > * {
      margin: 10px;
      padding: 10px;
    }

    > label {
      margin-right: 37%;
    }
  }

  .warn,
  .verify {
    background-color: #007acc;
    color: white;
    padding: 30px;
    position: relative;
    left: 0;
    top: 0;
    border-radius: 4px;
    text-align: center;

    @include tablet-to-up {
      margin: auto 50px;
      width: 50%;
      transform: translate(50%, 50%);
    }

    @include mobile {
      margin: 20px;
    }
  }
}
</style>