import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  const prismaArgs = {
    datasources: {
      db: {
        url: process.env.PSQL_URL,
      },
    },
  };

  // Re-use the Prisma instance in development
  if (process.env.NODE_ENV === 'development') {
    if (!global.prisma) {
      global.prisma = new PrismaClient(prismaArgs);
    }
    prisma = global.prisma;
  } else {
    prisma = new PrismaClient(prismaArgs);
  }
  console.log('✅ Prisma client initialized.');
} else {
  console.log('⚠️ Skipping Prisma client initialization during build phase');
}

export default defineNitroPlugin(async (nitroApp) => {
  if (prisma) {
    // Inject prisma client into Nitro app context
    // @ts-expect-error: nitroApp with custom properties
    nitroApp.prisma = prisma;
    // Inject prisma client into H3 event context
    nitroApp.h3App?.stack.push({
      route: '/',
      handle: (event) => {
        event.context.prisma = prisma;
      },
    });
    console.log('✅ Prisma client injected into Nitro app context.');
  }
});

export { prisma };
