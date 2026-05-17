import { createError } from "h3";

export const checkPermissions = (
  requestUser: TokenUser,
  resourceUserId: string,
): void => {
  if (requestUser.role === "admin") return;
  if (requestUser.userId === resourceUserId) return;

  throw createError({
    statusCode: 403,
    statusMessage: "Not authorized to access this route",
  });
};