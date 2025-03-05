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
      <div :style="{ display: socialsDisplay }" 
        class="personal-socials"
        :class="{ hidden: isSocialsHidden }">
        <ul>
          <li>
            <CustomLink aria-label="go to my css battle page"
              to="https://cssbattle.dev/player/bader_idris"
              class="external-link">Css Battle
            </CustomLink>
          </li>
          <!-- <li>
            <CustomLink
              aria-label="go to my youtube channel"
              to="/not-created-yet">YouTube Channel
            </CustomLink>
          </li> -->
          <li>
            <CustomLink aria-label="go to my front end mentor profile"
              to="https://www.frontendmentor.io/profile/Bader-Idris"
              class="external-link">Front End Mentor</CustomLink>
          </li>
          <li>
            <CustomLink aria-label="go to my exercism profile"
              to="https://exercism.org/profiles/Bader-Idris"
              class="external-link">Exercism</CustomLink>
          </li>
          <li>
            <CustomLink aria-label="go to my code wars profile"
              to="https://www.codewars.com/users/Bader-Idris"
              class="external-link">CodeWar</CustomLink>
          </li>
        </ul>
      </div>
    </aside>
    <ClientOnly>
      <section v-if="authStore.user?.role === 'admin'"
        class="received-to-admin">
        <CustomButtons button-type="ghost">
          <CustomLink :to="localePath('/contact/admin')">fetch-messages</CustomLink>
        </CustomButtons>
      </section>
      <span v-else />
      <NuxtPage />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// import { useClipboard } from '@vueuse/core';
import { useUserStore } from '~/stores/UserNameStore';
const localePath = useLocalePath()
const { t } = useI18n()

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

const contactDisplay = ref('block');
const socialsDisplay = ref('block');
const authStore = useUserStore();

// State variables for toggling contact and socials
const isContactHidden = ref<boolean>(false);
const isSocialsHidden = ref<boolean>(false);

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

}

i {
  font-family: 'secret sauce';
  font-style: normal;
}
</style>
