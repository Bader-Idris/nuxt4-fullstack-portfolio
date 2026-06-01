import { prisma } from "../plugins/prisma";

/**
 * Ensures a user exists in the PostgreSQL database based on their MongoDB user data.
 * This is used to maintain a reference in PostgreSQL for blog posts and comments.
 */
export async function syncUserToPrisma(tokenUser: { userId: string; name: string; email?: string; role: string }) {
  if (!prisma) return null;

  try {
    const user = await prisma.user.upsert({
      where: { mongodbId: tokenUser.userId },
      update: {
        name: tokenUser.name,
        role: tokenUser.role,
        // We only update email if it's provided and doesn't conflict
      },
      create: {
        mongodbId: tokenUser.userId,
        email: tokenUser.email || `${tokenUser.userId}@placeholder.com`, // Email is unique, fallback if not provided
        name: tokenUser.name,
        role: tokenUser.role,
      },
    });
    return user;
  } catch (error) {
    console.error('[syncUserToPrisma] Error syncing user:', error);
    return null;
  }
}
