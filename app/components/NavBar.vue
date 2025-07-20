<template>
  <header>
    <div class="container">
      <div class="name"  @click="handleTripleClick">
        {{ t('home.name2') }}
      </div>
      <nav class="nav">
        <CustomLink
          :to="localePath('/')"
          class="sub-navs"
          :class="{ active: $route.path === localePath('/') }"
        >
          {{ t('home.hello') }}
        </CustomLink>
        <CustomLink
          :to="localePath('/about')"
          class="sub-navs"
          :class="{ active: $route.path.startsWith(localePath('/about')) }"
        >
          {{ t('home.about') }}
        </CustomLink>
        <CustomLink
          :to="localePath('/projects')"
          class="sub-navs"
          :class="{ active: $route.path.startsWith(localePath('/projects')) }"
        >
          {{ t('home.projects') }}
        </CustomLink>
      </nav>
      <!-- <ThemeMode /> -->
      <LanguageSwitcher />
      <CustomLink
        :to="localePath('/contact')"
        class="contact sub-navs"
        :class="{ active: $route.path.startsWith(localePath('/contact')) }"
      >
        {{ t('home.contact') }}
      </CustomLink>
    </div>
    <div
      v-if="showBurgerNav"
      class="burger-nav"
      @click="togglePhoneMenu"
    >
      <span
        v-for="i in 3"
        :key="i"
      />
    </div>
    <div
      v-show="showPhoneMenu"
      class="phone-menu"
    >
      <Icon name="hugeicons:cancel-02" width="40" class="remove-phone-menu" @click="togglePhoneMenu" />
      <div class="phone-body">
        <div class="name">
          {{ t('home.name2') }}
        </div>
        <ul>
          <CustomLink
            :to="localePath('/')"
            class="phone-sub-navs"
            :class="{ active: $route.path === localePath('/') }"
            @click="togglePhoneMenu"
          >
            {{ t('home.hello') }}
          </CustomLink>
          <CustomLink
            :to="localePath('/about')"
            class="phone-sub-navs"
            :class="{ active: $route.path.startsWith(localePath('/about')) }"
            @click="togglePhoneMenu"
          >
            {{ t('home.about') }}
          </CustomLink>
          <CustomLink
            :to="localePath('/projects')"
            class="phone-sub-navs"
            :class="{ active: $route.path.startsWith(localePath('/projects')) }"
            @click="togglePhoneMenu"
          >
            {{ t('home.projects') }}
          </CustomLink>
          <CustomLink
            :to="localePath('/contact')"
            class="contact-phone phone-sub-navs"
            :class="{ active: $route.path.startsWith(localePath('/contact')) }"
            @click="togglePhoneMenu"
          >
            {{ t('home.contact') }}
          </CustomLink>
        </ul>
      </div>
      <FooterComp style="display: block; bottom: 0" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { debounce } from 'lodash-es'
import { useTimeoutFn } from '@vueuse/core';
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
const localePath = useLocalePath()
const route = useRoute()
const count = ref(0);
const { start, stop } = useTimeoutFn(() => {
  count.value = 0;
}, 5000);

const showBurgerNav = ref(false)
const showPhoneMenu = ref(false)
const currentPath = ref('')

const handleResize = debounce(() => {
  showBurgerNav.value = window.outerWidth <= 768
}, 300) // Debounce with 300ms delay

const togglePhoneMenu = () => {
  const menu = document.querySelector('.phone-menu') // Select the menu
  if (showPhoneMenu.value) {
    // If menu is currently open, close it
    menu?.classList.remove('open')
    showPhoneMenu.value = false
  }
  else {
    // If menu is closed, store the current path and open it
    menu?.classList.add('open')
    currentPath.value = route.fullPath
    showPhoneMenu.value = true
  }
}

const handleTripleClick = () => {
  count.value++;

  // Reset and restart the 5-second timeout on each click
  stop();
  start();

  if (count.value === 5) {
    navigateTo(localePath('/register'));
    count.value = 0; // Reset counter immediately after triggering
    stop();
  }
};

onMounted(() => {
  // Set initial value for showBurgerNav
  showBurgerNav.value = window.outerWidth <= 768

  // Set up resize event listener
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (import.meta.client) stop();
})
</script>

<style lang="scss">
.sub-navs {
  //! TODO: Add hover effect
  padding: 21px 30px;
  cursor: pointer;
  color: $secondary1;
  text-decoration: none;
  position: relative;

  &.active::before {
    content: '';
    width: 100%;
    height: 100%;
    position: absolute;
    top: -3px;
    left: 0;
    border-bottom: 3px solid $accent1;
  }

  &:hover {
    background-color: $primary1-hovered;
  }

  &.active {
    color: $secondary4;
  }

  &::after {
    content: '';
    border-color: $lines;
    border-width: 1px;
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  &:not(.contact)::after {
    border-style: hidden solid hidden solid;
  }

  &.contact::after {
    border-style: hidden hidden hidden solid;
  }
}

header {
  position: relative;
  height: 60px;
  font-family: $main-font;
  background-color: $primary2;
  color: $secondary1;
  width: 100%;
  border: 1px solid $lines;
  border-width: 1px 1px 0 1px;
  border-radius: 5px 5px 0 0;

  > .container {
    color: inherit;
    background-color: inherit;
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    align-content: center;
    flex-wrap: wrap;
    padding: 0 20px;

    & > .name {
      position: relative;
      padding: 15px 0;
      line-height: 1.7;

      @include mobile {
        &::after {
          content: '';
          position: absolute;
          width: calc(100vw - 32px);
          height: 100%;
          left: -20px;
          top: 2px;
          border-bottom: 1px solid $lines;

          box-shadow: 0 2px 20px 0 #0000008a;
          z-index: 1;
        }
      }

      @include tablet-to-up {
        flex-basis: 280px;
      }
    }

    .nav {
      display: flex;
      flex-basis: 420px;

      // & >
    }

    .contact {
      // align-self: flex-end;
      cursor: pointer;
      z-index: 1;
      position: absolute;
      right: 0;
    }

    @include mobile {
      .nav,
      .contact {
        display: none;
      }
    }
  }

  @include mobile {
    .burger-nav {
      z-index: 2;
      width: 40px;
      height: 40px;
      position: absolute;
      top: 12px;
      right: 10px;
      padding: 10px;

      span {
        position: relative;
        display: block;
        width: 100%;
        height: 2px;
        background-color: $secondary1;
        border-radius: 1px;
        margin-bottom: 4px;
      }
    }

    .phone-menu {
      font-family: $main-font;
      width: 100%;
      height: calc(100vh - 30px);
      background-color: $primary2;
      z-index: 999;
      position: relative;
      top: -58px;
      border-radius: 5px;
      transition:
        transform 0.3s ease-in-out,
        opacity 0.3s ease-in-out;
      /* Add transitions */
      transform: translateY(-100%);
      /* Default hidden state */
      opacity: 0;
      /* Default hidden state */

      &.open {
        transform: translateY(0);
        /* Fully visible */
        opacity: 1;
        /* Fully visible */
      }

      &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100vh;
        background-color: $primary1;
        left: -15px;
        top: -15px;
        z-index: -1;
      }

      .remove-phone-menu {
        z-index: 2;
        top: 15px;
        right: 15px;
        position: absolute;
        width: 30px;
        height: 30px;
        padding: 10px;
      }

      @include mobile {
        .phone-body {
          border-radius: 5px 5px 0 0;
          height: calc(100vh - 88px);
          align-content: flex-start;
          @include mainMiddleSettings;

          .name {
            padding: 20px;
            border-bottom: 1px solid $lines;
          }

          .phone-sub-navs {
            padding: 15px 20px;
            cursor: pointer;
            color: $secondary1;
            text-decoration: none;
            display: block;
            text-align: center;

            &.active {
              color: $secondary4;
            }

            @include tablet-to-up {
              &:hover {
                background-color: $primary1-hovered;
              }
            }

            .contact {
              left: 0;
              position: relative;
            }
          }

          > ul {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            position: relative;

            & > a {
              &::before {
                content: '';
                position: absolute;
                border-bottom: 1px solid $lines;
                width: calc(100vw - 33px);
                left: 0;
                height: 0px;
                padding: 17px 0;
              }
            }
          }
        }
      }
    }
  }
}
</style>
