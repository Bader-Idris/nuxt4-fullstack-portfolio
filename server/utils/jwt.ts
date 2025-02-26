import jwt from 'jsonwebtoken'
import { setCookie } from 'h3'
import type { TokenPayload, TokenUser } from './auth.types'

export const createJWT = (payload: TokenPayload): string => {
  return jwt.sign(payload, useRuntimeConfig().jwtSecret)
}

export const isTokenValid = (token: string): TokenPayload => {
  return jwt.verify(token, useRuntimeConfig().jwtSecret) as TokenPayload
}

export const attachCookiesToResponse = (
  event: any,
  user: TokenUser,
  refreshToken: string,
) => {
  const accessTokenJWT = createJWT({ user }) // todo: in express, we use: createJWT({ payload: { user } });
  const refreshTokenJWT = createJWT({ user, refreshToken })
  const config = useRuntimeConfig()

  setCookie(event, 'accessToken', accessTokenJWT, {
    // todo: test it out, cause it's different than expressJs one
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    // todo especially this => signed: true,
    maxAge: 60 * 60 * 24, // 1 day
  })

  setCookie(event, 'refreshToken', refreshTokenJWT, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}
