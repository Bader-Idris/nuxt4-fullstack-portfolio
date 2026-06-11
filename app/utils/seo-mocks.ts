// No-op SEO mocks for non-web builds (Electron/Capacitor)
// This file helps respect SSG/SSR isolation by providing safe stubs for SEO composables.

import { ref } from 'vue';

export const useSchemaOrg = () => {};
export const definePerson = (input: any) => input;
export const defineOrganization = (input: any) => input;
export const defineWebPage = (input: any) => input;
export const defineWebSite = (input: any) => input;

export const useSiteConfig = () => ({
  url: 'https://baderidris.com',
  name: 'Bader Idris',
  description: 'Full Stack Developer',
  defaultLocale: 'en'
});

export const useSiteIndexable = () => ref(false);
export const getSiteConfig = () => ({});

export const useOgImage = () => {};
export const useRobotConfig = () => ({});
export const useLinkChecker = () => ({});
