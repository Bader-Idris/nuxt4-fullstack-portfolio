export default defineNuxtPlugin(() => {
//   const router = useRouter();

//   // Add a global beforeEnter guard
//   router.beforeEach((to, from, next) => {
//     const localePath = useLocalePath();

//     // Check if the route exists
//     const matchedRoute = router.resolve(
//       localePath(to.path)
//     ).matched;

//     if (matchedRoute.length === 0) {
//       console.log('=======> hi <=======');

//       // If the route doesn't exist, throw a 404 error
//       throw createError({
//         statusCode: 404,
//         statusMessage: "Page Not Found",
//       });
//     }

//     // Continue to the next middleware or route
//     next();
//   });
});
