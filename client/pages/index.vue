<template>
  <div class="home">
    <div class="container">
      <section>
        <div class="info">
          <span>{{ $t('home.greeting') }}</span>
          <h1>{{ $t('home.name') }}</h1>
          <p>{{ $t('home.role') }}</p>
        </div>
        <div class="task">
          <p>{{ $t('home.task') }}</p>
          <p>{{ $t('home.github') }}</p>
        </div>
        <div class="github-repo">
          <p>{{ $t('home.pageMobile') }}</p>
          <span>const</span> <span>githubLink</span> =
          <CustomLink
            aria-label="go to my github page"
            :to="localePath('https://github.com/bader-idris')"
            class="external-link"
          >
            {{ $t('home.profile') }}
          </CustomLink>
        </div>
      </section>
      <aside>
        <GameContainer />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
const img = useImage()
const { t } = useI18n()
const localePath = useLocalePath()

const optimizedThumbnail = img('/thumbnail.jpg', {
  width: 1200,
  height: 630,
  format: 'webp'
});

useSeoMeta({
  title: t('home.title'),
  ogTitle: t('home.title'),
  description: t('home.description'),
  ogDescription: t('home.description'),
  ogUrl: useRuntimeConfig().public.originUrl,
  ogSiteName: 'Bader Idris Portfolio',
  ogImage: optimizedThumbnail,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: t('home.title'),
  twitterDescription: t('home.description'),
  twitterImage: optimizedThumbnail,
  twitterSite: '@badr_idris_',
  // fbAppId: 'YOUR_FACEBOOK_APP_ID', // Add your Facebook App ID here
  appleMobileWebAppStatusBarStyle: 'black-translucent',
  articleAuthor: ['https://baderidris.com/contact'],
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes',
  mobileWebAppCapable: 'yes',
  themeColor: '#CCCCCC',
  keywords: "Fullstack engineer, Portfolio, full-stack developer, backend developer, backend engineer, devOps engineer, Vue.js developer, Nuxt.js Developer, Express.js developer, beautiful snake game, Bader Idris portfolio",
  // contentSecurityPolicy: "default-src 'self' https: ws: wss: blob: data: 'unsafe-inline'; img-src 'self' https://raw.githubusercontent.com data:; connect-src 'self' https://baderidris.com ws: wss:;",
})

</script>

<style lang="scss" scoped>
.home {
  overflow: visible !important;
  padding: 50px;
  @include mainMiddleSettings;

  @media (max-width: 768px) {
    @include phone-borders;
    overflow: visible !important;
    height: calc(100vh - 95px);
  }

  @media screen and (max-height: 668px) {
    padding: 15px;
    transition: cubic-bezier(0.445, 0.05, 0.55, 0.95);
  }

  .container {
    display: flex;
    height: 100%;
    align-items: center;
    background-color: inherit;
    margin-right: -1px;

    @media screen and (max-height: 668px) {
      z-index: 1;
      position: relative;
    }

    @media screen and (max-width: 768px) {
      width: 80%;
      margin: auto;
    }

    h1 {
      color: $secondary4;
      font-size: $headline-size;
      line-height: calc($headline-size / 2);
      padding: 10px 0;

      @media screen and (max-height: 668px) {
        font-size: calc($headline-size - 5px);
      }

      @media screen and (max-width: 425px) {
        font-size: $headline-size * 1.2 !important;
      }

      @media screen and (max-width: 768px) {
        font-size: $headline-size !important;
        line-height: 1.2;
        font-weight: normal;
        margin: 20px 0;

        &::before {
          content: '';
          position: absolute;
          box-shadow: 0 0 120px 100px rgba(67, 217, 173, 0.4);
          top: 10%;
          left: 30%;
          width: 0;
          height: 100px;
          transform: rotate(135deg);
          z-index: 1;
        }

        &::after {
          content: '';
          width: 0;
          height: 100px;
          position: absolute;
          top: 50%;
          left: 75%;
          box-shadow: 0 0 220px 120px rgba(77, 91, 206, 0.4); //40% of $gradients1
          transform: rotate(45deg);
          z-index: 1;
        }
      }

      @media screen and (max-width: 1024px) {
        font-size: calc($headline-size * 0.6);
      }
    }

    section {
      @media screen and (max-width: 320px) {
        margin-left: 25%;
      }

      > p {
        color: $secondary1;
      }

      @media screen and (max-height: 668px) {
        position: relative;
        transform: scale(0.9);
      }

      @media screen and (max-height: 430px) {
        position: relative;
        transform: scale(0.5);
      }

      @media screen and (min-width: 768px) {
        margin-right: 10%;
      }

      .info {
        @media screen and (max-height: 668px) {
          h1 {
            font-size: 35px;
            margin: 0;
            padding: 10px 0;
          }
        }

        & > p {
          color: $secondary3;
          font-size: $sub-headline-size;
          margin-bottom: 100px;

          @media (max-width: 768px) {
            margin-bottom: 10px;
            font-size: $body-text-size * 1.5;
            margin-top: 0;
            font-weight: bold;
            letter-spacing: -1px;
          }

          @media (max-width: 1024px) {
            font-size: $body-text-size;
          }

          @media screen and (max-height: 668px) {
            font-size: calc($body-text-size * 0.8);
            margin-bottom: 60px;
            margin-bottom: 0;
          }
        }

        @media (max-width: 768px) {
          span:first-of-type {
            font-size: $sub-headline-size * 0.8;
            letter-spacing: -1px;
            margin-left: 7px;
          }
        }

        @media screen and (max-width: 1024px) {
          span:first-of-type {
            font-size: $sub-headline-size * 0.7;
          }
        }
      }

      .task {
        & > p {
          font-size: $body-text-size;
        }

        & > p {
          color: $secondary1;
          // margin-bottom: 100px;
        }

        @media (max-width: 768px) {
          display: none;
        }
      }

      .github-repo {
        p {
          color: $secondary1;
          line-height: 1.7;
          width: 300px;
          letter-spacing: -0.7px;

          @media (max-width: 768px) {
            font-size: 18px;
          }

          @media (min-width: 769px) {
            display: none;
          }

          @media (max-width: 340px) {
            font-size: 16px;
          }
        }

        @media (max-width: 768px) {
          font-size: $sub-headline-size * 0.6;
        }

        & > a {
          left: 10px;
          position: relative;
          color: $accent1;
          width: calc(100% - 20px);

          @media (max-width: 330px) {
            font-size: 14px;
          }

          @media screen and (max-width: 768px) {
            display: block;
            margin-top: 5px;
          }

          @media screen and (min-width: 768px) {
            margin-top: 10px;
          }
        }

        & > a::before {
          content: '“';
          position: absolute;
          width: 100%;
          height: 100%;

          @media screen and (max-width: 768px) {
            bottom: -20px;
            left: -10.5em;
          }

          @media screen and (min-width: 768px) {
            & {
              top: 0;
              left: -10px;
            }
          }
        }

        & > a::after {
          content: '”';
          position: fixed;
        }

        & span:first-of-type {
          color: $secondary3;
        }

        // here
        & span:nth-of-type(2) {
          color: $accent2;
        }
      }

      @media (max-width: 768px) {
        display: flex;
        flex-direction: column;
        height: 80vh;
        align-items: center;
        justify-content: space-around;
      }

      @media screen and (max-height: 430px) {
        position: fixed;
        left: 10vw;
      }
    }

    aside {
      @media screen and (max-height: 430px) {
        position: fixed;
        right: 10vw;
      }

      @media screen and (max-height: 500px) {
        height: calc(100vh - 30px);
        margin-top: -40px;
      }
    }

    @media (max-width: 768px) {
      flex-direction: column;

      > aside {
        display: none;
      }

      & h1 {
      }
    }

    @media (min-width: 769px) {
      width: 100% !important;
      justify-content: center;
    }
  }
}
</style>
