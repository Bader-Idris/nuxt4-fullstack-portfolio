# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────
# Stage 1: Minimal base
# ─────────────────────────────────────────────
FROM node:24.16-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─────────────────────────────────────────────
# Stage 2: Install dependencies via pnpm
# This stage is ONLY invalidated when package.json or lock files change.
# Never pass CACHEBUST here — reinstalling 2600 packages is expensive.
# ─────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache python3 make g++ libpng-dev libjpeg-turbo-dev
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY server/prisma/ ./server/prisma/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist --force

# ─────────────────────────────────────────────
# Stage 3: Build
# CACHEBUST lives here — busts only the build, not the install.
# ─────────────────────────────────────────────
FROM base AS builder
RUN apk add --no-cache python3 make g++ libpng-dev libjpeg-turbo-dev
COPY --from=deps /app/node_modules ./node_modules

# ktx-tools provides the `toktx` binary used by scripts/compress.ts at build time.
# It is NOT needed at runtime — we install it here in the builder stage only.
# On Alpine, ktx-tools is available in the community repository.
# RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community ktx-tools || \
#     echo "[Dockerfile] WARNING: ktx-tools not found in Alpine repos — compress.ts will fall back to WebP for textures."

COPY . .

ARG PORT=3000
# CACHEBUST only forces a rebuild of the npm run build step and everything after.
# deps stage above is untouched — pnpm install stays cached.
ARG CACHEBUST=0
ENV PORT=${PORT}
ENV NUXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=16384"

# Cache mount for Nuxt/Vite's internal build cache (.nuxt/cache, node_modules/.cache)
# This persists across builds so incremental builds stay fast.
# CACHEBUST arg invalidates this RUN layer in Docker's layer cache,
# but the --mount=type=cache is separate from layer cache and always persists.
RUN --mount=type=cache,target=/app/node_modules/.cache \
    --mount=type=cache,target=/root/.nuxt-cache \
    echo "Cache bust: $CACHEBUST" && \
    npm run build

# ── Surgical pruning ─────────────────────────────────────────────────────────
RUN find .output/server/node_modules/@img -mindepth 1 -maxdepth 1 -type d \
    ! -name 'sharp-linuxmusl-x64' \
    ! -name 'sharp-libvips-linuxmusl-x64' \
    ! -name 'colour' \
    -exec rm -rf {} +

# @resvg: keep only the musl-x64 binary + the main package (has the JS entry point)
RUN find .output/server/node_modules/@resvg -mindepth 1 -maxdepth 1 \( -type d -o -type l \) \
    ! -name 'resvg-js' \
    ! -name 'resvg-js-linux-x64-musl' \
    -exec rm -rf {} +
# saves ~200MB

# ─────────────────────────────────────────────
# Stage 4: Lean production runner
# ─────────────────────────────────────────────
FROM node:24.16-alpine AS runner
WORKDIR /app
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