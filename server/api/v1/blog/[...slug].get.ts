import fs from 'node:fs';
import path from 'node:path';
// stupid ai, use dbs here: hhh
export default defineEventHandler(async (event) => {
  const slugParams = getRouterParam(event, 'slug');
  const slug = Array.isArray(slugParams) ? slugParams.join('/') : slugParams;
  const locale = getHeader(event, 'x-locale') || 'en';
  
  // Base directory for content - using the project's content structure
  const contentDir = path.join(process.cwd(), 'app/content', locale);
  const filePath = path.join(contentDir, `${slug}.md`);

  try {
    if (!fs.existsSync(filePath)) {
      // Fallback to default locale if not found in requested locale
      const fallbackPath = path.join(process.cwd(), 'app/content/en', `${slug}.md`);
      if (!fs.existsSync(fallbackPath)) {
        throw createError({
          statusCode: 404,
          statusMessage: `Post not found: ${slug}`,
        });
      }
      return await readAndParseFile(fallbackPath, slug);
    }

    return await readAndParseFile(filePath, slug);
  } catch (e: any) {
    console.error(`[blog API] Error fetching ${slug}:`, e.message);
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || 'Internal Server Error',
    });
  }
});

async function readAndParseFile(filePath: string, slug: string) {
  const md = fs.readFileSync(filePath, 'utf-8');
  
  // Simple frontmatter parser
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = md.match(frontmatterRegex);
  let metadata: Record<string, string> = {
    title: slug,
    description: '',
    date: new Date().toISOString().split('T')[0],
    author: 'Bader Idris'
  };
  let content = md;
  
  if (match) {
    const yaml = match[1];
    content = md.replace(frontmatterRegex, '').trim();
    yaml.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        if (key && value) {
          metadata[key] = value.replace(/^["'](.*)["']$/, '$1'); // Remove quotes
        }
      }
    });
  }
  
  return {
    metadata,
    content
  };
}
