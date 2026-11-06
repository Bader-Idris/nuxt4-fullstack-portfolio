import { getPrismaClient, prisma as importedPrisma } from "@server/plugins/prisma";
import { syncUserToPrisma } from "@server/utils/prismaSync";
import type { TokenUser } from "@server/utils/jwt";

const WELCOME_SLUG = "welcome-test-post";

// Idempotent bootstrap of the Welcome post. Safe to call repeatedly and
// concurrently (upserts on the unique slug) and only runs on an empty posts
// table. Called with the authenticated admin on the lazy production path, so
// the post is authored by a real account — the synthetic "System Admin"
// fallback is only used by the dev startup plugin.
export async function ensureWelcomePost(author?: TokenUser): Promise<void> {
  if (import.meta.prerender) return;

  const db = getPrismaClient() || importedPrisma || (globalThis as any).prisma;
  if (!db) return;

  try {
    // Fail fast if the database is unreachable (e.g. during startup)
    const count = await Promise.race([
      db.post.count(),
      new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout during seeding")), 10000),
      ),
    ]);
    if (count > 0) return;

    let authorId: string | undefined;
    if (author) {
      const prismaUser = await syncUserToPrisma(author);
      authorId = prismaUser?.id ?? undefined;
    }
    if (!authorId) {
      const adminUser = await db.user.upsert({
        where: { email: "admin@baderidris.com" },
        update: {},
        create: {
          email: "admin@baderidris.com",
          mongodbId: "system-admin-id",
          name: "System Admin",
          role: "admin",
        },
      });
      authorId = adminUser.id;
    }

    await db.post.upsert({
      where: { slug: WELCOME_SLUG },
      update: {},
      create: {
        title: "Welcome to the New Blog!",
        slug: WELCOME_SLUG,
        content: "<h1>Hello!</h1><p>This is an automatically generated testing post. You can edit or delete this post from the dashboard.</p>",
        summary: "A welcome post to test the new robust CMS features.",
        language: "en",
        published: true,
        authorId,
      },
    });

    console.log("✅ Welcome post ensured.");
  } catch (error) {
    console.error("❌ Error during blog seeding:", error);
  }
}
