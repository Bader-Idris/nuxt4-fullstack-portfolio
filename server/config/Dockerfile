# Stage 1: Base image with bun
# FROM oven/bun:latest AS base
FROM node:22.20-alpine AS base
# FROM oven/bun:alpine AS base

# Install Python and build tools for native dependencies
# RUN apt-get update && apt-get install -y \
#   python3 \
#   build-essential \
#   && rm -rf /var/lib/apt/lists/*

# Update npm to the latest version for performance and security benefits
RUN npm install -g npm@latest

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Stage 2: Install dependencies
# This layer is cached as long as package.json doesn't change
FROM base AS deps
COPY package*.json bun.lock* ./
# RUN bun install
RUN npm install --force


# Stage 3: Build the Nuxt application
# This layer is cached as long as source code doesn't change
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules

COPY . .
# RUN bun run build
RUN npm run build

# FROM base AS runner
# FROM node:22.19.0-alpine3.21 AS runner
# FROM base AS runner TODO: required for stability
FROM node:22.20.0-alpine AS runner

# Install Python and build tools for native dependencies (Alpine version)
# RUN apk add --no-cache python3 make g++

# Copy only the necessary production dependencies
COPY --from=deps /app/node_modules ./node_modules
# Copy the built output from the builder stage

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Expose the port and define the command to run the app
ENV PORT 3000
EXPOSE $PORT
# EXPOSE 3000
# CMD [ "node", ".output/server/index.mjs" ]
CMD ["npm", "start"]
# CMD ["bun", "run", "start"]
