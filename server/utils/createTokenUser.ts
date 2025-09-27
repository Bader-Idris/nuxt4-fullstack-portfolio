export const createTokenUser = (user: any): TokenUser => {
  return {
    name: user.name,
    userId: user._id.toString(),
    role: user.role,
  };
};