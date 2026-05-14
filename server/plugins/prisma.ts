import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@server/prisma/generated/prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient | undefined
let pool: Pool | undefined

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  if (process.env.PSQL_URL) {
    try {
      pool = new Pool({
        connectionString: process.env.PSQL_URL,
      })
      
      // Basic connectivity check to catch SSL/Auth errors early
      pool.on('error', (err) => {
        console.error('❌ Unexpected error on idle client', err)
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
    } catch (e) {
      console.error('❌ Failed to initialize Prisma Client:', e.message)
    }
  } else {
    console.log('⚠️ Skipping Prisma client initialization (no PSQL_URL provided)')
  }
} else {
  console.log('⚠️ Skipping Prisma connection during build phase')
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