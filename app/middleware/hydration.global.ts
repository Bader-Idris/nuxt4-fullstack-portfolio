/**
 * HYDRATION & ROUTING MIDDLEWARE
 * Purpose: Ensures robust navigation across SSR and Desktop (Electron) platforms.
 */
export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  
  /**
   * 0. SSR GUARD
   * We skip this middleware if SSR is disabled (e.g. Electron, Capacitor, or NUXT_SSR=false).
   * This ensures that hydration-specific logic doesn't interfere with CSR-only builds.
   */
  if (!config.public.isSSR) {
    return
  }

  const nuxtApp = useNuxtApp()

  /**
   * 1. SSR HYDRATION GUARD
   * Standard Nuxt 3 pattern to avoid "Error preloading payload" and "routing paralysis".
   * We skip redirection logic during the initial client-side hydration phase 
   * if the page was already rendered by the server. 
   * In Electron/CSR, 'serverRendered' is false, so the guard correctly passes through.
   */
  if (
    import.meta.client &&
    nuxtApp.isHydrating &&
    nuxtApp.payload?.serverRendered
  ) {
    return
  }
})
