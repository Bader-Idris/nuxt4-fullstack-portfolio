export default defineNuxtRouteMiddleware((to) => {
  // Skip during initial client hydration to avoid 
  // "Error preloading payload" and routing paralysis
  const nuxtApp = useNuxtApp();
  if (
    import.meta.client &&
    nuxtApp.isHydrating &&
    nuxtApp.payload.serverRendered
  ) {
    return;
  }

  const localePath = useLocalePath();
  const path = to.path;
  
  // Robust check for blog path to ensure trailing slash consistency if needed
  // or just to follow the user's "robust nav solution" pattern
  const blogBase = localePath('/blog').replace(/\/$/, "");
  
  // If the user specifically mentioned /blog vs /blog/ causing crashes,
  // we ensure that /blog always redirects to /blog/ (or vice versa depending on intent)
  // Based on the user hint, they seem to prefer /blog/
  if (path === blogBase) {
    return navigateTo(blogBase + '/', { replace: true });
  }
});
