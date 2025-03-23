<template>
  <footer>
    <div class="container">
      <p>find me in:</p>
      <div class="social">
        <div class="telegram">
          <CustomLink 
            aria-label="go to my telegram profile" 
            class="link"
            :to="telegramLink"
          >
            <Icon 
              name="ic:baseline-telegram" 
              width="30" 
              height="30" 
              mode="svg"
              class="svg" />
          </CustomLink>
        </div>
        <div class="facebook">
          <CustomLink 
            aria-label="go to my facebook page" 
            class="link"
            :to="facebookLink"
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

const [{ socialLinks }] = socialData
// @ts-ignore
const [telegramLink, facebookLink, githubLink] = socialLinks.map(({ url }) => url)

// Handle client-side navigation
const navigateToGithub = () => {
  if (import.meta.client) { // Ensure this runs only on the client side
    window.open(githubLink, '_blank') // Opens in a new tab
  }
}
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
      display: flex;
      align-items: center;

      & > * {
        width: 60px;
        height: 60px;
        position: relative;
        text-align: center;
        border: 1px solid $lines;

        &:hover {
          background-color: $primary1-hovered;
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
      display: flex;
      justify-content: flex-end;
      border-left: solid 1px $lines;
      color: $secondary1;
      padding-right: 10px;
      align-items: center;
      height: 60px;
      @media (max-width: 768px) {
        justify-content: center;
      }

      &:hover {
        background-color: $primary1-hovered;
      }

      p {
        user-select: none;
        margin-left: 5px;
        padding-right: 5px;
      }

      > a {
        margin-top: 5px;
      }

      @media (max-width: 768px) {
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

    @media (max-width: 768px) {
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

  @media (max-width: 768px) {
    display: none;
  }
}
</style>
