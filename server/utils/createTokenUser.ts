// import type { TokenUser } from './auth.types'

export const createTokenUser = (user: any): TokenUser => {
  return {
    name: user.name,
    userId: user._id, // TODO: vs user._id.toString(), // is it more secure?
    role: user.role,
  };
};