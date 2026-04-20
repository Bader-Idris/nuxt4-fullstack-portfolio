import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@server/prisma/generated/prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient | undefined
let pool: Pool | undefined

if (process.env.PSQL_URL) {
  pool = new Pool({
    connectionString: process.env.PSQL_URL,
  })
  const adapter = new PrismaPg(pool)

  if (process.env.NODE_ENV === 'development') {
    if (!global.prisma) {
      global.prisma = new PrismaClient({ adapter })
    }
    prisma = global.prisma
  } else {
    prisma = new PrismaClient({ adapter })
  }

  console.log('✅ Prisma client initialized.')
} else {
  console.log('⚠️ Skipping Prisma client initialization (no PSQL_URL provided)')
}

export default defineNitroPlugin(async (nitroApp) => {
  if (prisma && pool) {
    // @ts-expect-error: custom property
    nitroApp.prisma = prisma

    nitroApp.h3App?.stack.push({
      route: '/',
      handle: (event) => {
        event.context.prisma = prisma
      },
    })

    console.log('✅ Prisma client injected into Nitro app context.')

    nitroApp.hooks.hook('close', async () => {
      await prisma.$disconnect()
      await pool?.end()
      console.log('🔌 Prisma client and PG pool closed on server shutdown')
    })
  }
})

export { prisma }