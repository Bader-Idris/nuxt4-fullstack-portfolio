import { useUserStore } from "~/stores/UserNameStore";
const localePath = useLocalePath();
export default defineNuxtRouteMiddleware((to, from) => {
  // Get the auth store (assuming you're using Pinia for state management)
  const authStore = useUserStore();

  // Define the protected routes and their required roles
  const protectedRoutes = {
    "/dashboard": ["admin", "user"], // Only admin or user can access the dashboard
  };

  // Check if the target route is protected
  const requiredRoles = protectedRoutes[to.path];

  if (requiredRoles) {
    // If the user is not authenticated or doesn't have the required role, redirect to login
    if (!authStore.user || !requiredRoles.includes(authStore.user.role)) {
      return navigateTo(localePath("/login"));
    }
  }
});
