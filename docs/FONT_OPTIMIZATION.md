# Font Optimization Strategies for Fira Code

This document outlines production-ready approaches to optimize the `Fira Code` font (currently 106 KB) for the portfolio project, ensuring high performance on the web and reliability in local builds (Electron/Capacitor).

---

## 1. Hybrid Strategy: Google Fonts + Local Backup (Recommended)

This approach uses Google Fonts' global CDN for the fastest delivery and browser caching, while maintaining your local file as a robust fallback.

### implementation:
In your `app/assets/scss/_fonts.scss`:

```scss
/* 1. Use Google Fonts first */
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap');

/* 2. Define local fallback for offline/CDN failure */
@font-face {
  font-family: "Fira Code Fallback";
  src: local("Fira Code"),
       url("/fonts/FiraCode/FiraCode-VariableFont_wght.woff2") format("woff2-variations"),
       url("/fonts/FiraCode/FiraCode-VariableFont_wght.woff2") format("woff2");
  font-weight: 300 700;
  font-display: swap;
}
```

### Benefits:
- **Web:** Browsers likely already have Fira Code cached from other sites via Google's CDN.
- **Electron/Capacitor:** If the device is offline, the CSS `@import` fails silently, and the `src: local()` or the local `url()` takes over.

---

## 2. Subsetting (Drastic Size Reduction)

A variable font often includes glyphs for many languages (Cyrillic, Greek, etc.) that you might not need. Subsetting removes these unused characters.

### How to do it:
Use a tool like **[glyphhanger](https://github.com/zachleat/glyphhanger)** or **[pyftsubset](https://github.com/fonttools/fonttools)**.

**Command Example (Latin characters only):**
```bash
# Keep only Latin characters, numbers, and basic punctuation
pyftsubset FiraCode-VariableFont_wght.woff2 --unicodes="U+0000-007F,U+00A0-00FF" --flavor=woff2
```
*Result: Usually reduces the file size from **106 KB** to **~25-35 KB**.*

---

## 3. Performance Tuning (Nuxt/Web)

To minimize the impact on Core Web Vitals (LCP/CLS):

### A. Preconnect in `nuxt.config.ts`:
```typescript
app: {
  head: {
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }
    ]
  }
}
```

### B. Use `font-display: swap`:
Ensures text is visible immediately using a system font while the custom font loads.

---

## 4. Local Build Specifics (Electron & Capacitor)

For local applications, **latency is 0**, so external CDNs can actually be slower or fail entirely.

### Strategy:
1. **Always package the local font:** Keep the `.woff2` files in your `public/fonts` directory.
2. **Conditional Loading:** If you want to be extra surgical, you can use environment variables:

```scss
// app/assets/scss/_fonts.scss
@if $IS_ELECTRON == "true" or $IS_CAPACITOR == "true" {
  @font-face {
    font-family: "Fira Code";
    src: url("/fonts/FiraCode/FiraCode-VariableFont_wght.woff2") format("woff2");
    // ...
  }
} @else {
  @import url('...'); 
}
```

---

## Summary of Options

| Approach | Effort | Size Impact | Best For |
| :--- | :--- | :--- | :--- |
| **Google Fonts** | Low | Low (Browser Cache) | General Web Traffic |
| **Subsetting** | Medium | **High (-70%)** | Mobile & Slow Connections |
| **Local Only** | Low | None | Electron/Capacitor (Offline) |
| **Hybrid** | Medium | Optimized | Professional Portfolios |
