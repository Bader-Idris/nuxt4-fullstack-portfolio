<template>
  <div class="verify-comp">
    <div v-if="isLoading" class="verify">
      <p>Verifying your email...</p>
    </div>
    <div v-else-if="verified" class="verify">
      <p>Your email has been verified</p>
      <p>
        <span>{{ seconds < 10 ? "0" + seconds : seconds }}</span> seconds to go
        to the main page
      </p>
    </div>
    <div v-else class="warn">
      <p>Please check your email again</p>
      <CustomButton
        class="go-back"
        button-type="primary"
        aria-label="go to main page"
      >
        <CustomLink :to="localePath('/')">
          <span> or go back to main page </span>
        </CustomLink>
      </CustomButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";
import { useIntervalFn } from "@vueuse/core";
import { useRoute, useLocalePath, computed, ref, onMounted } from "#imports";

const localePath = useLocalePath();
const route = useRoute();

type VerifyEmailResponse = {
  message: string;
};

const seconds = ref(10);
const verified = ref(false);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

// Extract query parameters - reactive access
const email = computed(() => route.query.email?.toString());
const verificationToken = computed(() =>
  route.query.verificationToken?.toString(),
);

// Verification function
const verifyEmail = async () => {
  if (!email.value || !verificationToken.value) {
    errorMessage.value = "Missing verification parameters";
    isLoading.value = false;
    return;
  }

  try {
    const data = await $fetch<VerifyEmailResponse>(
      "/api/v1/auth/verify-email",
      {
        baseURL: useRuntimeConfig().public.originUrl,
        method: "POST",
        body: {
          email: email.value,
          verificationToken: verificationToken.value,
        },
      },
    );

    if (data.message === "Email Verified") {
      verified.value = true;
    }
  } catch (err: any) {
    errorMessage.value =
      err.data?.message || err.message || "Verification failed";
  } finally {
    isLoading.value = false;
  }
};

// Verify immediately on component setup (works for both SSR and CSR)
await verifyEmail();

useSeoMeta({
  title: "Verify Email",
  description: "A redirect page for email verification via email",
});

useSchemaOrg([
  defineWebPage({
    name: "Verify Email",
    description: "Email verification page.",
  }),
  defineWebSite({
    name: 'Bader Idris Portfolio',
    url: 'https://baderidris.com'
  })
]);

// Countdown timer
const { pause } = useIntervalFn(() => {
  seconds.value--;
  if (seconds.value <= 0) {
    pause();
    if (verified.value) navigateTo(localePath("/"));
  }
}, 1000);

// Client-side toast notifications and re-verification on mount
onMounted(() => {
  if (import.meta.client) {
    // Re-verify on mount if query params exist (handles direct URL access)
    if (email.value && verificationToken.value && isLoading.value) {
      verifyEmail();
    }

    // Show toast based on result
    if (verified.value) {
      toast("Email verified successfully", { theme: "dark", type: "success" });
    } else if (errorMessage.value) {
      toast(errorMessage.value, { theme: "dark", type: "error" });
    }
  }
});
</script>

<style lang="scss">
.verify-comp {
  @include mainMiddleSettings;

  @include mobile {
    @include phone-borders;
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

  .warn {
    @include mobile {
      // width: 100%;
      // left: 0;
    }
  }
}
</style>