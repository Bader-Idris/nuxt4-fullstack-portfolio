import { H3Error } from "h3";

export default function (error: H3Error, event) {
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Internal Server Error";

  // Log the error for Docker production logs
  console.error(
    `[Server Error] ${event.node.req.method} ${event.node.req.url} - ${statusCode}: ${error.message}`,
    error.cause || "",
  );

  // Set the response status
  event.node.res.statusCode = statusCode;
  event.node.res.statusMessage = statusMessage;

  // If it's a static asset request from _nuxt, we might want to be more careful,
  // but usually Nitro handles these before the error handler.
  // For API or unexpected errors, return JSON.
  return (
    error.data || {
      message: error.message,
      statusCode,
      statusMessage,
    }
  );
}