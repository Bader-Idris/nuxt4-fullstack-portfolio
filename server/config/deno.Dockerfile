# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────
# Stage 1: Minimal base
# ─────────────────────────────────────────────
FROM node:24.18-alpine AS base
WORKDIR /app
RUN npm install -g npm@11.17.0
RUN corepack enable && corepack prepare pnpm@latest --activate

RUN --mount=type=cache,target=/var/cache/apk \
    ln -s /var/cache/apk /etc/apk/cache && \
    apk add --no-cache python3 make g++ libpng-dev libjpeg-turbo-dev

# ─────────────────────────────────────────────
# Stage 2: Install dependencies via pnpm
# This stage is ONLY invalidated when package.json or lock files change.
# ─────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache python3 make g++ libpng-dev libjpeg-turbo-dev
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY patches/ ./patches/
COPY server/prisma/ ./server/prisma/

# Set flag to suppress local development tooling hooks
ENV DOCKER_BUILD=true

# Ensure no stale node_modules from build context and handle pnpm conflicts
RUN rm -rf node_modules && \
    mkdir -p /root/.local/share/pnpm/store

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
ARG NODE_ENV=production
ENV PORT=${PORT}
ENV NODE_ENV=${NODE_ENV}
ENV NUXT_TELEMETRY_DISABLED=1
ENV IS_DENO=true
ENV NODE_OPTIONS="--max-old-space-size=16384"

RUN echo "Cache bust: $CACHEBUST" && \
    if [ "$NODE_ENV" = "production" ]; then \
      npm run build:prod; \
    else \
      npm run build; \
    fi

# ── Surgical pruning ─────────────────────────────────────────────────────────
RUN find .output/server/node_modules/@img -mindepth 1 -maxdepth 1 -type d \
    ! -name 'sharp-linuxmusl-x64' \
    ! -name 'sharp-libvips-linuxmusl-x64' \
    ! -name 'colour' \
    -exec rm -rf {} +

# @resvg: keep only the musl-x64 binary + the main package (has the JS entry point)
# RUN find .output/server/node_modules/@resvg -mindepth 1 -maxdepth 1 \( -type d -o -type l \) \
#     ! -name 'resvg-js' \
#     ! -name 'resvg-js-linux-x64-musl' \
#     -exec rm -rf {} +
# saves ~200MB

RUN find .output/server/node_modules/@takumi-rs -mindepth 1 -maxdepth 1 -type d \
    ! -name 'core' \
    ! -name 'helpers' \
    ! -name 'core-linux-x64-musl' \
    -exec rm -rf {} +

# make sure this doesn't conflict with ai-ready generated md files
# RUN find .output/server/node_modules -type f \( \
#     -name '*.md' \
#     -o -name 'CHANGELOG*' \
#     -o -name 'LICENSE*' \
#     -o -name '*.d.ts' \
#     -o -name '*.d.ts.map' \
#     -o -name '*.map' \
#     \) -delete 2>/dev/null || true

# RUN find .output/server/node_modules -type d \( \
#     -name '__tests__' \
#     -o -name 'docs' \
#     -o -name 'example' \
#     -o -name 'examples' \
#     \) -exec rm -rf {} + 2>/dev/null || true

# ─────────────────────────────────────────────
# Stage 4: Deno Runtime
# ─────────────────────────────────────────────
FROM denoland/deno:alpine-2.9.0 AS runner
WORKDIR /app
RUN apk add --no-cache vips dumb-init
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Copy missing runtime deps that Nitro left as externals
COPY --from=builder /app/node_modules/ofetch ./output/server/node_modules/ofetch
COPY --from=builder /app/node_modules/defu ./.output/server/node_modules/defu
COPY --from=builder /app/node_modules/ufo ./.output/server/node_modules/ufo

# RUN echo '{"imports":{"url":"node:url","path":"node:path","fs":"node:fs","os":"node:os","crypto":"node:crypto","stream":"node:stream","http":"node:http","https":"node:https","events":"node:events","buffer":"node:buffer","util":"node:util","assert":"node:assert","querystring":"node:querystring","zlib":"node:zlib","net":"node:net","tls":"node:tls"}}' > /app/deno.json
RUN chown -R deno:deno /app/.output
USER deno
ARG PORT=3000
ENV PORT=${PORT}
ENV NUXT_TELEMETRY_DISABLED=1
ENV NITRO_PRESET=deno_server
EXPOSE ${PORT}
ENTRYPOINT ["dumb-init", "--"]
CMD ["deno", "run", \
    "--allow-net", \
    "--allow-env", \
    "--allow-read", \
    "--allow-sys", \
    "--allow-ffi", \
    "--unstable-bare-node-builtins", \
    ".output/server/index.mjs"]

# add above output     "--config", "/app/deno.json", \
