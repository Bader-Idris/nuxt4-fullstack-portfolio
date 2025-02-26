// export default defineNuxtRouteMiddleware(
//   (to, from) => {
//     const isAuthenticated = false; // Replace with your auth logic

//     if (!isAuthenticated) {
//       return navigateTo("/"); // Redirect to home if not authenticated
//     }
//   }
// );

export default defineEventHandler((event) => {
  event.context.auth = { user: 123 }
})
