// import { ReceivedEmail, User } from "../../models/mongo/index";
// import jwt from "jsonwebtoken";

// export default defineEventHandler(async (event) => {
//   // Authentication
//   const authHeader = getRequestHeader(event, "Authorization");
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     throw createError({
//       statusCode: 401,
//       data: { msg: "Authentication invalid" },
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET) as {
//       userId: string;
//       role: string;
//     };

//     // Verify user exists in the database and is an admin
//     const user = await User.findOne({ _id: payload.userId });
//     if (!user || user.role !== "admin") {
//       throw createError({
//         statusCode: 403,
//         data: { msg: "Unauthorized access" },
//       });
//     }

//     // Retrieve all emails from the database
//     const emails = await ReceivedEmail.find({}).sort({ createdAt: -1 });

//     if (emails.length === 0) {
//       return {
//         statusCode: 204,
//         data: { msg: "No emails found" },
//       };
//     }

//     return {
//       statusCode: 200,
//       data: { emails },
//     };
//   } catch (err) {
//     if (err instanceof jwt.JsonWebTokenError) {
//       throw createError({
//         statusCode: 401,
//         data: { msg: "Invalid token" },
//       });
//     }
//     console.error("Error retrieving emails:", err);
//     throw createError({
//       statusCode: 500,
//       data: { msg: "An error occurred while fetching emails" },
//     });
//   }
// });