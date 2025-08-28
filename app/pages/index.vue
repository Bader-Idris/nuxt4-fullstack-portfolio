<template>
  <div class="home">
    <!-- <RiveAnimation 
      src="/lottieToRive.riv"
      :width="windowWidth"
      :height="windowHeight"
      state-machines="bumpy"
    /> -->
    <div class="container">
      <section>
        <div class="info">
          <span class="greeting" >{{ $t('home.greeting') }}</span>
          <!-- :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'" -->
          <h1 class="name">{{ $t('home.name') }}</h1>
          <p class="role">{{ $t('home.role') }}</p>
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
import { SplitText } from 'gsap/all';
const { t, locale } = useI18n()
const localePath = useLocalePath()
// const img = useImage()

const windowWidth = ref(500)
const windowHeight = ref(500)
// const riveSource = 'assets/lottieToRive.riv'
// const riveSource = '/lottieToRive.riv' // Note the leading slash

// Function to set the dir attribute for child elements
const setInfoDirection = () => {
  const infoEl = document.querySelector('.info') as HTMLElement | null;

  if (infoEl) {
    const children = infoEl.children; // Get all children of .info

    // Loop through each child element and set the dir attribute
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement; // Type assertion to HTMLElement

      // Set the dir attribute based on the current locale
      if (locale.value === 'ar') {
        child.setAttribute('dir', 'rtl');
      } else {
        child.setAttribute('dir', 'ltr');
      }
    }
  }
};

watch(locale, () => {
  setInfoDirection();
});


onBeforeMount(() => {
  if (import.meta.client) {
    // Register SplitText plugin with GSAP
    // Check the docs: https://v-gsap-nuxt.vercel.app/information/gsap-plugins
    // how to use it after the fonts get loaded?
    useGSAP().registerPlugin(SplitText);
  }
})

onMounted( () => {
  if (import.meta.client) {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight

    const splitGreeting = SplitText.create(".info .greeting",
      {
        type: "words",
        // revertOnLoad: true
        // you can do this instead of separating them:
        // onSplit: (self) => {
        //   useGSAP().to(self.words, {/* settings */})
        // }
      });

    // const greetingEl = document.querySelector('.greeting') as HTMLElement | null
    setInfoDirection();

    // useGSAP().to(".info .greeting", {
    useGSAP().to(splitGreeting.words, {
      yPercent: "random([-50, 50])",
      rotation: "random(-30, 30)",
      repeat: -1,
      yoyo: true,
      autoAlpha: 1,
      stagger: 0.05,
      // stagger: {
      //   each: 0.05,
      //   from: 'start'
      // },
      delay: 0.6,
      ease: 'sine.inOut',
    })

    const splitName = SplitText.create(".info .name",
      {type: "lines,words",}
    );

    // check: https://gsap.com/docs/v3/GSAP/Timeline
    useGSAP().timeline()
      .from(splitName.lines, {
        rotationX: 100,
        transformOrigin: "-50% -50% -160px",
        opacity: 0,
        duration: 0.8,
        ease: "power3",
        stagger: 0.25,
        delay: 0.4
      })
      // .to(splitName.words, {
      //   yPercent: "random([-50, 50])",
      //   rotation: "random(-30, 30)",
      //   repeat: -1,
      //   yoyo: true,
      //   autoAlpha: 1,
      //   stagger: 0.05,
      //   // stagger: {
      //   //   each: 0.05,
      //   //   from: 'start'
      //   // },
      //   delay: 0.6,
      //   // repeat: -1
      //   ease: 'power1.in'
      // })

    const splitRole = SplitText.create(".info .role",
      {type: "lines,words",}
    );

    useGSAP().timeline()
      .from(splitRole.lines, {
        rotationX: -100,
        transformOrigin: "50% 50% -160px",
        opacity: 0,
        duration: 1,
        ease: "power3",
        stagger: 0.25,
        delay: 0.4
      })

    setInfoDirection();
  }
})

// TODO: the whole nuxt/image locally added package doesn't work!
// const nuxtImgOptions = {
//   format: 'webp',
//   width: 1200,
//   height: 630,
//   placeholder: [50, 50, 75, 75]
// }

// // Define thumbnails for each language
// const thumbnailEn = img('/thumbnail.webp', nuxtImgOptions)
// const thumbnailEs = img('/thumbnail-es.png', nuxtImgOptions)
// const thumbnailAr = img('/thumbnail-ar.png', nuxtImgOptions)

const thumbnailEn = `${useRuntimeConfig().public.originUrl}/thumbnail.webp`
const thumbnailEs = `${useRuntimeConfig().public.originUrl}/thumbnail-es.png`
const thumbnailAr = `${useRuntimeConfig().public.originUrl}/thumbnail-ar.png`

// Create a computed property to determine which thumbnail to use
const optimizedThumbnail = computed(() => {
  switch (locale.value) {
    case 'es':
      return thumbnailEs
    case 'ar':
      return thumbnailAr
    default:
      return thumbnailEn
  }
})

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

  @include mobile {
    @include phone-borders;
    overflow: visible !important;
    height: calc($full-viewport-height - 95px);
  }

  @media screen and (max-height: 668px) {
    padding: 15px;
    transition: cubic-bezier(0.445, 0.05, 0.55, 0.95);
  }

  .container {
    @include flex-container(row, nowrap, unset, center);
    height: 100%;
    background-color: inherit;
    margin-right: -1px;

    @media screen and (max-height: 668px) {
      z-index: z("default");
      position: relative;
    }

    @include mobile {
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

      @include mobile {
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
          z-index: z("default");
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
          z-index: z("default");
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

      @include tablet-to-up {
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

          @include mobile {
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

        @include mobile {
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
        }

        @include mobile {
          display: none;
        }
      }

      .github-repo {
        p {
          color: $secondary1;
          line-height: 1.7;
          width: 300px;
          letter-spacing: -0.7px;

          @include mobile {
            font-size: 18px;
          }

          @include tablet-to-up {
            display: none;
          }

          @media (max-width: 340px) {
            font-size: 16px;
          }
        }

        @include mobile {
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

          @include mobile {
            display: block;
            margin-top: 5px;
          }

          @include tablet-to-up {
            margin-top: 10px;
          }
        }

        & > a::before {
          content: '“';
          position: absolute;
          width: 100%;
          height: 100%;

          @include mobile {
            bottom: -20px;
            left: -10.5em;
          }

          @include tablet-to-up {
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

        & span:nth-of-type(2) {
          color: $accent2;
        }
      }

      @include mobile {
        height: 80vh;
        @include flex-container(column, nowrap, space-around, center);
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
        height: calc($full-viewport-height - 30px);
        margin-top: -40px;
      }
    }

    @include mobile {
      flex-direction: column;

      > aside {
        display: none;
      }
    }

    @include tablet-to-up {
      width: 100% !important;
      justify-content: center;
    }
  }
}

html[lang="es"] {
  .info {
    p {
      font-size: calc($sub-headline-size - 25%) !important;
    }
  }
}

html[lang="ar"] {
  .info {
    direction: rtl;
    .greeting {
      // add dir="rtl"
    }
    h1 {
      font-size: calc($headline-size - 80%) !important;
    }
  }
}

</style>
