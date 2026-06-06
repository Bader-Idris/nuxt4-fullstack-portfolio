<script setup lang="ts">
import { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";
import { useApiError } from "~/composables/useApiError";
import { z } from "zod";

const { t, locale } = useI18n();

useSeoMeta({
  title: t("contact.title"),
  description: t("contact.description"),
  ogUrl: `${useRuntimeConfig().public.originUrl}${useLocalePath()(useRoute().path)}`,
});

if (import.meta.server) {
  useSchemaOrg([
    defineWebPage({
      name: () => t("contact.title"),
      description: () => t("contact.description"),
    }),
    defineWebSite({
      name: 'Bader Idris Portfolio',
      url: 'https://baderidris.com'
    })
  ]);
}

const { getFriendlyErrorMessage } = useApiError();
const isSubmitted = ref<boolean>(false);
const thanksImage = ref<string>("/imgs/thanks.svg");

// Form and messaging state
const name = ref<string>("");
const email = ref<string>("");
const message = ref<string>("");
const isLoading = ref<boolean>(false);
const formErrors = ref<Record<string, string>>({});

// Zod schema for frontend validation
const contactSchema = z.object({
  name: z.string()
    .min(2, t("contact.form.errors.name_min"))
    .max(100, t("contact.form.errors.name_max")),
  email: z.string()
    .email(t("contact.form.errors.email_invalid")),
  message: z.string()
    .min(10, t("contact.form.errors.message_min"))
    .max(5000, t("contact.form.errors.message_max")),
});

async function submitForm() {
  if (!validateForm()) return;

  isLoading.value = true;
  formErrors.value = {};
  
  try {
    const url = `/api/v1/received_emails`;
    await $fetch(url, {
      method: "POST",
      body: {
        name: name.value,
        email: email.value,
        message: message.value,
      },
      baseURL: useRuntimeConfig().public.originUrl,
    });

    isSubmitted.value = true;
    toast(t("messages.emailSent"), {
      theme: "auto",
      type: "success",
      position: "top-center",
    });
  } catch (error: any) {
    console.error("Contact form error:", error);
    
    // Handle Zod errors from server if available
    if (error.data?.errors) {
      error.data.errors.forEach((err: any) => {
        if (err.path?.[0]) {
          formErrors.value[err.path[0]] = err.message;
        }
      });
    }

    const friendlyMessage = getFriendlyErrorMessage(error);
    toast(friendlyMessage, {
      theme: "auto",
      type: "error",
      position: "top-center",
    });
  } finally {
    isLoading.value = false;
  }
}

const handleSubmit = (): void => {
  if (isLoading.value) return;
  submitForm();
};

// Reset form data securely
const resetForm = (): void => {
  isSubmitted.value = false;
  name.value = "";
  email.value = "";
  message.value = "";
  formErrors.value = {};
};

// Form validation with Zod
const validateForm = (): boolean => {
  formErrors.value = {};
  const result = contactSchema.safeParse({
    name: name.value,
    email: email.value,
    message: message.value,
  });

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const path = issue.path[0] as string;
      if (!formErrors.value[path]) {
        formErrors.value[path] = issue.message;
      }
    });
    return false;
  }
  return true;
};

const { formatDateShort } = useDateFormatter();

// Update the date periodically using VueUse's useIntervalFn (SSR-friendly)
const date = ref<Date>(new Date());
const formattedDate = ref<string>(formatDateShort(date.value).toUpperCase());

const { pause } = useIntervalFn(
  () => {
    date.value = new Date();
    formattedDate.value = formatDateShort(date.value).toUpperCase();
  },
  1000,
  { immediate: false },
);

const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  content: ""
});

const onResultContext = (event: MouseEvent, text: string) => {
  contextMenu.show = true;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.content = text;
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast(t("messages.copied"), { theme: "auto", type: "success", position: "bottom-right", autoClose: 1000 });
  } catch (err) {
    console.error("Copy failed", err);
  }
  contextMenu.show = false;
};

onMounted(() => {
  if (import.meta.client) {
    date.value = new Date();
    formattedDate.value = formatDateShort(date.value).toUpperCase();
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    pause();
  }
});
</script>

<template>
  <div class="cont">
    <div v-if="!isSubmitted" class="messaging" :class="{ 'rtl': locale === 'ar' }">
      <div class="input-group">
        <label for="name">{{ t("contact.form.name") }}</label>
        <input
          id="name"
          v-model="name"
          type="text"
          :placeholder="t('contact.form.name_placeholder')"
          :class="{ invalid: formErrors.name }"
          required
        />
        <Transition name="fade-error">
          <span v-if="formErrors.name" class="error-msg">{{ formErrors.name }}</span>
        </Transition>
      </div>

      <div class="input-group">
        <label for="_email">{{ t("contact.form.email") }}</label>
        <input
          id="_email"
          v-model="email"
          type="email"
          :placeholder="t('contact.form.email_placeholder')"
          :class="{ invalid: formErrors.email }"
          required
        />
        <Transition name="fade-error">
          <span v-if="formErrors.email" class="error-msg">{{ formErrors.email }}</span>
        </Transition>
      </div>

      <div class="input-group">
        <label for="_message">{{ t("contact.form.message") }}</label>
        <TiptapEditor
          id="_message"
          v-model="message"
          :placeholder="t('contact.form.message_placeholder')"
          :class="{ invalid: formErrors.message }"
        />
        <Transition name="fade-error">
          <span v-if="formErrors.message" class="error-msg">{{ formErrors.message }}</span>
        </Transition>
      </div>

      <CustomButton
        button-type="default"
        :disabled="isLoading"
        @click.prevent.stop="handleSubmit"
      >
        {{ isLoading ? t("contact.form.sending") : t("contact.form.submit") }}
      </CustomButton>
    </div>

    <div v-else class="thank-you">
      <img
        :src="thanksImage"
        alt="thank you message icon"
        loading="lazy"
      />
      <p>{{ t("messages.thank_you.emailMsg") }}</p>
      <CustomButton button-type="default" @click="resetForm"
        >{{ t("contact.form.send_new") }}
      </CustomButton>
    </div>

    <!-- Display the message as code format -->
    <div class="beautiful-results">
      <div class="first-query">
        <span>const</span>
        <div class="var-name">button</div>
        <div class="query">
          <span>document</span><span>.</span><span>querySelector</span
          ><span>'#sendBtn'</span>
        </div>
      </div>
      <div class="message-to-json">
        <span>const</span>
        <div class="var-name">message</div>
        <span> =</span>
        <span> {</span>
        <div class="data-object">
          <div class="set" @contextmenu.prevent="onResultContext($event, name)" @click="onResultContext($event, name)">
            <span class="options">name</span>
            <p class="name results">{{ name }}</p>
          </div>
          <div class="set" @contextmenu.prevent="onResultContext($event, email)" @click="onResultContext($event, email)">
            <span class="options">email</span>
            <p class="email results">{{ email }}</p>
          </div>
          <div class="set" @contextmenu.prevent="onResultContext($event, message)" @click="onResultContext($event, message)">
            <span class="options">message</span>
            <p class="message results" style="white-space: pre-line" v-html="message"></p>
          </div>
          <div class="set" @contextmenu.prevent="onResultContext($event, formattedDate)" @click="onResultContext($event, formattedDate)">
            <span class="options">date</span>
            <p class="date results">{{ formattedDate }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu for Results -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @close="contextMenu.show = false"
    >
      <button @click="copyToClipboard(contextMenu.content)">
        <Icon name="material-symbols:content-copy" /> Copy Value
      </button>
    </ContextMenu>
  </div>
</template>

<style lang="scss" scoped>
.cont {
  width: 100%;
  height: 100%;
  @include flex-container(row, nowrap, space-around, flex-start);
  padding: 100px 10px;

  @media screen and (max-height: 668px) {
    padding: 30px 10px;
  }

  @include mobile {
    flex-direction: column;
    width: 100%;
    position: relative;
    overflow: auto;
    padding-top: 10px;
    display: flex;

    .beautiful-results {
      display: none;
    }

    .messaging {
      width: 100%;
      padding: 0 10px;
    }
  }

  .messaging.rtl {
    direction: rtl;
    text-align: right;
    
  }

  @include tablet-to-up {
    // left: 300px;
    // position: absolute;
    // top: 0;
  }

  .messaging {
    @include flex-container(column, nowrap, unset, unset);
    align-content: flex-end;
    width: 450px;

    @include mobile {
      width: 100%;
    }

    @include tablet-to-up {
      margin-bottom: 60px;
      height: calc($full-viewport-height - 260px);
      position: relative;
      overflow-y: scroll;
      padding-right: 20px;
    }

    .input-group {
      @include flex-container(column, nowrap, unset, unset);
      margin-bottom: 24px;
      gap: 8px;

      label {
        color: $secondary1;
        font-size: $labels-size;
        transition: color 0.3s ease;
      }

      &:focus-within label {
        color: $secondary4;
      }

      input[type="text"],
      input[type="email"],
      textarea {
        background: $primary3;
        border: 1px solid $lines;
        border-radius: 8px;
        padding: 12px 16px;
        color: $secondary4;
        transition: all 0.3s ease;
        font-family: inherit;
        width: 100%;

        &::placeholder {
          color: $secondary1;
          opacity: 0.5;
        }

        &:hover {
          border-color: $secondary1;
        }

        &:focus {
          outline: none;
          border-color: $secondary2;
          box-shadow: 0 0 0 2px rgba($secondary2, 0.2);
        }

        &.invalid {
          border-color: $accent3;
          &:focus {
            box-shadow: 0 0 0 2px rgba($accent3, 0.2);
          }
        }
      }

      textarea {
        min-height: 150px;
        resize: vertical;
      }

      .error-msg {
        color: $accent3;
        font-size: 14px;
        margin-top: 4px;
        display: block;
      }
    }

    .fade-error-enter-active,
    .fade-error-leave-active {
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .fade-error-enter-from,
    .fade-error-leave-to {
      opacity: 0;
      transform: translateY(-5px);
    }
  }

  .thank-you {
    @include flex-container(column, nowrap, unset, center);
    flex-basis: 50%;

    img {
      width: 300px;
      margin-bottom: 50px;
    }

    p {
      text-align: center;
      width: 340px;
      line-height: 1.7;
      color: $secondary1;
    }

    @include mobile {
      padding-top: 50px;
      p {
        width: 100%;
      }
    }
  }

  button {
    width: fit-content;
    padding: 10px;
  }

  @include tablet-to-up {
    > span {
      width: 1px;
      height: calc($full-viewport-height - 180px);
      background: $lines;
      margin: 0 10px;
      position: relative;
      top: -100px;
    }
  }

  .beautiful-results {
    padding-top: 15px;
    font-weight: bold;

    .first-query {
      padding-bottom: 20px;
      > span:first-of-type {
        color: $accent4;
      }
    }

    .message-to-json {
      > span:first-of-type { color: $accent4; }
      > span:nth-of-type(2) { color: $accent4; }
      > span:nth-of-type(3) { color: $accent5; }
    }

    .var-name,
    .data-object .options {
      color: $secondary3;
    }

    .var-name,
    .query {
      display: inline-block;
      margin-left: 15px;
    }

    .query {
      span {
        &:first-of-type { color: $secondary2; }
        &:nth-of-type(2) { color: $secondary1; }
        &:nth-of-type(3) { color: $secondary3; }
        &:last-of-type {
          color: $accent1;
          &::before, &::after { color: $secondary1; }
          &::before { content: "("; }
          &::after { content: ")"; }
        }
      }
    }

    .data-object {
      margin-bottom: 10px;
      @include tablet-to-up {
        margin-bottom: 60px;
        height: calc($full-viewport-height - 260px);
        position: relative;
        overflow-y: scroll;
      }

      .set {
        @include flex-container(row, nowrap, flex-start, unset);
        align-items: baseline;
        margin-left: 20px;

        .options {
          padding-right: 10px;
          &::after {
            content: ": ";
            color: $secondary1;
          }
        }

        .results {
          color: $accent1;
          width: 300px;
          &::before, &::after { content: '"'; }

          &.name,
          &.email {
            overflow: hidden;
            max-width: 100%;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          &.message {
            max-height: 250px;
            overflow-y: scroll;
            font-weight: normal;
            &::-webkit-scrollbar { display: none; }
          }
        }
      }

      &::after {
        content: "}";
        color: $accent5;
      }
    }
  }
}
</style>
