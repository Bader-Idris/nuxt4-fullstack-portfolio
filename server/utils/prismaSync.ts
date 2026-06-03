import { prisma } from "../plugins/prisma";

/**
 * Ensures a user exists in the PostgreSQL database based on their MongoDB user data.
 * This is used to maintain a reference in PostgreSQL for blog posts and comments.
 */
export async function syncUserToPrisma(tokenUser: { userId: string; name: string; email?: string; role: string }) {
  if (!prisma) {
    console.error('[syncUserToPrisma] Prisma client not initialized');
    return null;
  }

  try {
    // We use a transaction or careful upsert to ensure the user is correctly mapped
    // from MongoDB to PostgreSQL. 
    const user = await prisma.user.upsert({
      where: { mongodbId: tokenUser.userId },
      update: {
        name: tokenUser.name,
        role: tokenUser.role,
        // Optional: Update email if it's provided and we want to keep it in sync
        ...(tokenUser.email && { email: tokenUser.email }),
      },
      create: {
        mongodbId: tokenUser.userId,
        email: tokenUser.email || `user-${tokenUser.userId.slice(-8)}@baderidris.com`,
        name: tokenUser.name,
        role: tokenUser.role,
      },
    });

    return user;
  } catch (error: any) {
    // Check for specific Prisma errors (e.g., Unique constraint on email)
    if (error.code === 'P2002') {
      console.warn(`[syncUserToPrisma] Conflict on unique field (likely email) for user ${tokenUser.userId}. Attempting recovery...`);
      // Fallback: Find by mongodbId directly if upsert failed due to a different field's conflict
      try {
        return await prisma.user.findUnique({ where: { mongodbId: tokenUser.userId } });
      } catch (innerError) {
        console.error('[syncUserToPrisma] Recovery failed:', innerError);
      }
    }
    
    console.error('[syncUserToPrisma] Error syncing user:', error.message || error);
    return null;
  }
}
