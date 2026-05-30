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
          <span class="greeting">{{ $t("home.greeting") }}</span>
          <!-- :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'" -->
          <h1 class="name">{{ $t("home.name") }}</h1>
          <p class="role">{{ $t("home.role") }}</p>
        </div>
        <div class="task">
          <p>{{ $t("home.task") }}</p>
          <p>{{ $t("home.github") }}</p>
        </div>
        <div class="github-repo">
          <p>{{ $t("home.pageMobile") }}</p>
          <span>const</span> <span>githubLink</span> <em>= </em>
          <CustomLink
            aria-label="go to my github page"
            :to="localePath('https://github.com/bader-idris')"
            class="external-link"
          >
            {{ $t("home.profile") }}
          </CustomLink>
        </div>
      </section>
      <aside>
        <GameContainer />
      </aside>
    </div>

    <!-- Draggable Mobile Game Drawer -->
    <!-- we have to not fix the whole box for mobile, only the .game-screen with internal parts, meaning, the game without wide boilerplate, without ruiniing the pc expereience -->
    <!-- <div
      v-if="isMobile"
      class="mobile-game-drawer"
      :style="{ height: drawerHeight + 'px' }"
      :class="{ 'is-dragging': isDragging, 'is-active': drawerHeight > 40 }"
    >
      <div
        class="drag-handle"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @click="toggleDrawer"
      >
        <span class="handle-line" />
        <span class="handle-text">
          {{ drawerHeight > 100 ? $t("home.slideDownToClose") : $t("home.pullUpToPlay") }}
        </span>
      </div>
      <div v-if="drawerHeight > 100" class="drawer-content">
        <GameContainer />
      </div>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import { SplitText } from "gsap/all";

const { t, locale } = useI18n();
const localePath = useLocalePath();
const isMobile = useMobile();

// Draggable Mobile Game Drawer State
const drawerHeight = ref(40);
const maxDrawerHeight = 520;
const minDrawerHeight = 40;
const startTouchY = ref(0);
const startHeight = ref(0);
const isDragging = ref(false);
const hasMoved = ref(false);

const onTouchStart = (e: TouchEvent) => {
  startTouchY.value = e.touches[0].clientY;
  startHeight.value = drawerHeight.value;
  isDragging.value = true;
  hasMoved.value = false;
};

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return;
  const deltaY = startTouchY.value - e.touches[0].clientY; // Positive means drag UP
  if (Math.abs(deltaY) > 5) {
    hasMoved.value = true;
  }
  const newHeight = startHeight.value + deltaY;
  drawerHeight.value = Math.max(minDrawerHeight, Math.min(newHeight, maxDrawerHeight));
};

const onTouchEnd = () => {
  isDragging.value = false;
  if (hasMoved.value) {
    // Snap behavior: snap fully open if dragged > 180px, otherwise snap closed
    if (drawerHeight.value > 180) {
      drawerHeight.value = maxDrawerHeight;
    } else {
      drawerHeight.value = minDrawerHeight;
    }
  }
};

const toggleDrawer = () => {
  if (hasMoved.value) return; // Ignore click if dragging occurred
  if (drawerHeight.value > minDrawerHeight) {
    drawerHeight.value = minDrawerHeight;
  } else {
    drawerHeight.value = maxDrawerHeight;
  }
};
// const img = useImage()

const windowWidth = ref(500);
const windowHeight = ref(500);
// const riveSource = 'assets/lottieToRive.riv'
// const riveSource = '/lottieToRive.riv' // Note the leading slash

// Function to set the dir attribute for child elements
const setInfoDirection = () => {
  const infoEl = document.querySelector(".info") as HTMLElement | null;

  if (infoEl) {
    const children = infoEl.children; // Get all children of .info

    // Loop through each child element and set the dir attribute
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement; // Type assertion to HTMLElement

      // Set the dir attribute based on the current locale
      if (locale.value === "ar") {
        child.setAttribute("dir", "rtl");
      } else {
        child.setAttribute("dir", "ltr");
      }
    }
  }
};

watch(locale, () => {
  setInfoDirection();
});

onMounted(async () => {
  if (import.meta.client) {
    windowWidth.value = window.innerWidth;
    windowHeight.value = window.innerHeight;

    await document.fonts.ready;
    await nextTick();
    
    // Ensure direction is set before splitting text
    setInfoDirection();

    // Small delay to ensure Nuxt hydration is fully settled
    setTimeout(() => {
      gsap.registerPlugin(SplitText);
      
      const mm = gsap.matchMedia();

      mm.add({
        isDesktop: "(min-width: 768px)",
        isMobile: "(max-width: 767px)"
      }, (context) => {
        const { isDesktop } = context.conditions!;

        // 1. Split the text first while elements are still hidden by CSS
        const splitGreeting = SplitText.create(".info .greeting", { type: "words" });
        const splitName = SplitText.create(".info .name", { type: "lines,words" });
        const splitRole = SplitText.create(".info .role", { type: "lines,words" });

        // 2. Force parent containers to be visible and opaque.
        // The children (lines/words) will be hidden by the 'from' part of fromTo.
        const containers = [".info > *", ".task > p", ".github-repo"];
        gsap.set(containers, { visibility: "visible", autoAlpha: 1 });

        const tl = gsap.timeline({
          delay: 0.1,
          defaults: { ease: "power3.out" }
        });

        // 3. Greeting Loop (independent)
        // Ensure greeting words are initially hidden before their loop starts
        gsap.set(splitGreeting.words, { autoAlpha: 0 });
        gsap.to(splitGreeting.words, {
          yPercent: "random([-50, 50])",
          rotation: "random(-30, 30)",
          repeat: -1,
          yoyo: true,
          autoAlpha: 1,
          stagger: 0.05,
          delay: 0.6,
          ease: "sine.inOut",
        });

        // 4. Main Entrance Timeline
        tl.fromTo(splitName.lines, 
          { rotationX: 100, transformOrigin: "-50% -50% -160px", autoAlpha: 0 },
          { rotationX: 0, autoAlpha: 1, duration: 0.8, stagger: 0.25 },
          "start"
        )
        .fromTo(splitRole.lines,
          { rotationX: -100, transformOrigin: "50% 50% -160px", autoAlpha: 0 },
          { rotationX: 0, autoAlpha: 1, duration: 1, stagger: 0.25 },
          "start+=0.4"
        );

        if (isDesktop) {
          tl.fromTo([".task > p:first-of-type", ".task > p:nth-of-type(2)", ".github-repo"],
            { rotationX: -100, transformOrigin: "50% 50% -160px", autoAlpha: 0 },
            { rotationX: 0, autoAlpha: 1, duration: 1, stagger: 0.25 }
          );
        } else {
          tl.fromTo(".github-repo > *",
            { rotationX: -100, transformOrigin: "50% 50% -160px", autoAlpha: 0 },
            { rotationX: 0, autoAlpha: 1, duration: 1, stagger: 0.25 }
          );
        }
        
        return () => {
          splitGreeting.revert();
          splitName.revert();
          splitRole.revert();
        };
      });
    }, 100);
  }
});

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

const thumbnailEn = `${useRuntimeConfig().public.originUrl}/thumbnail.webp`;
const thumbnailEs = `${useRuntimeConfig().public.originUrl}/thumbnail-es.webp`;
const thumbnailAr = `${useRuntimeConfig().public.originUrl}/thumbnail-ar.webp`;

// Create a computed property to determine which thumbnail to use
const optimizedThumbnail = computed(() => {
  switch (locale.value) {
    case "es":
      return thumbnailEs;
    case "ar":
      return thumbnailAr;
    default:
      return thumbnailEn;
  }
});

useSeoMeta({
  title: t("home.title"),
  ogTitle: t("home.title"),
  description: t("home.description"),
  ogDescription: t("home.description"),
  ogUrl: useRuntimeConfig().public.originUrl,
  ogImage: optimizedThumbnail,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: t("home.title"),
  twitterDescription: t("home.description"),
  twitterImage: optimizedThumbnail,
  twitterSite: "@bader_idri8628",
  // fbAppId: 'YOUR_FACEBOOK_APP_ID', // Add your Facebook App ID here
  appleMobileWebAppStatusBarStyle: "black-translucent",
  articleAuthor: ["https://baderidris.com/contact"],
  viewport:
    "width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes",
  mobileWebAppCapable: "yes",
  themeColor: "#01080E",
  keywords:
    "Fullstack engineer, Portfolio, full-stack developer, backend developer, backend engineer, devOps engineer, Vue.js developer, Nuxt.js Developer, Express.js developer, GSAP developer, Three.js developer, beautiful snake game, Bader Idris portfolio",
});

useSchemaOrg([
  {
    "@type": "WebPage",
    name: t("home.title"),
    description: t("home.description"),
    dateModified: new Date().toISOString(),
  },
]);
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
          content: "";
          position: absolute;
          box-shadow: 0 0 120px 100px rgba(67, 217, 173, 0.4);
          top: 10%;
          left: 30%;
          width: 0;
          height: 0;
          transform: rotate(135deg);
          z-index: z("default");
        }

        &::after {
          content: "";
          width: 0;
          height: 0;
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
          .name {
            font-size: 35px;
            margin: 0;
            padding: 10px 0;
          }
        }

        .role {
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
          .greeting {
            font-size: $sub-headline-size * 0.8;
            letter-spacing: -1px;
            margin-left: 7px;
          }
        }

        @media screen and (max-width: 1024px) {
          .greeting {
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
          content: "“";
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
          content: "”";
          position: fixed;
        }

        & span:first-of-type {
          color: $secondary3;
        }

        & span:nth-of-type(2) {
          color: $accent2;
        }
      }

      .info > *,
      .task > p,
      .github-repo {
        visibility: hidden;
      }

      @include mobile {
        height: 80dvh;
        @include flex-container(column, nowrap, space-around, center);
      }

      @media screen and (max-height: 430px) {
        position: fixed;
        left: 10dvw;
      }
    }

    aside {
      @media screen and (max-height: 430px) {
        position: fixed;
        right: 10dvw;
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

    .mobile-game-drawer {
      display: none;

      @include mobile {
        display: flex;
        flex-direction: column;
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background: linear-gradient(180deg, rgba(2, 18, 27, 0.95) 0%, rgba(1, 8, 14, 0.98) 100%);
        backdrop-filter: blur(10px);
        border-top: 1px solid rgba(67, 217, 173, 0.2);
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
        z-index: 1000;
        transition: height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
        box-sizing: border-box;

        &.is-dragging {
          transition: none !important;
        }

        .drag-handle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 40px;
          cursor: grab;
          user-select: none;
          padding: 8px 0;
          width: 100%;
          box-sizing: border-box;

          &:active {
            cursor: grabbing;
          }

          .handle-line {
            width: 40px;
            height: 4px;
            background-color: rgba(67, 217, 173, 0.4);
            border-radius: 2px;
            margin-bottom: 6px;
          }

          .handle-text {
            font-size: 11px;
            color: $secondary1;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        }

        .drawer-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px;
          box-sizing: border-box;

          .game-container {
            transform: scale(0.65) !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 510px;
          }
        }
      }
    }
  }
}

html[lang="es-ES"] {
  .info {
    p {
      font-size: calc($sub-headline-size - 25%) !important;
    }
  }
}

html[lang="ar-PS"] {
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
