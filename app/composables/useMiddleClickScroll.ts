import { ref, onUnmounted, type Ref } from 'vue';
import { useEventListener, useRafFn } from '@vueuse/core';

/**
 * Hook to enable middle-click autoscroll on an element.
 * 
 * @param target The element that should be scrollable.
 * @returns Object containing state of the scroll
 */
export const useMiddleClickScroll = (target: Ref<HTMLElement | null>) => {
  const isScrolling = ref(false);
  const startY = ref(0);
  const currentY = ref(0);
  
  // Visual indicator element
  let indicator: HTMLElement | null = null;

  const createIndicator = (x: number, y: number) => {
    if (indicator) removeIndicator();
    
    indicator = document.createElement('div');
    indicator.className = 'middle-click-scroll-indicator';
    Object.assign(indicator.style, {
      position: 'fixed',
      left: `${x - 15}px`,
      top: `${y - 15}px`,
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      border: '2px solid var(--scrollbar-thumb, #888)',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      zIndex: '9999',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    
    indicator.innerHTML = `
      <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 8px solid var(--scrollbar-thumb, #888); margin-bottom: 2px; position: absolute; top: 2px;"></div>
      <div style="width: 4px; height: 4px; background: var(--scrollbar-thumb, #888); border-radius: 50%;"></div>
      <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid var(--scrollbar-thumb, #888); margin-top: 2px; position: absolute; bottom: 2px;"></div>
    `;
    
    document.body.appendChild(indicator);
  };

  const removeIndicator = () => {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
      indicator = null;
    }
  };

  const { pause, resume } = useRafFn(() => {
    if (!isScrolling.value || !target.value) return;

    const diff = currentY.value - startY.value;
    // Threshold to prevent accidental scroll
    if (Math.abs(diff) > 5) {
      // Update cursor based on direction
      if (diff > 20) {
        document.body.style.cursor = 's-scroll';
      } else if (diff < -20) {
        document.body.style.cursor = 'n-scroll';
      } else {
        document.body.style.cursor = 'all-scroll';
      }

      // Non-linear speed for better control
      const scrollSpeed = Math.sign(diff) * Math.pow(Math.abs(diff) / 15, 1.6);
      target.value.scrollTop += scrollSpeed;
    } else {
      document.body.style.cursor = 'all-scroll';
    }
  }, { immediate: false });

  const stopScrolling = () => {
    if (!isScrolling.value) return;
    
    isScrolling.value = false;
    pause();
    removeIndicator();
    document.body.style.cursor = '';
    if (target.value) {
      target.value.classList.remove('is-autoscrolling');
    }
    
    // Cleanup global listeners
    cleanupGlobal?.();
  };

  let cleanupGlobal: (() => void) | null = null;

  const startScrolling = (e: MouseEvent) => {
    isScrolling.value = true;
    startY.value = e.clientY;
    currentY.value = e.clientY;

    if (target.value) {
      target.value.classList.add('is-autoscrolling');
    }

    createIndicator(e.clientX, e.clientY);
    resume();

    // Listen for movement and clicks globally to stop
    const stopOnNextClick = (ev: MouseEvent) => {
      // If user clicks again (any button), stop scrolling
      stopScrolling();
    };

    const updatePosition = (ev: MouseEvent) => {
      currentY.value = ev.clientY;
    };

    const cleanupMove = useEventListener(window, 'mousemove', updatePosition);
    const cleanupClick = useEventListener(window, 'mousedown', stopOnNextClick, { capture: true });
    
    cleanupGlobal = () => {
      cleanupMove();
      cleanupClick();
    };
  };

  useEventListener(target, 'mousedown', (e: MouseEvent) => {
    // Middle button is 1
    if (e.button === 1) {
      e.preventDefault();
      if (isScrolling.value) {
        stopScrolling();
      } else {
        startScrolling(e);
      }
    }
  });

  onUnmounted(() => {
    stopScrolling();
  });

  return {
    isScrolling
  };
};
