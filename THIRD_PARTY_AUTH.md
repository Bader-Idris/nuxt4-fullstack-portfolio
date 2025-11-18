# Third-Party Authentication Implementation

## Overview

This project supports third-party authentication (Google and Facebook) for both web and Capacitor mobile applications. The implementation handles both login and registration flows.

## Current Implementation

### Login Page (`/app/pages/login.vue`)
- Handles standard email/password login
- Supports Google OAuth with native Capacitor integration
- Supports Facebook OAuth with web fallback for Capacitor
- Handles cookie management for Capacitor apps using `CapacitorCookies`

### Register Page (`/app/pages/register.vue`) 
- Handles standard email/password registration
- Supports Google and Facebook OAuth for registration/login
- Works identically for both login and registration (backend handles user creation vs login)

### Backend Endpoints (`/server/api/v1/auth/`)
- `/api/v1/auth/google` - Initiates Google OAuth flow
- `/api/v1/auth/google/callback` - Handles Google OAuth callback and user creation/login
- `/api/v1/auth/facebook` - Initiates Facebook OAuth flow  
- `/api/v1/auth/facebook/callback` - Handles Facebook OAuth callback and user creation/login
- `/api/v1/auth/callback` - Frontend callback page that finalizes authentication

## Capacitor-Specific Implementation

### Google Authentication
- Uses `@capgo/capacitor-social-login` plugin (actively maintained fork)
- Native sign-in experience on mobile
- Properly handles cookies using `CapacitorCookies`

### Facebook Authentication  
- Uses `@capgo/capacitor-social-login` plugin (actively maintained)
- Native sign-in experience on mobile
- Properly handles cookies using `CapacitorCookies`

## How It Works

### Web Flow
1. User clicks Google/Facebook button
2. Redirected to `/api/v1/auth/[provider]` endpoint
3. Backend redirects to OAuth provider
4. User authenticates with provider
5. Provider redirects back to `/api/v1/auth/[provider]/callback`
6. Backend creates/updates user and sets cookies
7. Redirects to `/auth/callback` 
8. Frontend fetches user info and sets in store
9. User redirected to dashboard

### Capacitor Flow
1. Same as web flow, but native plugins are used when available
2. For Google: native sign-in using `@codetrix-studio/capacitor-google-auth`
3. For Facebook: currently web fallback, but can be enhanced with native plugin
4. Cookies are handled through `CapacitorCookies` plugin

## Configuration

The system requires the following environment variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` 
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `NUXT_PUBLIC_ORIGIN_URL`

## Future Enhancements

The implementation now uses `@capgo/capacitor-social-login` which supports Google, Facebook, and Apple authentication with native experiences. Make sure to:

1. Run capacitor sync after installation:
   ```bash
   npx cap sync
   ```

2. Configure platform-specific settings:
   - For Google: Configure Google Services plist/json files
   - For Facebook: Configure Facebook App ID in Info.plist (iOS) and strings.xml (Android)
   - For Apple: Configure Sign In with Apple in certificates

For detailed configuration, refer to the @capgo/capacitor-social-login documentation.