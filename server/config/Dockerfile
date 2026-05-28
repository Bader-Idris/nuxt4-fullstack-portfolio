# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────
# Stage 1: Minimal base — shared toolchain only
# ─────────────────────────────────────────────
FROM node:24.16-alpine AS base
WORKDIR /app
# Install pnpm via corepack (no npm global bloat)
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─────────────────────────────────────────────
# Stage 2: Install dependencies via pnpm
# ─────────────────────────────────────────────
FROM base AS deps
# Native build tools needed ONLY for sharp, bcryptjs, pg native bindings etc.
RUN apk add --no-cache python3 make g++ libpng-dev libjpeg-turbo-dev
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY server/prisma/ ./server/prisma/
ARG CACHEBUST=0
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist --force

# ─────────────────────────────────────────────
# Stage 3: Build the Nuxt application
# ─────────────────────────────────────────────
FROM base AS builder
# Need build tools here too for any native postinstall scripts triggered by npm run build
RUN apk add --no-cache python3 make g++ libpng-dev libjpeg-turbo-dev
COPY --from=deps /app/node_modules ./node_modules

# ktx-tools provides the `toktx` binary used by scripts/compress.ts at build time.
# It is NOT needed at runtime — we install it here in the builder stage only.
# On Alpine, ktx-tools is available in the community repository.
# RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community ktx-tools || \
#     echo "[Dockerfile] WARNING: ktx-tools not found in Alpine repos — compress.ts will fall back to WebP for textures."

COPY . .

ARG PORT=3000
ENV PORT=${PORT}
ENV NUXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=16384"

# npm runs the build — pnpm-installed node_modules are already in place
RUN npm run build

# ─────────────────────────────────────────────
# Stage 4: Lean production runner
# ─────────────────────────────────────────────
FROM node:24.16-alpine AS runner
WORKDIR /app

# vips: required at runtime by sharp for server-side image transforms
# dumb-init: proper PID 1 signal handling
RUN apk add --no-cache vips dumb-init

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

RUN chown -R node:node /app/.output
USER node

ARG PORT=3000
ENV PORT=${PORT}
ENV NUXT_TELEMETRY_DISABLED=1
EXPOSE ${PORT}

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]