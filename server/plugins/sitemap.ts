import { defineNitroPlugin } from 'nitropack/runtime/plugin'
import fs from 'node:fs'
import path from 'node:path'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:resolved', async (ctx) => {
    // This hook allows us to modify the sitemap before it is rendered.
    // We try to find the source file for each route to get its actual modification time.
    
    const pagesDir = path.resolve(process.cwd(), 'app/pages')
    
    for (const url of ctx.urls) {
      if (url.lastmod && !url._generated) continue; // Skip if already set and not generated

      try {
        // Handle full URLs by extracting the pathname
        const urlObj = new URL(url.loc, 'https://baderidris.com')
        let relativePath = urlObj.pathname.replace(/\/$/, '') || '/'
        
        // Remove locale prefix if present (e.g., /ar/about -> /about)
        // Supported locales from nuxt.config.ts: en, ar, es
        const localeMatch = relativePath.match(/^\/(ar|es|en)(\/|$)/)
        if (localeMatch) {
          relativePath = relativePath.replace(/^\/(ar|es|en)/, '') || '/'
        }

        let filePath = ''
        if (relativePath === '/') {
          filePath = path.join(pagesDir, 'index.vue')
        } else {
          const possiblePaths = [
            path.join(pagesDir, `${relativePath}.vue`),
            path.join(pagesDir, relativePath, 'index.vue')
          ]
          filePath = possiblePaths.find(p => fs.existsSync(p)) || ''
        }

        if (filePath && fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath)
          url.lastmod = stats.mtime.toISOString().split('T')[0]
        } else if (!url.lastmod) {
          // Fallback to today if still not set
          url.lastmod = new Date().toISOString().split('T')[0]
        }
      } catch (e) {
        // Silently fail for complex routes or missing files
        if (!url.lastmod) {
          url.lastmod = new Date().toISOString().split('T')[0]
        }
      }
    }
  });
})
