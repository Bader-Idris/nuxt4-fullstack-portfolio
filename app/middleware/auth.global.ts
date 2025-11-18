import { useUserStore } from '~/stores/useUserSocket';

export default defineNuxtRouteMiddleware((to) => {
  // TODO: this defineNuxtRouteMiddleware() Fn is the recommended way, but we have to add jwt and cookie&&localStorage to it before applying it
  // ! this file is ignored in .nuxtignore for now until we finish implementing it properly
  // The user store should be initialized by our plugins before this middleware runs.
  const userStore = useUserStore();
  const localePath = useLocalePath();

  // Define protected routes that require authentication.
  const protectedRoutes = ['/dashboard', '/contact/admin'];

  // Check if the route the user is navigating to is a protected route.
  const isNavigatingToProtectedRoute = protectedRoutes.some(route => to.path.includes(route));

  // Rule 1: If the user is not authenticated and tries to access a protected route, redirect to login.
  if (!userStore.isAuthenticated && isNavigatingToProtectedRoute) {
    // Using replace: true prevents the back button from returning to the unauthorized page.
    return navigateTo(localePath('/login'), { replace: true });
  }

  // Rule 2: If the user is authenticated and tries to access the login page, redirect to the dashboard.
  // This prevents logged-in users from seeing the login page again.
  if (userStore.isAuthenticated && to.path.includes('/login')) {
    return navigateTo(localePath('/dashboard'), { replace: true });
  }

  // If none of the above rules match, allow navigation to proceed.
});
