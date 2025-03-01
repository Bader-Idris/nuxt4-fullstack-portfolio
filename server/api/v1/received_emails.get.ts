import jwt from "jsonwebtoken";
import { getCookie } from "h3";
// import type { NitroApp } from "nitropack";
import { ReceivedEmail, User } from "../../models/mongo/index";

export default defineEventHandler(async (event) => {
  try {
    // 1. Get JWT from cookies
    const accessToken = getCookie(event, "accessToken");
    if (!accessToken) {
      throw createError({
        statusCode: 401,
        statusMessage: "Authentication required",
        data: { message: "Missing authentication token" },
      });
    }

    // @ts-ignore 2. Verify JWT
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as {
      user: {
        userId: string;
        role: string;
      };
    };

    // 3. Verify user exists and has admin role
    const user = await User.findById(decoded.user.userId);
    if (!user || user.role !== "admin") {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
        data: { message: "Insufficient permissions" },
      });
    }

    // 4. Fetch emails with proper typing
    const emails = await ReceivedEmail.find({})
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!emails || emails.length === 0) {
      return {
        statusCode: 204,
        data: [],
      };
    }

    // 5. Return properly typed response
    return {
      statusCode: 200,
      data: emails.map((email) => ({
        id: email._id.toString(),
        name: email.name,
        email: email.email,
        message: email.message,
        ip: email.ip,
        createdAt: email.createdAt,
      })),
    };
  } catch (error) {
    // Handle JWT errors specifically
    if (error instanceof jwt.JsonWebTokenError) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid token",
        data: { message: "Authentication token is invalid" },
      });
    }

    // Handle MongoDB errors
    if (error.name === "MongoError") {
      console.error("Database error:", error);
      throw createError({
        statusCode: 503,
        statusMessage: "Service unavailable",
        data: { message: "Database operation failed" },
      });
    }

    // Propagate existing errors
    if (error.statusCode) {
      throw error;
    }

    // Generic error fallback
    console.error("Unexpected error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
      data: { message: "An unexpected error occurred" },
    });
  }
});
