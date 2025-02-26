// export default defineNuxtRouteMiddleware(
//   (to, from) => {
//     // TODO: check the pinia store to handle this, especially with contact/admin, to go back to /login if mismatched
//     // TODO: check routing transaction being vanished due to this!
//     const isAuthenticated = false; // Replace with your auth logic

//     if (!isAuthenticated) {
//       return navigateTo("/"); // Redirect to home if not authenticated
//     }
//   }
// );
