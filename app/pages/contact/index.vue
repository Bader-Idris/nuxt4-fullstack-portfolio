<script setup lang="ts">
import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';
import { useApiError } from '~/composables/useApiError';

const { t, locale } = useI18n();
const { getFriendlyErrorMessage } = useApiError();
const isSubmitted = ref<boolean>(false);

useSeoMeta({
  title: t('contact.title'),
  description: t('contact.description'),
})

useSchemaOrg([
  {
    "@type": "ContactPage",
    name: t('contact.title'),
    description: t('contact.description'),
  }
])

// Form and messaging state
const name = ref<string>('');
const email = ref<string>('');
const message = ref<string>('');
const isLoading = ref<boolean>(false);

async function submitForm() {
  if (!validateForm()) return;

  isLoading.value = true;
  try {
    const url = `/api/v1/received_emails`;
    await $fetch(url, {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        message: message.value,
      },
      baseURL: useRuntimeConfig().public.originUrl,
    });

    isSubmitted.value = true;
    toast(t('messages.emailSent'), {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
    });

  } catch (error) {
    console.error('Contact form error:', error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    toast(friendlyMessage, {
      theme: 'auto',
      type: 'error',
      position: 'top-center',
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
  name.value = '';
  email.value = '';
  message.value = '';
};

// Form validation with i18n messages
const validateForm = (): boolean => {
  if (!name.value || !email.value || !message.value) {
    console.error('All form fields must be filled out.');
    toast(t('contact.form.all_fields'), {
      theme: 'auto',
      type: 'error',
      position: 'top-center',
    });
    return false;
  }
  if (!validateEmail(email.value)) {
    console.error('Invalid email format.');
    toast(t('contact.form.email_format'), {
      theme: 'auto',
      type: 'error',
      position: 'top-center',
    });
    return false;
  }
  return true;
};

// Validate email format using a regex
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format date function with i18n support
function formatDate(inputDate: Date): string {
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(inputDate);
}

// Update the date periodically using VueUse's useIntervalFn (SSR-friendly)
const date = ref<Date>(new Date());
const formattedDate = ref<string>(formatDate(date.value));

const { pause } = useIntervalFn(() => {
  date.value = new Date();
  formattedDate.value = formatDate(date.value);
}, 1000, { immediate: false });

onMounted(() => {
  if (import.meta.client) {
    date.value = new Date();
    formattedDate.value = formatDate(date.value);
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    pause();
  }
});
</script>

<template>
  <main class="cont">
    <div v-if="!isSubmitted" class="messaging">
      <label for="name">{{ t('contact.form.name') }}</label>
      <input 
        id="name" 
        v-model="name" 
        type="text"
        :placeholder="t('contact.form.name_placeholder')" 
        required>

      <label for="_email">{{ t('contact.form.email') }}</label>
      <input 
        id="_email" 
        v-model="email" 
        type="email"
        :placeholder="t('contact.form.email_placeholder')" 
        required>

      <label for="_message">{{ t('contact.form.message') }}</label>
      <textarea 
        id="_message" 
        v-model="message" 
        rows="5" 
        cols="33"
        :placeholder="t('contact.form.message_placeholder')" 
        style="resize: vertical"
        required />
      <CustomButton 
        button-type="default" 
        :disabled="isLoading"
        @click.prevent.stop="handleSubmit">
        {{ isLoading ? t('contact.form.sending') : t('contact.form.submit') }}
      </CustomButton>
    </div>

    <div v-else class="thank-you">
      <!-- TODO: check persona file for reason of not using this comp -->
      <!-- <NuxtImg
        src="/imgs/thanks.svg"
        alt="thank you message icon"
        :placeholder="[50, 50, 75, 75]"
        format="webp"
        loading="lazy"
      /> -->
      <img
        src="/imgs/thanks.svg"
        alt="thank you message icon"
        format="webp"
        loading="lazy"
      ></img>
      <p>{{ t('messages.thank_you.emailMsg') }}</p>
      <CustomButton button-type="default" @click="resetForm">{{
        t('contact.form.send_new') }}
      </CustomButton>
    </div>

    <!-- Display the message as code format -->
    <div class="beautiful-results">
      <div class="first-query">
        <span>const</span>
        <div class="var-name">button</div>
        <div class="query">
          <span>document</span><span>.</span><span>querySelector</span><span>'#sendBtn'</span>
        </div>
      </div>
      <div class="message-to-json">
        <span>const</span>
        <div class="var-name">message</div>
        <span> =</span>
        <span> {</span>
        <div class="data-object">
          <div class="set">
            <span class="options">name</span>
            <p class="name results">{{ name }}</p>
          </div>
          <div class="set">
            <span class="options">email</span>
            <p class="email results">{{ email }}</p>
          </div>
          <div class="set">
            <span class="options">message</span>
            <p class="message results" style="white-space: pre-line">{{ message
              }}</p>
          </div>
          <div class="set">
            <span class="options">date</span>
            <p class="date results">{{ formattedDate }}</p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="scss">
  main.cont {
    width: calc(100% - 300px);
    position: absolute;
    top: 0;
    height: calc(100vh - 180px);
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

    @include tablet-to-up {
      left: 300px;
    }

    .messaging {
      @include flex-container(column, nowrap, unset, unset);
      align-content: flex-end;

      @include tablet-to-up {
        margin-bottom: 60px;
        height: calc(100vh - 260px);
        position: relative;
        overflow-y: scroll;
      }

      >* {
        margin-bottom: 20px;
        line-height: 1.6;
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
      }

      @include mobile {
        padding-top: 50px;

        p {
          width: 100%;
        }
      }
    }

    textarea,
    input[type='text'],
    input[type='email'] {
      background: $primary3;
      border-radius: 5px;
      border: 2px solid transparent;
      padding: 10px;
      color: $secondary1;

      &:focus {
        outline: none;
        border: 2px solid $secondary1;
      }

      &::placeholder {
        color: $secondary1;
        opacity: 0.5;
      }

      &:focus::placeholder {
        color: transparent;
      }
    }
    textarea {
      padding-bottom: 30px;
    }

    button {
      width: fit-content;
      padding: 10px;
    }

    @include tablet-to-up {
      >span {
        width: 1px;
        height: calc(100vh - 180px);
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

        >span:first-of-type {
          color: $accent4;
        }
      }

      .message-to-json {
        >span:first-of-type {
          color: $accent4;
        }

        >span:nth-of-type(2) {
          color: $accent4;
        }

        >span:nth-of-type(3) {
          color: $accent5;
        }
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
          &:first-of-type {
            color: $secondary2;
          }

          &:nth-of-type(2) {
            color: $secondary1;
          }

          &:nth-of-type(3) {
            color: $secondary3;
          }

          &:last-of-type {
            color: $accent1;

            &::before,
            &::after {
              color: $secondary1;
            }

            &::before {
              content: '(';
            }

            &::after {
              content: ')';
            }
          }
        }
      }

      .data-object {
        margin-bottom: 10px;

        @include tablet-to-up {
          margin-bottom: 60px;
          height: calc(100vh - 260px);
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
              content: ': ';
              color: $secondary1;
            }
          }

          .results {
            color: $accent1;
            width: 300px;

            &::before,
            &::after {
              content: '"';
            }

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

              &::-webkit-scrollbar {
                display: none;
              }
            }
          }
        }

        &::after {
          content: '}';
          color: $accent5;
        }
      }

      .event-listener {
        .first-line {
          .dom-keyword {
            color: $secondary2;
          }

          .dot {
            color: $secondary1;
          }

          .event {
            color: $secondary3;
          }

          .click-event {
            color: $accent1;

            &::before,
            &::after {
              color: $secondary1;
            }

            &::before {
              content: '(';
            }

            &::after {
              content: ' , ';
            }
          }

          .parenthesis,
          .curly {
            color: $accent4;
          }

          .arrow {
            color: $accent4;
            padding: 0 10px;
          }
        }

        .second-line {
          padding: 5px 20px;

          .dom-form {
            color: $secondary2;
          }

          .dot {
            color: $secondary1;
          }

          .event {
            color: $secondary3;
          }

          .message-var {
            color: $secondary4;

            &::before,
            &::after {
              color: $secondary1;
            }

            &::before {
              content: '(';
            }

            &::after {
              content: ')';
            }
          }
        }

        .third-line {
          .curly {
            color: $accent4;
          }

          .parenthesis {
            color: $accent5;
          }
        }
      }
    }

    .received-to-admin {
      margin-top: 50px;

      
      >button {
        margin-bottom: 20px;
      margin-left: 15px;
      @include mobile {
          width: calc(100% - 20px);
        }
      }
    }
  }
</style>