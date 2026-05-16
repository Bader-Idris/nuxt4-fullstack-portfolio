# Stage 1: Base image with node.js
FROM node:24.15-alpine AS base

# Update npm to the latest version for performance and security benefits
RUN npm install -g npm@latest

# Install build dependencies for native modules and asset compression tools
RUN apk add --no-cache python3 make g++ libpng-dev libjpeg-turbo-dev

WORKDIR /app

# Stage 2: Install dependencies
# This layer is cached as long as package.json doesn't change
FROM base AS deps
COPY package*.json bun.lock* ./

ARG CACHEBUST=0

# We force install to ensure all peer dependencies are handled correctly in the alpine environment
RUN --mount=type=cache,target=/root/.npm npm install --force

# # Clean install + clear cache for maximum reliability
# RUN --mount=type=cache,target=/root/.npm \
#     rm -rf node_modules && \
#     npm ci --force && \
#     npm cache clean --force

# Stage 3: Build the Nuxt application
# This layer is cached as long as source code doesn't change
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules

# ktx-tools provides the `toktx` binary used by scripts/compress.ts at build time.
# It is NOT needed at runtime — we install it here in the builder stage only.
# On Alpine, ktx-tools is available in the community repository.
# RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community ktx-tools || \
#     echo "[Dockerfile] WARNING: ktx-tools not found in Alpine repos — compress.ts will fall back to WebP for textures."

COPY . .

# Ensure production environment is set for optimal build and compression
# ARG NODE_ENV=production
ARG PORT=3000
# ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV NUXT_TELEMETRY_DISABLED=1

# Increase memory limit for the build process to prevent OOM errors
# Architecture: Leverages high host memory (32GB) to allow memory-intensive Nuxt builds to succeed.
# Product: Ensures CI/CD reliability and prevents deployment bottlenecks.
ENV NODE_OPTIONS="--max-old-space-size=16384"

RUN npm run build

# Stage 4: Production runner — lean image, no build tools needed
FROM node:24.15-alpine AS runner

WORKDIR /app

RUN apk add --no-cache \
    vips \
    dumb-init

# Copy the built output from the builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

RUN chown -R node:node /app/.output
# Switch to non-root user for security
USER node

ARG PORT=3000
ENV PORT=${PORT}
# ENV NODE_ENV=production
ENV NUXT_TELEMETRY_DISABLED=1

EXPOSE ${PORT}

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
