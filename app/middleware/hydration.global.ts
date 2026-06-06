import { withTrailingSlash, withoutTrailingSlash } from 'ufo'

/**
 * HYDRATION & ROUTING MIDDLEWARE
 * Purpose: Ensures robust navigation across SSR and Desktop (Electron) platforms.
 */
export default defineNuxtRouteMiddleware((to) => {
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

  const localePath = useLocalePath()
  
  /**
   * 2. IDENTIFY TARGET PATHS
   * We use 'localePath' to stay i18n-compliant across all locales.
   */
  const blogPath = localePath('/blog')
  const currentPath = to.path
  
  /**
   * 3. TRAILING SLASH ENFORCEMENT
   * Standardizes '/blog' -> '/blog/' to prevent hydration mismatches and SEO issues.
   * Functional in:
   * - SSR: Triggers a 301 redirect.
   * - Electron: Correctly handles hash-based routing (e.g., #/blog -> #/blog/).
   */
  const targetPathBase = withoutTrailingSlash(blogPath)
  
  if (currentPath === targetPathBase && !currentPath.endsWith('/')) {
    return navigateTo(withTrailingSlash(blogPath), { 
      replace: true,
      redirectCode: 301 // Permanent redirect for SSR/SEO
    })
  }
})
