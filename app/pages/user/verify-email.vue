<template>
  <div class="verify-comp">
    <div v-if="isLoading" class="verify">
      <p>{{ t("auth.verifying") }}</p>
    </div>
    <div v-else-if="verified" class="verify">
      <p>{{ t("auth.verified_success") }}</p>
      <p>
        <span>{{ seconds < 10 ? "0" + seconds : seconds }}</span>
        {{ t("auth.countdown_hint", { seconds: "" }).replace("0", "").trim() }}
      </p>
    </div>
    <div v-else class="warn">
      <p>{{ errorMessage || t("auth.verification_failed") }}</p>
      <CustomButton
        class="go-back"
        button-type="primary"
        aria-label="go to main page"
      >
        <CustomLink :to="localePath('/')">
          <span> {{ t("auth.go_back_home") }} </span>
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

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();

type VerifyEmailResponse = {
  message: string;
};

// Use useState to persist state across SSR and CSR hydration
const verified = useState<boolean>("verify-email-verified", () => false);
const isLoading = useState<boolean>("verify-email-loading", () => true);
const errorMessage = useState<string | null>("verify-email-error", () => null);
const seconds = ref(10); // Countdown doesn't need to be hydrated

// Extract query parameters - these are reactive and handle arrays
const email = computed(() => {
  const val = route.query.email;
  return (Array.isArray(val) ? val[0] : val)?.toString();
});
const verificationToken = computed(() => {
  const val = route.query.verificationToken;
  return (Array.isArray(val) ? val[0] : val)?.toString();
});

// Verification function
const verifyEmail = async () => {
  // If already verified or currently loading on the client after SSR, skip
  if (verified.value || (import.meta.client && !isLoading.value)) return;

  if (!email.value || !verificationToken.value) {
    errorMessage.value = t("auth.missing_params");
    isLoading.value = false;
    return;
  }

  try {
    isLoading.value = true;
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
      errorMessage.value = null;
    } else {
      errorMessage.value = data.message || t("auth.verification_failed");
    }
  } catch (err: any) {
    errorMessage.value =
      err.data?.message || err.message || t("auth.verification_failed");
    verified.value = false;
  } finally {
    isLoading.value = false;
  }
};

// Execute verification once (either on SSR or CSR)
if (isLoading.value && !verified.value) {
  // If we have the parameters, attempt verification
  if (email.value && verificationToken.value) {
    // On server, we must await. On client, we can call it.
    if (import.meta.server) {
      await verifyEmail();
    } else {
      verifyEmail();
    }
  } else {
    // If we're on the client and parameters are missing after hydration
    isLoading.value = false;
    errorMessage.value = t("auth.invalid_link");
  }
}

useSeoMeta({
  title: t("auth.verify_email_title"),
  description: t("auth.register_description"),
});

if (import.meta.server) {
  useSchemaOrg([
    defineWebPage({
      name: () => t("auth.verify_email_title"),
      description: () => t("auth.register_description"),
    }),
    defineWebSite({
      name: 'Bader Idris Portfolio',
      url: 'https://baderidris.com'
    })
  ]);
}

// Countdown timer
const { pause } = useIntervalFn(() => {
  if (!verified.value) return;
  seconds.value--;
  if (seconds.value <= 0) {
    pause();
    navigateTo(localePath("/"), { replace: true });
  }
}, 1000);

// Client-side toast notifications
onMounted(() => {
  // Show toast based on result if not loading
  if (!isLoading.value) {
    if (verified.value) {
      toast(t("messages.emailSent"), { theme: "dark", type: "success" });
    } else if (errorMessage.value) {
      toast(errorMessage.value, { theme: "dark", type: "error" });
    }
  }
});
</script>

<style lang="scss">
.verify-comp {
  @include flex-container(column, nowrap, center, center);
  width: calc(100dvw - 60px);
  height: calc(100dvh - 180px);
  margin: auto;
  background-color: var(--body-bg, #010c15);
  overflow: hidden;

  @include mobile {
    width: calc(100dvw - 30px);
    height: calc(100dvh - 90px);
    @include phone-borders;
  }

  .warn,
  .verify {
    background: rgba(1, 18, 33, 0.4);
    border: 1px solid var(--lines-color, #1e2d3d);
    color: white;
    padding: 2rem 1.5rem; // Optimized padding for mobile
    border-radius: 12px;
    text-align: center;
    width: 100%;
    max-width: 450px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);

    @include tablet-to-up {
       padding: 3.5rem 3rem; // More spacious on larger screens
    }

    p {
      margin-bottom: 1.5rem;
      font-size: 1.1rem;
      line-height: 1.6;
      
      span {
        color: var(--accent-primary, #fea55f);
        font-weight: bold;
        font-size: 1.2rem;
      }
    }
  }

  .go-back {
    width: 100%;
    margin-top: 1rem;
  }
}
</style>