<template>
  <div class="unsubscribe-comp">
    <div v-if="isLoading" class="verify">
      <p>{{ t("auth.unsubscribing", "Unsubscribing from our list...") }}</p>
    </div>
    <div v-else-if="unsubscribed" class="verify">
      <p>{{ t("auth.unsubscribe_success", "You have been successfully unsubscribed.") }}</p>
      <p>
        <span>{{ seconds < 10 ? "0" + seconds : seconds }}</span>
        {{ t("auth.countdown_hint", { seconds: "" }).replace("0", "").trim() }}
      </p>
    </div>
    <div v-else class="warn">
      <p>{{ errorMessage || t("auth.unsubscribe_failed", "Unsubscription failed.") }}</p>
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

type UnsubscribeResponse = {
  message: string;
};

// Use useState to persist state across SSR and CSR hydration
const unsubscribed = useState<boolean>("unsubscribe-success", () => false);
const isLoading = useState<boolean>("unsubscribe-loading", () => true);
const errorMessage = useState<string | null>("unsubscribe-error", () => null);
const seconds = ref(10);

// Extract query parameters
const email = computed(() => {
  const val = route.query.email;
  return (Array.isArray(val) ? val[0] : val)?.toString();
});
const verificationToken = computed(() => {
  const val = route.query.verificationToken;
  return (Array.isArray(val) ? val[0] : val)?.toString();
});

// Unsubscribe function
const unsubscribe = async () => {
  if (unsubscribed.value || (import.meta.client && !isLoading.value)) return;

  if (!email.value) {
    errorMessage.value = t("auth.missing_email", "Missing email address");
    isLoading.value = false;
    return;
  }

  try {
    isLoading.value = true;
    const data = await $fetch<UnsubscribeResponse>(
      "/api/v1/auth/unsubscribe",
      {
        baseURL: useRuntimeConfig().public.originUrl,
        method: "POST",
        body: {
          email: email.value,
          verificationToken: verificationToken.value,
        },
      },
    );

    if (data.message === "Successfully unsubscribed") {
      unsubscribed.value = true;
      errorMessage.value = null;
    } else {
      errorMessage.value = data.message || t("auth.unsubscribe_failed");
    }
  } catch (err: any) {
    errorMessage.value =
      err.data?.message || err.message || t("auth.unsubscribe_failed");
    unsubscribed.value = false;
  } finally {
    isLoading.value = false;
  }
};

// Execute unsubscription
if (isLoading.value && !unsubscribed.value) {
  if (email.value) {
    if (import.meta.server) {
      await unsubscribe();
    } else {
      unsubscribe();
    }
  } else {
    isLoading.value = false;
    errorMessage.value = t("auth.invalid_unsub_link", "Invalid unsubscription link");
  }
}

useSeoMeta({
  title: t("auth.unsubscribe_title", "Unsubscribe"),
  description: t("auth.unsubscribe_description", "Unsubscribe from our email notifications."),
});

// Countdown timer
const { pause } = useIntervalFn(() => {
  if (!unsubscribed.value) return;
  seconds.value--;
  if (seconds.value <= 0) {
    pause();
    navigateTo(localePath("/"), { replace: true });
  }
}, 1000);

onMounted(() => {
  if (!isLoading.value) {
    if (unsubscribed.value) {
      toast(t("auth.unsubscribe_success"), { theme: "dark", type: "success" });
    } else if (errorMessage.value) {
      toast(errorMessage.value, { theme: "dark", type: "error" });
    }
  }
});
</script>

<style lang="scss">
.unsubscribe-comp {
  @include flex-container(column, nowrap, center, center);
  width: calc(100dvw - 60px);
  height: calc(100dvh - 60px);
  margin: auto;
  background-color: var(--body-bg, #010c15);
  overflow: hidden;

  @include mobile {
    width: calc(100dvw - 30px);
    height: calc(100dvh - 60px);
    @include phone-borders;
  }

  .warn,
  .verify {
    background: rgba(1, 18, 33, 0.4);
    border: 1px solid var(--lines-color, #1e2d3d);
    color: white;
    padding: 2rem 1.5rem;
    border-radius: 12px;
    text-align: center;
    width: 100%;
    max-width: 450px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);

    @include tablet-to-up {
       padding: 3.5rem 3rem;
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