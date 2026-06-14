import { getContacts } from "../../../utils/getContacts";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const { page = 1, limit = 50 } = getQuery(event);

  try {
    const contacts = await getContacts(
      user.userId, 
      Number(page), 
      Number(limit)
    );
    return { contacts };
  } catch (error) {
    console.error("Error fetching chat contacts:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch contacts",
    });
  }
});
