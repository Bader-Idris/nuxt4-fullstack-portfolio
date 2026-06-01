import "dotenv/config";
import { prisma } from "../plugins/prisma";

const userData = [
  {
    name: "Bader",
    email: "contact@baderidris.com",
    mongodbId: "seed-user-bader",
    role: "admin",
    posts: {
      create: [
        {
          title: "Join the Portfolio Discord",
          slug: "join-the-portfolio-discord",
          content: "<h1>Welcome!</h1><p>Join us on Discord to discuss development.</p>",
          language: "en",
          published: true,
        },
      ],
    },
  },
  {
    name: "System Editor",
    email: "editor@baderidris.com",
    mongodbId: "seed-user-editor",
    role: "editor",
    posts: {
      create: [
        {
          title: "Mastering Nuxt 4",
          slug: "mastering-nuxt-4",
          content: "<h1>Advanced Nuxt</h1><p>Learn the latest features of Nuxt 4.</p>",
          language: "en",
          published: true,
        },
      ],
    },
  },
];

async function main() {
  console.log(`🌱 Start seeding ...`);
  if (!prisma) {
    throw new Error("Prisma client not initialized");
  }

  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    console.log(`✅ Upserted user: ${user.name}`);
  }
  console.log(`🏁 Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
