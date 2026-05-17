import "dotenv/config";
import { prisma } from "@server/plugins/prisma"; // adjust relative/alias path as needed

const userData = [
  {
    name: "Bader",
    email: "contact@baderidris.com",
    posts: {
      create: [
        {
          title: "Join the Portfolio Discord",
          // not applied yet! 😃
          content: "https://baderidris.com/blog/join-the-portfolio-discord",
          published: true,
        },
      ],
    },
  },
  {
    name: "Wife", // I have to marry her first 😉
    email: "info@baderidris.com",
    posts: {
      create: [
        {
          title: "Follow Portfolio on Twitter",
          content: "https://www.twitter.com/bader_idri8628",
          published: true,
          viewCount: 42,
        },
      ],
    },
  },
  {
    name: "Mahmoud",
    email: "mahmoud@baderidris.com",
    posts: {
      create: [
        {
          title: "Ask a question about Portfolio on GitHub",
          content:
            "https://github.com/Bader-Idris/nuxt4-fullstack-portfolio/discussions",
          published: true,
          viewCount: 128,
        },
        {
          title: "Portfolio on YouTube",
          // not applied yet!
          content: "https://www.youtube.com/@not-applied-yet",
        },
      ],
    },
  },
];
async function main() {
  console.log(`Start seeding ...`);
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    });
    console.log(`Created user with id: ${user.id}`);
  }
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect(); // clean shutdown for script
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });