export const useMobile = () => {
  const isMobile = ref(false)

  if (import.meta.client) {
    isMobile.value = window.innerWidth < 768
    window.addEventListener('resize', () => {
      isMobile.value = window.innerWidth < 768
    })
  }

  return isMobile
}
