import { defineEventHandler } from "h3";
import { User } from "../../../models/mongo";
import { isTokenValid } from "../../../utils/jwt";

export default defineEventHandler(async (event) => {
  try {
    // Extract the token from the Authorization header
    const authHeader = getRequestHeader(event, 'Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authorization header missing or invalid',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the token and get user info
    let decodedToken;
    try {
      decodedToken = isTokenValid(token) as any;
    } catch (error) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token',
      });
    }

    // Find the user based on the token
    const user = await User.findById(decodedToken.user.userId);
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      });
    }

    // Return user information
    return {
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        role: user.role,
      }
    };

  } catch (error) {
    console.error("Get Google user error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to retrieve user information",
    });
  }
});