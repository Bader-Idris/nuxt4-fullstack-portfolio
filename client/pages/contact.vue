<template>
  <div class="about-me">
    <aside>
      <FoldableTab @toggle="toggleContact">
        <p>contacts</p>
      </FoldableTab>
      <div
        :style="{ display: contactDisplay }"
        class="personal-contact"
        :class="{ hidden: isContactHidden }">
        <ClientOnly>
        <p @click="(openMailTo(0), copyToClipboard(0))">
          {{ firstContact }}
          <i v-if="showIcon[0]" class="fa-solid fa-envelope" />
        </p>
        <p @click="copyToClipboard(1)">
          {{ secondContact }}
          <i v-if="showIcon[1]" class="fa-solid fa-copy" />
        </p>
        </ClientOnly>
      </div>

      <FoldableTab @toggle="toggleSocials">
        <p>find-me-also-in</p>
      </FoldableTab>
      <div
:style="{ display: socialsDisplay }"
        class="personal-socials"
        :class="{ hidden: isSocialsHidden }">
        <ul>
          <li>
            <CustomLink
aria-label="go to my css battle page"
              to="https://cssbattle.dev/player/bader_idris"
              class="external-link">Css Battle
            </CustomLink>
          </li>
          <li>
            <CustomLink
aria-label="go to my youtube channel"
              to="/not-created-yet">YouTube Channel
            </CustomLink>
          </li>
          <li>
            <CustomLink
aria-label="go to my front end mentor profile"
              to="https://www.frontendmentor.io/profile/Bader-Idris"
              class="external-link">Front End Mentor</CustomLink>
          </li>
          <li>
            <CustomLink
aria-label="go to my exercism profile"
              to="https://exercism.org/profiles/Bader-Idris"
              class="external-link">Exercism</CustomLink>
          </li>
          <li>
            <CustomLink
aria-label="go to my code wars profile"
              to="https://www.codewars.com/users/Bader-Idris"
              class="external-link">CodeWar</CustomLink>
          </li>
        </ul>
      </div>
    </aside>

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
    <ClientOnly>
      <section
v-if="authStore.user?.role === 'admin'"
        class="received-to-admin">
        <CustomButtons button-type="ghost">
          <CustomLink to="/contact/admin">fetch-messages</CustomLink>
        </CustomButtons>
        <NuxtPage />
      </section>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
// import { useClipboard } from '@vueuse/core';
import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';
import { useUserStore } from '~/stores/UserNameStore';

useSeoMeta({
  title: 'Get in Touch with Bader Idris, via multiple approaches',
  description: "Connect with Bader Idris for collaborations or tech innovations. Reach out via email, phone call, or GitHub to bring your ideas to life with a full-stack expert.",
})

const contactDisplay = ref('block');
const socialsDisplay = ref('block');
const authStore = useUserStore();

// State variables for toggling contact and socials

// State variables for toggling contact and socials
const isContactHidden = ref<boolean>(false);
const isSocialsHidden = ref<boolean>(false);
const isLoading = ref<boolean>(false);
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

const toggleContact = () => {
  if (isContactHidden.value) {
    isContactHidden.value = false;
    contactDisplay.value = 'block';
  } else {
    isContactHidden.value = true;
    setTimeout(() => {
      contactDisplay.value = 'none';
    }, 300);
  }
};


const toggleSocials = () => {
  if (isSocialsHidden.value) {
    isSocialsHidden.value = false;
    socialsDisplay.value = 'block';
  } else {
    isSocialsHidden.value = true;
    setTimeout(() => {
      socialsDisplay.value = 'none';
    }, 300);
  }
};

const contInfo = ref(['contact@baderidris.com', '+970595744368']);
const showIcon = ref<boolean[]>([false, false]);
const firstContact = computed(() => contInfo.value[0] || '');
const secondContact = computed(() => contInfo.value[1] || '');

// Function to open mail client with email address
const openMailTo = (index: number): void => {
  if (import.meta.client) {
    const email = contInfo.value[index]
    if (email) {
      window.location.href = `mailto:${email}`
    } else {
      console.error('Email not found at the specified index')
    }
  }
}

// Form and messaging state
const name = ref<string>('')
const email = ref<string>('')
const message = ref<string>('')
const date = ref<Date>(new Date())
const formattedDate = ref<string>(formatDate(date.value))
const isSubmitted = ref<boolean>(false)

// Function to copy contact info to clipboard securely
const copyToClipboard = async (index: number): Promise<void> => {
  if (import.meta.client) {
    try {
      await navigator.clipboard.writeText(contInfo.value[index])

      // Show icon for 1 second
      showIcon.value = showIcon.value.map((value, i) => (i === index ? true : value))
      setTimeout(() => {
        showIcon.value = showIcon.value.map((value, i) => (i === index ? false : value))
      }, 1000)
    } catch (error) {
      console.error('Failed to copy to clipboard: ', error)
    }
  }
}
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

<style lang="scss" scoped>
.about-me {
  @include mainMiddleSettings;

  @media (max-width: 768px) {
    @include phone-borders;
    overflow-y: scroll !important;
  }

  aside {
    .personal-contact {
      position: relative;
      margin-left: 15px;

      &.hidden {
        opacity: 0;
        visibility: hidden;
        transition:
          opacity 0.5s ease,
          visibility 0.5s ease;
      }

      p {
        margin: 10px;
        cursor: pointer;
        width: fit-content;

        &::before {
          margin-right: 10px;
          font-family: 'secret sauce';
          display: inline-block;
        }

        &:first-of-type::before {
          content: '\f0e0';
        }

        &:last-of-type::before {
          content: '\f095';
          transform: rotate(90deg);
        }

        &:hover {
          color: $secondary4;
          cursor: pointer;
        }
      }
    }

    .personal-socials {
      margin-left: 15px;

      &.hidden {
        opacity: 0;
        visibility: hidden;
        transition:
          opacity 0.5s ease,
          visibility 0.5s ease;
      }

      ul>li {
        width: fit-content;
        cursor: pointer;
        margin: 10px 0;
        padding: 0 10px;

        &::before {
          content: '\f35d';
          margin-right: 10px;
          font-family: 'secret sauce';
        }

        &:hover {
          color: $secondary4;
        }

        a {
          color: $secondary1;

          &:hover {
            color: $secondary4;
          }
        }
      }
    }
  }

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
}

i {
  font-family: 'secret sauce';
  font-style: normal;
}
</style>
