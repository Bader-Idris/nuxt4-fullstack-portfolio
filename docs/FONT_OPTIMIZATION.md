# Font Optimization: The Gold Standard for SSR & Desktop

This document outlines the high-performance, robust font loading strategy implemented for `Fira Code`. This configuration is specifically designed to handle **Nuxt SSR (Server-Side Rendering)** and **Client-Side Generated** targets (Electron and Capacitor) simultaneously.

---

## 1. The Core Strategy: Local-First with CDN Backup

We prioritize locally hosted, highly optimized font subsets while maintaining a Google Fonts CDN import as a secondary fallback.

### implementation:
Location: `app/assets/scss/_fonts.scss`

```scss
/* 1. Backup Plan: Google Fonts CDN */
/* Provides redundancy for web environments and fast delivery if local assets fail. */
@import url("https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600;700&display=swap");

/* 2. Primary Plan: Local Optimized Assets (Nuxt Fonts) */
/* 
   IMPORTANT: We use RELATIVE PATHS (../../public/fonts/...)
   This allows Vite to:
   - Process and hash the files for cache busting.
   - Resolve paths correctly across different protocols (https://, file://, app://).
   - Bundle assets into the output directory automatically.
*/

@font-face {
  font-family: "Fira Code";
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  src:
    local("Fira Code"),
    url("../../public/fonts/fira-code-v27-latin-400.woff2") format("woff2");
}

@font-face {
  font-family: "Fira Code";
  font-weight: 600;
  /* ... (and so on for 700) */
}
```

---

## 2. Why This is "Prod Robust"

### A. Asset Processing & Hashing
By referencing local fonts via **relative paths** in the SCSS file, we hook into Vite’s asset pipeline. 
- **Hashing:** Vite appends a unique ID (e.g., `fira-code.B8R452lT.woff2`). This ensures that if the font ever changes, browsers will download the new version immediately (cache-busting).
- **Automation:** No manual copying of font files is required; Vite handles the movement from `public/` to the build output.

### B. Cross-Protocol Portability
- **SSR (Web):** Works standardly over HTTPS.
- **Electron/Capacitor:** These environments often use a `file://` or custom protocol where absolute root paths (like `/fonts/`) frequently break. Relative paths ensure the CSS can always "find" the font relative to its own location.

### C. Size Optimization (Subsetting)
We moved away from heavy "Variable Fonts" (often 100KB+) in favor of specific **latin-subsetted** weights (`v27-latin`).
- **Standard Weight (400):** ~15 KB
- **SemiBold (600):** ~15 KB
- **Bold (700):** ~15 KB
*Total payload for 3 weights is ~45 KB vs 100 KB+ for a single variable font.*

---

## 3. Performance Tuning (Nuxt Config)

To minimize impact on Core Web Vitals and prevent layout shifts:

### Nuxt Configuration (`nuxt.config.ts`):
```typescript
app: {
  head: {
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' }
    ]
  }
}
```

### CSS Display Strategy:
We use `font-display: swap;` in every `@font-face` block. This ensures that a system monospace font is shown immediately while Fira Code loads, preventing the "Flash of Invisible Text" (FOIT).

---

## Summary of Optimization State

| Feature | Implementation | Benefit |
| :--- | :--- | :--- |
| **Asset Size** | `v27-latin` Optimized Subsets | 60-70% reduction in payload |
| **Versioning** | Vite Relative Asset Hashing | Bulletproof cache-busting |
| **Compatibility** | Relative SCSS Pathing | Works in SSR, Electron, & Capacitor |
| **Redundancy** | Google Fonts `@import` | Reliable web fallback |
| **UX** | `font-display: swap` | Zero FOIT (Flash of Invisible Text) |
