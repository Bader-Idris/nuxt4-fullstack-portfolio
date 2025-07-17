
// const { $i18n } = useNuxtApp();
// const loginPath = $i18n.localePath('/login');

export default defineNuxtRouteMiddleware((to, from) => {
  // Skip middleware on server during prerendering
  if (import.meta.server) {
    return;
  }

  const userStore = useUserStore();

  // Define the protected routes and their required roles
  const protectedRoutes = {
    "/dashboard": ["admin", "user"],
  };

  // Check if the target route is protected
  const path =
    to.path.split("/").slice(-1)[0] === "dashboard" ? "/dashboard" : to.path;
  const requiredRoles = protectedRoutes[path];

  if (requiredRoles) {
    // If the user is not authenticated or doesn't have the required role, redirect to login
    if (!userStore.user || !requiredRoles.includes(userStore.user.role)) {
      return navigateTo('/login');
    }
  }
});
