import { isTokenValid, attachCookiesToResponse } from "../utils/jwt";
import { Token } from "../models/mongo";
import { getCookie } from "h3";

export default defineEventHandler(async (event) => {
  // Define protected API routes that require authentication
  const protectedRoutes = [
    "/api/v1/auth/me",
    "/api/v1/received_emails",
    "/api/v1/push/subscribe",
    "/api/v1/push/subscribe-capacitor",
    "/api/v1/user/settings",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    event.path.startsWith(route),
  );

  const accessToken = getCookie(event, "accessToken");
  const refreshTokenJWT = getCookie(event, "refreshToken");

  // Attempt to authenticate using access token
  if (accessToken) {
    try {
      const payload = isTokenValid(accessToken);
      if (payload && payload.user) {
        event.context.user = payload.user;
        return;
      }
    } catch (error) {
      // Access token is invalid or expired
      console.log("Access Token invalid, attempting refresh...");
    }
  }

  // If no access token or it's invalid, and it's NOT a protected route, 
  // we can skip refresh logic to save resources, but if there's a refresh token, we might want to refresh anyway
  if (!refreshTokenJWT) {
    if (isProtectedRoute) {
      // For protected routes, we could throw here, but we'll let the endpoint handle it or just leave context.user undefined
      // Actually, standard behavior is to leave it undefined and let checkPermissions handle it.
    }
    return;
  }

  try {
    const payload = isTokenValid(refreshTokenJWT);
    if (!payload || !payload.user || !payload.refreshToken) {
      return;
    }

    const existingToken = await Token.findOne({
      user: payload.user.userId,
      refreshToken: payload.refreshToken,
    });

    if (!existingToken || !existingToken.isValid) {
      return;
    }

    // Issue new tokens
    attachCookiesToResponse(event, payload.user, existingToken.refreshToken);
    event.context.user = payload.user;
    console.log("Token refreshed successfully");
  } catch (error) {
    console.log("Refresh token invalid.");
    return;
  }
});