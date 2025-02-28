FROM oven/bun:latest

# Install Python and build tools for native dependencies
RUN apt-get update && apt-get install -y \
  python3 \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lockb (if it exists)
COPY ./.output/server/package.json .

# COPY bun.lockb ./

# Install dependencies based on NODE_ENV
ARG NODE_ENV
RUN if [ "$NODE_ENV" = "development" ]; \
  then bun install; \
  else bun install --only=production; \
  fi

# Copy the rest of the application
# COPY . .

# Set environment variables
ENV PORT 3000
EXPOSE $PORT
CMD ["bun", "start"]