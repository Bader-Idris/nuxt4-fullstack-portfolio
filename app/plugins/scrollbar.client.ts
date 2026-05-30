import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return;

  const timeouts = new Map<HTMLElement, NodeJS.Timeout>();

  const handleScroll = (event: Event) => {
    let target = event.target as any;
    
    // If scrolling the whole window, target documentElement
    if (target === document) {
      target = document.documentElement;
    }

    if (!(target instanceof HTMLElement)) return;

    // Add scrolling class
    target.classList.add('is-scrolling');

    // Clear existing timeout
    if (timeouts.has(target)) {
      clearTimeout(timeouts.get(target)!);
    }

    // Set new timeout to remove class after 1.5 seconds
    const timeout = setTimeout(() => {
      target.classList.remove('is-scrolling');
      timeouts.delete(target);
    }, 1500);

    timeouts.set(target, timeout);
  };

  // Use capture phase to catch all scroll events in the app
  window.addEventListener('scroll', handleScroll, true);
});
