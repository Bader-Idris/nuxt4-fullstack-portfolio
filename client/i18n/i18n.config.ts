// import { createI18n, I18nOptions } from '@nuxtjs/i18n'

// const i18nOptions: I18nOptions = {
//   locale: 'en', // Default language
//   fallbackLocale: 'en', // Fallback language
//   messages: {} // Load dynamically
// }

// const i18n = createI18n(i18nOptions)

// export const loadLocaleMessages = async (locale: string, path: string): Promise<void> => {
//   try {
//     const messages = await import(`./locales/${locale}/${path}.json`)
//     i18n.global.setLocaleMessage(locale, {
//       ...(i18n.global.getLocaleMessage(locale) || {}),
//       [path]: messages.default
//     })
//     i18n.global.locale = locale
//     document.documentElement.lang = locale
//   } catch (error) {
//     console.error(`Failed to load messages for locale: ${locale}, path: ${path}`, error)
//   }
// }

// export default i18n

// import { defineI18nConfig } from "@nuxtjs/i18n";

// export default defineI18nConfig(() => ({
//   legacy: false,
//   fallbackLocale: "en",
//   silentTranslationWarn: true,
//   missingWarn: false,
// }));

// ! ==================================================
// ! ==================================================

// ! ==================================================
// ! ==================================================

// import { createI18n } from "@nuxtjs/i18n";

// export default createI18n(() => ({
//   legacy: false,
//   fallbackLocale: "en",
//   silentTranslationWarn: true,
//   missingWarn: false,
// }));

export default {
  legacy: false,
  locale: 'en',
  messages: {
    // en: {
    //   welcome: "Welcome",
    // },
    // fr: {
    //   welcome: "Bienvenue",
    // },
  },
}
