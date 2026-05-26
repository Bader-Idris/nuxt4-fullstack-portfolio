import "dotenv/config";
import { prisma } from "@server/plugins/prisma"; // adjust relative/alias path as needed

const userData = [
  {
    name: "Bader",
    email: "contact@baderidris.com",
    role: "admin",
    posts: {
      create: [
        {
          title: "Join the Portfolio Discord",
          slug: "join-the-portfolio-discord",
          content: "Welcome to our community! Join us on Discord to discuss development and more.",
          published: true,
        },
      ],
    },
  },
  {
    name: "Wife", // I have to marry her first 😉
    email: "info@baderidris.com",
    role: "editor",
    posts: {
      create: [
        {
          title: "Follow Portfolio on Twitter",
          slug: "follow-portfolio-on-twitter",
          content: "Stay updated with the latest news by following us on Twitter.",
          published: true,
          viewCount: 42,
        },
      ],
    },
  },
  {
    name: "Mahmoud",
    email: "mahmoud@baderidris.com",
    role: "user",
    posts: {
      create: [
        {
          title: "Ask a question about Portfolio on GitHub",
          slug: "ask-on-github",
          content: "Have a question? Open a discussion on our GitHub repository.",
          published: true,
          viewCount: 128,
        },
        {
          title: "Portfolio on YouTube",
          slug: "portfolio-on-youtube",
          content: "Check out our video tutorials and showcases on YouTube.",
          published: false, // Unpublished example
        },
      ],
    },
  },
];
async function main() {
  console.log(`Start seeding ...`);
  if (!prisma) {
    throw new Error("Prisma client not initialized");
  }
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