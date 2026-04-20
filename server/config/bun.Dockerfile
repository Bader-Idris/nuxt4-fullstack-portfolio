# Stage 1: Base image with bun
FROM oven/bun:1.3.13-alpine AS base

# Install Python and build tools for native dependencies (Alpine version)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Stage 2: Install dependencies
# This layer is cached as long as package.json doesn't change
FROM base AS deps
COPY package*.json bun.lock* ./

# RUN --mount=type=cache,target=/root/.npm bun install
# check https://bun.com/docs/guides/ecosystem/docker
RUN bun install --frozen-lockfile

# Stage 3: Build the Nuxt application
# This layer is cached as long as source code doesn't change
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules

COPY . .

# TODO: read https://nitro.build/config
ENV NITRO_PRESET=bun
RUN bun --smol run build

# Stage 4: Production runner
# Nuxt/Nitro produces a standalone server with bundled dependencies
FROM oven/bun:1.3.13-alpine AS runner

# RUN apk add --no-cache vips
# WORKDIR /app

# Copy only the necessary production dependencies
# COPY --from=deps /app/node_modules ./node_modules

# Copy the built output from the builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Run as non-root user for security (per official Bun Docker docs)
USER bun_user

# Set environment variables
ENV PORT=3000
EXPOSE $PORT

# Use ENTRYPOINT for better container control (per official Bun Docker docs)
ENTRYPOINT ["bun", "run", "start"]
