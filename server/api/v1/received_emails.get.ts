import { ReceivedEmail } from "../../models/mongo/index";

interface EmailDocument {
  _id: any;
  name: string;
  email: string;
  message: string;
  ip: string;
  createdAt: Date;
}
// check the new middleware protection here: server/middleware/auth.ts

export default defineEventHandler(async (event) => {
  // The server middleware (server/middleware/auth.ts) has already run and validated the user.
  // It attaches the user to the event context if they are valid.
  const user = event.context.user;

  // 1. Check for authenticated user and admin role
  if (!user || user.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden: Access is restricted to administrators.",
    });
  }

  try {
    // 2. Fetch emails
    const emails = await ReceivedEmail.find({})
      .sort({ createdAt: -1 })
      .lean<EmailDocument[]>()
      .exec();

    if (!emails || emails.length === 0) {
      return {
        // No Content - still a success
        statusCode: 204,
        data: [],
      };
    }

    // 3. Return properly typed response
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
    console.error("Error fetching received emails:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { message: "An unexpected error occurred while fetching emails." },
    });
  }
});