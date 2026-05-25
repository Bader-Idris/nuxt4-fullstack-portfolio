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

  // Only run authentication logic for protected routes
  if (!isProtectedRoute) {
    return;
  }

  const accessToken = getCookie(event, "accessToken");
  const refreshTokenJWT = getCookie(event, "refreshToken");

  if (accessToken) {
    try {
      const payload = isTokenValid(accessToken);
      if (payload && payload.user) {
        event.context.user = payload.user;
        return;
      }
    } catch (error) {
      // Access token is invalid or expired, proceed to refresh token logic
      console.log("Access Token invalid, attempting refresh...");
    }
  }

  if (!refreshTokenJWT) {
    return; // No refresh token, user is unauthenticated
  }

  try {
    const payload = isTokenValid(refreshTokenJWT);
    if (!payload || !payload.user || !payload.refreshToken) {
      return; // Invalid refresh token payload
    }

    const existingToken = await Token.findOne({
      user: payload.user.userId,
      refreshToken: payload.refreshToken,
    });

    if (!existingToken || !existingToken.isValid) {
      return; // Refresh token not found in DB or is invalidated
    }

    // Issue new tokens
    attachCookiesToResponse(event, payload.user, existingToken.refreshToken);
    event.context.user = payload.user;
    console.log("Token refreshed successfully");
  } catch (error) {
    // Refresh token is invalid or expired
    console.log("Refresh token invalid.");
    return;
  }
});