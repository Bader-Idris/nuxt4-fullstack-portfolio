import { isTokenValid } from '../utils/jwt';

export default defineEventHandler(async (event) => {
  const protectedRoutes = ['/api/v1/auth/me', '/api/v1/received_emails'];
  const isProtectedRoute = protectedRoutes.some(route => event.path.startsWith(route));

  if (!isProtectedRoute) {
    return;
  }

  const accessToken = getCookie(event, 'accessToken');

  if (!accessToken) {
    // No need to throw an error here, the endpoint itself will handle the case
    // where event.context.user is not defined.
    return;
  }

  try {
    const payload = isTokenValid(accessToken);
    if (payload && payload.user) {
      event.context.user = payload.user;
    }
  } catch (error) {
    // Invalid token, do nothing. The user will be considered unauthenticated.
    console.log('Server auth middleware: Invalid token provided.');
  }
});
