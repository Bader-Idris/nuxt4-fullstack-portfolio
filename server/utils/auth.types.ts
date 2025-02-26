// server/utils/auth.types.ts
export interface TokenUser {
  name: string
  userId: string
  role: string
}

export interface TokenPayload {
  user: TokenUser
  refreshToken?: string
}
