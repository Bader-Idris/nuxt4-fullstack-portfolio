# Stage 1: Base image with node.js
FROM node:24.14-alpine AS base

# Update npm to the latest version for performance and security benefits
RUN npm install -g npm@latest

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Stage 2: Install dependencies
# This layer is cached as long as package.json doesn't change
FROM base AS deps
COPY package*.json bun.lock* ./
RUN --mount=type=cache,target=/root/.npm npm install --force

# Stage 3: Build the Nuxt application
# This layer is cached as long as source code doesn't change
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules

COPY . .
RUN npm run build

# FROM base AS runner TODO: required for stability
FROM node:24.14-alpine AS runner

# Install Python and build tools for native dependencies (Alpine version)
# RUN apk add --no-cache python3 make g++

# Copy only the necessary production dependencies
# COPY --from=deps /app/node_modules ./node_modules
# Copy the built output from the builder stage

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

USER node

# Expose the port and define the command to run the app
ENV PORT 3000
EXPOSE $PORT
# EXPOSE 3000
# CMD [ "node", ".output/server/index.mjs" ]
CMD ["npm", "start"]
