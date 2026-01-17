<template>
  <footer itemscope itemtype="http://schema.org/WPFooter">
    <div class="container">
      <p>find me in:</p>
      <div class="social" itemprop="contactPoint" itemscope itemtype="http://schema.org/ContactPoint">
        <div
          class="telegram"
          @click="navigateToChild(telegramLink)">
          <CustomLink
            aria-label="go to my telegram profile"
            class="link external-link"
            :to="telegramLink"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon
              name="ic:baseline-telegram"
              width="30"
              height="30"
              mode="svg"
              class="svg" />
          </CustomLink>
        </div>
        <div
          class="facebook"
          @click="navigateToChild(facebookLink)">
          <CustomLink
            aria-label="go to my facebook page"
            class="link external-link"
            :to="facebookLink"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon
              name="basil:facebook-solid"
              width="30"
              height="30"
              mode="svg"
              class="svg" />
          </CustomLink>
        </div>
      </div>
      <div
        class="github"
        tabindex="0"
        @click="navigateToGithub">
        <p>@bader-idris</p>
        <CustomLink
          aria-label="go to my github profile"
          :to="githubLink"
          class="external-link"
          rel="noopener noreferrer"
          target="_blank"
        >
          <Icon
          name="mdi:github"
          width="30"
          height="30"
          mode="svg"
            class="svg" />
        </CustomLink>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import socialData from '~/apis/random-data.json'
import { definePerson } from "nuxt-schema-org/schema"

const [{ socialLinks }] = socialData
// @ts-expect-error: socialLinks is not properly typed
const [telegramLink, facebookLink, githubLink] = socialLinks.map(({ url }) => url)

// Handle client-side navigation
const navigateToGithub = () => {
  if (import.meta.client) { // Ensure this runs only on the client side
    window.open(githubLink, '_blank', 'noopener,noreferrer') // Opens in a new tab with security attributes
  }
}
const navigateToChild = (child : string) => {
  if (import.meta.client) { // Ensure this runs only on the client side
    window.open(child, '_blank', 'noopener,noreferrer') // Opens in a new tab with security attributes
  }
}

// Add structured data for social profiles using Nuxt SEO
definePerson({
  name: 'Bader Idris',
  sameAs: [
    githubLink,
    telegramLink,
    facebookLink
  ]
})
</script>

<style lang="scss" scoped>
.svg {
  color: $secondary1;
}

footer {
  position: relative;
  font-family: $main-font;
  height: 60px;
  background-color: $primary2;
  border: 1px solid $lines;
  border-radius: 0 0 5px 5px;

  & .container {
    display: flex;
    background-color: inherit;
    height: 100%;
    line-height: 1.6;
    width: 100%;

    > p:first-of-type {
      margin-left: 20px;
      margin-right: 20px;
      color: $secondary1;
      user-select: none;
    }

    .social {
      @include flex-container(row, unset, unset, center);

      & > * {
        width: 60px;
        height: 60px;
        position: relative;
        text-align: center;
        border: 1px solid $lines;

        &:hover {
          background-color: $primary1-hovered;
          svg {
            color: $light-primary3;
          }
        }
      }

      .telegram {
        text-align: center;
        padding-top: 15px;
      }

      .facebook {
        padding-top: 15px;
      }
    }

    .github {
      cursor: pointer;
      position: absolute;
      right: 00px;
      width: 170px;
      @include flex-container(row, unset, flex-end, center);
      border-left: solid 1px $lines;
      color: $secondary1;
      padding-right: 10px;
      height: 60px;
      @include mobile {
        justify-content: center;
      }

      &:hover {
        background-color: $primary1-hovered;
        > p {
          color: $light-primary3;
        }
        svg {
          color: $light-primary3;
        }
      }

      p {
        user-select: none;
        margin-left: 5px;
        padding-right: 5px;
      }

      > a {
        margin-top: 5px;
      }

      @include mobile {
        & {
          width: 60px;
          border: none;
          padding-left: 25px;
        }

        p {
          display: none;
        }
      }
    }

    @include mobile {
      & {
        width: calc(100% - 60px);
        justify-content: flex-end;

        p {
          flex: 1;
        }

        .github {
          margin-right: 5px;
        }
      }
    }
    .link {
      position: relative;
      padding: 15px 10px;
    }
  }

  @include mobile {
    display: none;
  }
}
</style>
