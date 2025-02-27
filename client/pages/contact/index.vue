<script setup lang="ts">
import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';

const isSubmitted = ref<boolean>(false)

// Form and messaging state
const name = ref<string>('')
const email = ref<string>('')
const message = ref<string>('')
const isLoading = ref<boolean>(false);
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;


const handleSubmit = async (): Promise<void> => {
  if (isLoading.value) return;

  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(async () => {
    if (validateForm()) {
      isLoading.value = true;
      try {
        const url = `/api/v1/received_emails`;
        const { data, error } = await useFetch(url, {
          method: 'POST',
          body: JSON.stringify({
            name: name.value,
            email: email.value,
            message: message.value,
          }),
          baseURL: useRuntimeConfig().public.originUrl,
        });

        if (error.value) {
          // Handle API errors
          toast(error.value.data?.error || 'An error occurred while sending the email.', {
            theme: 'dark',
            type: 'error',
            position: 'top-center',
          });
        } else {
          // Handle success
          isSubmitted.value = true;
          toast('Email sent successfully!', {
            theme: 'auto',
            type: 'success',
            position: 'top-center',
          });
        }
      } catch (error) {
        // Handle network or unexpected errors
        console.error(error);
        toast('Network error. Please try again.', {
          theme: 'dark',
          type: 'error',
          position: 'top-center',
        });
      } finally {
        isLoading.value = false;
      }
    }
  }, 300);
};

// Reset form data securely
const resetForm = (): void => {
  isSubmitted.value = false;
  name.value = '';
  email.value = '';
  message.value = '';
};


// Form validation for better security
const validateForm = (): boolean => {
  if (!name.value || !email.value || !message.value) {
    console.error('All form fields must be filled out.');
    toast('All fields are required.', {
      theme: 'dark',
      type: 'error',
      position: 'top-center',
      dangerouslyHTMLString: true,
    });
    return false;
  }
  if (!validateEmail(email.value)) {
    console.error('Invalid email format.');
    return false;
  }
  return true;
};

// Validate email format using a regex
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format date function with typing
function formatDate(inputDate: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const day = days[inputDate.getDay()];
  const date = inputDate.getDate();
  const month = months[inputDate.getMonth()];

  return `${day} ${date} ${month}`;
}


// Update the date periodically
let dateInterval: ReturnType<typeof setInterval>;

const date = ref<Date>(new Date())
const formattedDate = ref<string>(formatDate(date.value))

onMounted(() => {
  if (import.meta.client) {
    dateInterval = setInterval(() => {
      date.value = new Date();
      formattedDate.value = formatDate(date.value);
    }, 1000);
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    clearInterval(dateInterval);
  }
});
</script>

<template>
  
    <main class="cont">
      <div v-if="!isSubmitted" class="messaging">
        <label for="name">_name:</label>
        <input
id="name"
          v-model="name"
          type="text"
          placeholder="John Doe"
          required
        >

        <label for="_email">_email:</label>
        <input
id="_email"
          v-model="email"
          type="email"
          placeholder="JohnDoe@gmail.com"
          required
        >

        <label for="_message">Message:</label>
        <textarea
id="_message"
          v-model="message"
          rows="5"
          cols="33"
          placeholder="Leave your comment here!"
          style="resize: vertical"
          required
        />
        <CustomButtons
button-type="default"
          :disabled="isLoading"
          @click.prevent.stop="handleSubmit">
          {{ isLoading ? 'Sending...' : 'submit-message' }}
        </CustomButtons>
      </div>

      <div v-else class="thank-you">
        <NuxtImg src="/imgs/thanks.svg" alt="thank you message icon" />
        <p>Your message has been accepted. You will receive an answer really
          soon!</p>
        <CustomButtons button-type="default" @click="resetForm">send-new-message
        </CustomButtons>
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
              <p class="message results" style="white-space: pre-line">{{
                message }}</p>
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
    display: flex;
    position: absolute;
    top: 0;
    height: calc(100vh - 180px);
    justify-content: space-around;
    align-items: flex-start;
    padding: 100px 10px;

    @media screen and (max-height: 668px) {
      padding: 30px 10px;
    }

    @media (max-width: 768px) {
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

    @media (min-width: 769px) {
      left: 300px;
    }

    .messaging {
      display: flex;
      flex-direction: column;
      align-content: flex-end;

      @media screen and (min-width: 768px) {
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
      display: flex;
      align-items: center;
      flex-direction: column;
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

      @media (max-width: 768px) {
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

    @media (min-width: 768px) {
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

        @media screen and (min-width: 768px) {
          margin-bottom: 60px;
          height: calc(100vh - 260px);
          position: relative;
          overflow-y: scroll;
        }

        .set {
          display: flex;
          justify-content: flex-start;
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
      }
    }
  }
</style>