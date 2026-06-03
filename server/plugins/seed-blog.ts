import { prisma } from "../plugins/prisma";

export default defineNitroPlugin(async (nitroApp) => {
  if (!prisma) return;

  // Run seeding in background to prevent blocking server startup if DB is slow/unreachable
  // This avoids the "frozen" state the user experienced.
  (async () => {
    try {
      // Set a local timeout for the initial count to fail fast if DB is down
      const postCountPromise = prisma.post.count();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout during seeding')), 10000)
      );

      const postCount = await Promise.race([postCountPromise, timeoutPromise]) as number;

      if (postCount === 0) {
      console.log('🌱 No blog posts found. Creating a testing post...');
      
      // Ensure a system/admin user exists in Postgres for the test post
      const adminUser = await prisma.user.upsert({
        where: { email: 'admin@baderidris.com' },
        update: {},
        create: {
          email: 'admin@baderidris.com',
          mongodbId: 'system-admin-id',
          name: 'System Admin',
          role: 'admin'
        }
      });

      await prisma.post.create({
        data: {
          title: 'Welcome to the New Blog!',
          slug: 'welcome-test-post',
          content: '<h1>Hello!</h1><p>This is an automatically generated testing post. You can edit or delete this post from the dashboard.</p>',
          summary: 'A welcome post to test the new robust CMS features.',
          language: 'en',
          published: true,
          authorId: adminUser.id,
        }
      });
      
      console.log('✅ Testing post created successfully.');
      }
    } catch (error) {
      console.error('❌ Error during automatic blog seeding:', error);
    }
  })();
});
