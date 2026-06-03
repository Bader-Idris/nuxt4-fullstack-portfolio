# Blog CMS Architecture

This document describes the robust, production-ready Content Management System (CMS) implemented in this application.

## 1. Hybrid Database Architecture

The CMS utilizes a hybrid approach to leverage the strengths of different database systems:

*   **MongoDB (Auth & Session):** Manages user authentication, sessions, and core user profiles. This ensures compatibility with existing social login providers and session management.
*   **PostgreSQL (Content & Messaging):** Stores blog posts, comments, and relational data. This provides structured querying, ACID compliance for content integrity, and efficient relational indexing.
*   **Redis (Caching & Real-time):** Handles real-time notifications via Socket.io and provides a high-performance caching layer for blog lists (read-heavy paths). This follows the principle of offloading relational databases for frequently accessed data.

## 2. Authentication & Authorization (Authn/Authz)

### Linking Identities
Users are authenticated via MongoDB. Upon first interaction with the CMS or login, their identity is synced to PostgreSQL using the `syncUserToPrisma` utility. This utility maps the MongoDB `userId` to a PostgreSQL `User` record. The sync process is robust, handling potential data conflicts (like unique email constraints) and ensuring identity integrity across both databases.

### Role-Based Access Control (RBAC)
The system respects roles defined in MongoDB:
*   **Admin:** Full access to create, edit, delete any post, and manage comments.
*   **Editor:** Can create and edit any post, but might have limited administrative capabilities.
*   **Author:** Can create and edit their own posts.
*   **User:** Can view published posts and add comments.

## 3. Headless CMS API

The backend is implemented as a set of headless API endpoints under `/server/api/v1/blog/**`.

### Caching Strategy
The `GET /api/v1/blog` endpoint implements **Redis caching** to ensure rapid responses for the primary blog list. 
*   **Read-Through:** Requests first check Redis before hitting PostgreSQL.
*   **TTL:** Cache entries have a 5-minute Time-To-Live (TTL).
*   **Invalidation:** The cache is automatically purged whenever a new post is created via the `POST` endpoint, ensuring users see new content immediately.

### Endpoints
*   `GET /api/v1/blog`: List posts with Redis caching and filters for language/status.
*   `POST /api/v1/blog`: Create a new post and invalidate blog list cache.
*   `GET /api/v1/blog/[slug]`: Retrieve a single post with author details and comment counts.
*   `PATCH /api/v1/blog/[slug]`: Update an existing post.
*   `DELETE /api/v1/blog/[slug]`: Remove a post.
*   `GET /api/v1/blog/[slug]/comments`: Fetch a threaded comment tree for a post.
*   `POST /api/v1/blog/[slug]/comments`: Add a comment or reply to a post.
## 4. Content Management & Editing

### Tiptap Editor
The CMS uses **Tiptap**, a headless framework-agnostic rich-text editor.
*   **Formatting:** Supports standard formatting (Bold, Italic, etc.), Headings, Code Blocks with syntax highlighting, and custom extensions like Spoilers.
*   **i18n:** Posts are language-aware (`en`, `es`, `ar`). The editor handles text direction (`dir="auto"`) for mixed-language content.
*   **SEO:** Every post has a unique slug and a summary field for meta tags.

### Management UI
Authorized users (Admin/Editor) can manage content through:
*   `GET /blog`: List all posts with language filtering.
*   `GET /blog/create`: Interface to create a new post with real-time **Review Mode**.
*   `GET /blog/edit/[slug]`: Interface to modify existing posts.

#### Advanced Editing Features
*   **Data Caching:** Uses Nuxt `useState` to cache post data when viewing a post. If the author decides to edit, the system retrieves data from the cache first, eliminating redundant database hits.
*   **Change Detection:** The system compares the current form state with the initial data. If no changes are detected, it prevents unnecessary API calls and informs the user.
*   **Partial Patching:** On save, the system calculates the delta between original and current states. Only modified fields are sent to the `PATCH` endpoint, ensuring efficient and surgical updates.

---

## 5. Testing & Maintenance

### Automated Seeding
The system includes a Nitro plugin (`server/plugins/seed-blog.ts`) that checks the database on startup. If no posts are found, it creates a "Welcome" testing post. 
*   **Non-blocking:** The seeding process runs in the background to ensure that database connectivity issues don't "freeze" the server during startup.
*   **Failsafe:** It utilizes internal timeouts to avoid blocking the Nitro lifecycle.

### Connection Management
To handle PostgreSQL's connection limits and prevent leaks during development (HMR):
*   **Singleton Pool:** The PostgreSQL connection pool is managed as a singleton in development.
*   **Timeouts:** Explicit connection timeouts (10s) are configured to prevent stalled requests from hanging the server process.

### Backend (API)
1.  **Auth Sync:** Log in with a MongoDB user. Hit `/api/v1/test` to ensure the user is synced to PostgreSQL.
2.  **Create Post:** Send a `POST` request to `/api/v1/blog` with a valid JSON body (see examples below).
3.  **Get Post:** Access `/api/v1/blog/[slug]` to retrieve the created post.
4.  **Comments:** Send a `POST` to `/api/v1/blog/[slug]/comments` and verify it appears in the `GET` response.

### Frontend (UI)
1.  **Creation Flow:** Navigate to `/blog/create`. Fill in the title, slug, and content.
2.  **Review Mode:** Click the **Review** button to see how the post will look to readers.
3.  **Publication:** Check "Publish immediately" and click **Create Post**. You should be redirected to the live post.
4.  **i18n:** Create posts in different languages (en, es, ar) and verify the `/blog` list filters them correctly.
5.  **RTL Check:** Create an Arabic post and ensure the text direction is correctly handled in both editor and preview.

---

## 6. SEO & Dynamic Discovery
*   **Nuxt SEO:** Integrated with `@nuxtjs/seo` for automatic meta tag generation and sitemap management.
*   **Takumi OG Images:** Uses the **Takumi** renderer for generating high-fidelity OpenGraph images dynamically based on post content (Title, Summary, Tags).
*   **Unicode Slugs:** Slugs support full Unicode characters (including Arabic). The system automatically generates sanitized, SEO-friendly Unicode slugs from titles while maintaining standard URL encoding.
*   **Dynamic Sitemap:** The `nuxt.config.ts` is configured to dynamically fetch all published post slugs from the PostgreSQL database, ensuring search engines always have an up-to-date list of content without requiring a site rebuild.
*   **View Tracking:** View counts are tracked asynchronously on each GET request for published posts to avoid blocking the main response thread.

## 7. Real-time Interactions

*   **Commenting:** The commenting system supports nested replies (threads).
*   **Socket.io Integration:** Real-time updates for new comments or view counts can be added via the existing Socket.io infrastructure.

## 8. i18n Strategy

The CMS supports internationalization out-of-the-box:
*   Posts are tagged with a `language` field.
*   Frontend filters posts based on the current user locale.
*   The Tiptap-based `BlogContent.vue` component handles RTL support for Arabic content.

## 9. API Usage Examples

### Creating a Post
```bash
curl -X POST http://localhost:3000/api/v1/blog \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My New Post",
    "slug": "my-new-post",
    "content": "<h1>Hello World</h1><p>This is a Tiptap post.</p>",
    "published": true,
    "language": "en",
    "summary": "A brief overview of the post for SEO."
  }'
```

### Adding a Comment
```bash
curl -X POST http://localhost:3000/api/v1/blog/my-new-post/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great article!"
  }'
```

---
*Last Updated: June 3, 2026*
