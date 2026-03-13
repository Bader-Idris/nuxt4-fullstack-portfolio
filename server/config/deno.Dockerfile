# ────────────────────────────────────────────────────────────────
# Stage 1: Base (not really used, but keeps structure similar)
# ────────────────────────────────────────────────────────────────
FROM node:24.14-alpine AS base

RUN apk add --no-cache python3 make g++ \
    && npm install -g npm@latest

WORKDIR /app


# ────────────────────────────────────────────────────────────────
# Stage 2: Dependencies (cached layer)
# ────────────────────────────────────────────────────────────────
FROM base AS deps

COPY package*.json ./
# If you use bun.lockb or yarn.lock → copy them too
# COPY bun.lockb* yarn.lock* ./

# Use cache mount for faster repeated builds
RUN --mount=type=cache,target=/root/.npm \
    npm install --force --no-audit --no-fund


# ────────────────────────────────────────────────────────────────
# Stage 3: Build the Nuxt app (still using Node)
# ────────────────────────────────────────────────────────────────
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build → produces .output/ (including server/index.mjs)
RUN npm run build


# ────────────────────────────────────────────────────────────────
# Final stage: Deno runtime only – no Node left
# ────────────────────────────────────────────────────────────────
FROM denoland/deno:alpine-2.7.5 AS runner

WORKDIR /app

USER deno

# Copy the minimal runtime artifacts
COPY --from=builder /app/.output ./.output

# Quick & dirty fix — rewrite bare "url" → "node:url" (and others)
# ! didn't work!
RUN sed -i \
    -e 's|from "url"|from "node:url"|g' \
    -e 's|from "path"|from "node:path"|g' \
    -e 's|from "fs"|from "node:fs"|g' \
    -e 's|from "os"|from "node:os"|g' \
    -e 's|from "process"|from "node:process"|g' \
    .output/server/index.mjs

# Copy package.json only if needed for something at runtime (rare for standalone Nitro)
# COPY --from=builder /app/package.json ./package.json

ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV NITRO_PRESET=deno_server

EXPOSE 3000

CMD ["deno", "run", \
    "--allow-net", \
    "--allow-env", \
    "--allow-read", \
    "--allow-sys", \
    "--allow-ffi", \
    ".output/server/index.mjs"]
