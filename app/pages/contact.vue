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
            <Icon name="mdi:envelope" width="25" />
            {{ firstContact }}
            <Icon v-if="showIcon[0]" name="mdi:envelope" width="24" height="24" />
          </p>
          <p @click="copyToClipboard(1)">
            <Icon name="ic:baseline-phone" width="30" />
            {{ secondContact }}
            <Icon v-if="showIcon[1]" name="mingcute:copy-fill" width="24" height="24" />
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
              :to="localePath('https://cssbattle.dev/player/bader_idris')"
              class="external-link">
              <Icon name="grommet-icons:share" width="10" />
              Css Battle
            </CustomLink>
          </li>
          <!-- <li>
            <CustomLink
            aria-label="go to my youtube channel"
            :to="localePath('/not-created-yet')">
            <Icon name="grommet-icons:share" width="10" />
            YouTube Channel
            </CustomLink>
          </li> -->
          <li>
            <CustomLink
              aria-label="go to my front end mentor profile"
              :to="localePath('https://www.frontendmentor.io/profile/Bader-Idris')"
              class="external-link">
              <Icon name="grommet-icons:share" width="10" />
              Front End Mentor
            </CustomLink>
          </li>
          <li>
            <CustomLink
              aria-label="go to my exercism profile"
              :to="localePath('https://exercism.org/profiles/Bader-Idris')"
              class="external-link"
              >
              <Icon name="grommet-icons:share" width="10" />
              Exercism</CustomLink>
          </li>
          <li>
            <CustomLink
              aria-label="go to my code wars profile"
              :to="localePath('https://www.codewars.com/users/Bader-Idris')"
              class="external-link">
              <Icon name="grommet-icons:share" width="10" />
              CodeWar</CustomLink>
          </li>
        </ul>
      </div>
    </aside>
    <ClientOnly>
      <section 
        v-if="authStore.user?.role === 'admin'"
        class="received-to-admin">
        <CustomButton button-type="ghost">
          <CustomLink :to="localePath('/contact/admin')">fetch-messages</CustomLink>
        </CustomButton>
      </section>
      <span v-else />
      <NuxtPage />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// import { useClipboard } from '@vueuse/core';
// import { useUserStore } from '~/stores/UserNameStore';
import { useUserStore } from '~/stores/useUserSocket';
const localePath = useLocalePath()
// const { t } = useI18n()

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

  @include mobile {
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

        span {
          position: relative;
          top: 3px;
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

        span {
          top: 2px;
          position: relative;
        }

        &:hover {
          color: $secondary4;
        }

        a {
          @include transition-ease;
          color: $secondary1;

          &:hover {
            @include transition-ease;
            color: $secondary4;
          }
        }
      }
    }
  }

}
</style>
