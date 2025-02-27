import { H3Error } from "h3";

export default function (error: H3Error, event) {
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Internal Server Error";

  // Set the response status
  event.node.res.statusCode = statusCode;
  event.node.res.statusMessage = statusMessage;

  // Return only the data you want
  return error.data || { message: error.message };
}
