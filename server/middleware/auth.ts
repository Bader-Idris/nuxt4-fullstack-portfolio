import { isTokenValid, attachCookiesToResponse } from "../utils/jwt";
import { Token } from "../models/mongo";
import { getCookie } from "h3";

export default defineEventHandler(async (event) => {
  const path = event.path;
  const method = event.method;

  // Define protected routes that require authentication
  const protectedRoutes = [
    "/api/v1/auth/me",
    "/api/v1/received_emails",
    "/api/v1/push/subscribe",
    "/api/v1/push/subscribe-capacitor",
    "/api/v1/user/settings",
  ];

  // Specific routes that require elevated roles (Admin/Editor)
  const managementRoutes = ["/blog/create", "/blog/edit"];
  const apiManagementPrefix = "/api/v1/blog";

  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route),
  );

  // We only protect the API blog routes if it's NOT a GET request
  // AND NOT a comment POST request (which is allowed for authenticated users)
  const isCommentPost = path.match(/^\/api\/v1\/blog\/.*\/comments$/) && method === "POST";
  
  const isApiManagement =
    path.startsWith(apiManagementPrefix) &&
    ["POST", "PATCH", "DELETE"].includes(method) &&
    !isCommentPost;

  const isPageManagement = managementRoutes.some((route) =>
    path.startsWith(route),
  );

  const isManagementRoute = isApiManagement || isPageManagement;

  // Add the base requirement for management routes to the protected list
  const requiresAuth = isProtectedRoute || isManagementRoute;

  const accessToken = getCookie(event, "accessToken");
  const refreshTokenJWT = getCookie(event, "refreshToken");

  // Attempt to authenticate using access token
  if (accessToken) {
    try {
      const payload = isTokenValid(accessToken);
      if (payload && payload.user) {
        event.context.user = payload.user;
      }
    } catch (error) {
      console.log("Access Token invalid, attempting refresh...");
    }
  }

  // If no user on context yet, try refresh token
  if (!event.context.user && refreshTokenJWT) {
    try {
      const payload = isTokenValid(refreshTokenJWT);
      if (payload && payload.user && payload.refreshToken) {
        const existingToken = await Token.findOne({
          user: payload.user.userId,
          refreshToken: payload.refreshToken,
        });

        if (existingToken && existingToken.isValid) {
          // Issue new tokens
          attachCookiesToResponse(
            event,
            payload.user,
            existingToken.refreshToken,
          );
          event.context.user = payload.user;
          console.log("Token refreshed successfully");
        }
      }
    } catch (error) {
      console.log("Refresh token invalid.");
    }
  }

  // --- Final Auth Check ---
  const user = event.context.user;

  if (requiresAuth && !user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  if (isManagementRoute && user) {
    const isAdmin = user.role === "admin";
    const isEditor = user.role === "editor";

    if (!isAdmin && !isEditor) {
      throw createError({
        statusCode: 403,
        statusMessage: "Insufficient permissions for management actions",
      });
    }
  }
});
