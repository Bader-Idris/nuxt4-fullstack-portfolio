export default defineNuxtPlugin(async () => {
  if (process.env.IS_ELECTROBUN === "true") {
    const { default: Electrobun } = await import("electrobun/view");
    const electroview = new Electrobun.Electroview();
    
    // Expose it globally for our utility
    if (typeof window !== "undefined") {
      (window as any).electrobun = electroview;
    }
    
    return {
      provide: {
        electrobun: electroview,
      },
    };
  }
});
