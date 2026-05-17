import { Socket } from "socket.io";
import { isTokenValid } from "../utils/jwt";
import { Token } from "../models/mongo";

export const authMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error("Authentication error"));
    }

    // Robust cookie parsing
    const parsedCookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...v] = c.trim().split("=");
        return [key, v.join("=")];
      }),
    );

    const accessToken = parsedCookies["accessToken"];
    const refreshTokenJWT = parsedCookies["refreshToken"];

    if (accessToken) {
      try {
        const payload = isTokenValid(accessToken);
        if (payload && payload.user) {
          socket.data.user = payload.user;
          return next();
        }
      } catch {
        // Access token invalid or expired, proceed to check refresh token
      }
    }

    if (refreshTokenJWT) {
      try {
        const payload = isTokenValid(refreshTokenJWT);
        if (payload && payload.user && payload.refreshToken) {
          const existingToken = await Token.findOne({
            user: payload.user.userId,
            refreshToken: payload.refreshToken,
          });

          if (existingToken && existingToken.isValid) {
            socket.data.user = payload.user;
            // We allow the connection; the user is authenticated via refresh token
            return next();
          }
        }
      } catch {
        // Refresh token invalid or expired
      }
    }

    return next(new Error("Authentication error"));
  } catch (error) {
    console.error("Socket authentication middleware error:", error);
    return next(new Error("Authentication error"));
  }
};