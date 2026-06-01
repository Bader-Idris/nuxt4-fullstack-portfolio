import { prisma } from "../plugins/prisma";

export default defineNitroPlugin(async (nitroApp) => {
  if (!prisma) return;

  try {
    const postCount = await prisma.post.count();
    
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
});
