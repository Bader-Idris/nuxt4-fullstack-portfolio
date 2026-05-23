import Electrobun, { Electroview } from "electrobun/view";

export default defineNuxtPlugin(() => {
  if (process.env.IS_ELECTROBUN === "true") {
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
