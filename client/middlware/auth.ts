// import { useUserStore } from "~/stores/UserNameStore";
// import { useLocalePath } from "#imports"; // Import useLocalePath for localized paths

// export default defineNuxtRouteMiddleware(
//   (to, from) => {
//     const userStore = useUserStore(); // Use your user store
//     const localePath = useLocalePath();

//     // Check if the user is logged in using the isLoggedIn getter
//     if (!userStore.isLoggedIn) {
//       // Redirect to the login page if not authenticated
//       return navigateTo(localePath("/login"));
//     }

//     // Check if the route requires admin access
//     if (
//       to.meta.requiresAdmin &&
//       userStore.user?.role !== "admin"
//     ) {
//       // Redirect to the login page if the user is not an admin
//       return navigateTo(localePath("/login"));
//     }

//     // If everything is fine, continue to the route
//     return undefined; // Explicitly return undefined to satisfy TypeScript
//   }
// );
