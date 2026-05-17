// app/router.options.ts
import type { RouterConfig } from "@nuxt/schema";

export default <RouterConfig>{
  // scrollBehavior(to, from, savedPosition) {
  //   return savedPosition || { top: 0 };
  // },
  // routes: (routes) => {
  //   const aboutRoute = routes.find(route => route.name === 'about');
  //   if (aboutRoute) {
  //     aboutRoute.children = [
  //       {
  //         path: 'professional',
  //         name: 'professional',
  //         component: () => import('~/pages/about/professional.vue'),
  //         meta: { title: '...', description: '...' }
  //       },
  //       {
  //         path: 'personal',
  //         name: 'personal',
  //         component: () => import('~/pages/about/personal.vue'),
  //         meta: { title: '...', description: '...' }
  //       },
  //       {
  //         path: 'hobbies',
  //         name: 'hobbies',
  //         component: () => import('~/pages/about/hobbies.vue'),
  //         meta: { title: '...', description: '...' }
  //       },
  //     ];
  //   }
  //   return routes;
  // }
};