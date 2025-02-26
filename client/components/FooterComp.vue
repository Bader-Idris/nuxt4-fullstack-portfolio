<template>
  <footer>
    <div class="container">
      <p>find me in:</p>
      <div class="social">
        <div class="telegram">
          <CustomLink
            aria-label="go to my telegram profile"
            :to="telegramLink"
          >
            <Telegram
              class="svg"
              width="30px"
            />
          </CustomLink>
        </div>
        <div class="facebook">
          <CustomLink
            aria-label="go to my facebook page"
            :to="facebookLink"
          >
            <Fb class="svg" />
          </CustomLink>
        </div>
      </div>
      <div
        class="github"
        tabindex="0"
      >
        <p>@bader-idris</p>
        <CustomLink
          aria-label="go to my github profile"
          :to="githubLink"
        >
          <Github class="svg" />
        </CustomLink>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import Fb from '~/components/svg/socials/FbSvg.vue'
import Telegram from '~/components/svg/socials/TelegramSvg.vue'
import Github from '~/components/svg/socials/GithubSvg.vue'

import socialData from '~/apis/random-data.json'

const [{ socialLinks }] = socialData
// @ts-ignore
const [telegramLink, facebookLink, githubLink] = socialLinks.map(({ url }) => ref(url))
</script>

<style lang="scss" scoped>
// @use '~' as *;
// @use 'assets/scss/index.scss' as *;
.svg {
  fill: $secondary1;
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
      // margin-left: 20px;
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
        padding-top: 7px;
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
      padding-right: 15px;

      &:hover {
        background-color: $primary1-hovered;
      }

      p {
        user-select: none;
      }

      & > a {
        padding-top: 20px;
        padding-left: 10px;
      }

      @media (max-width: 768px) {
        & {
          width: 60px;
          border: none;
          padding-bottom: 10px;
          padding-left: 15px;
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
  }

  @media (max-width: 768px) {
    display: none;
  }
}
</style>
