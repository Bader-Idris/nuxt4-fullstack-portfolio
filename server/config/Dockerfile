FROM node:22.17.0-alpine3.21
# FROM node:22.14.0

# TODO: no need to building process and installing, because we handle that manually in the root level of the droplet itself, read the README.md file for weak servers handling!

# Install Python and build tools for native dependencies
# RUN apt-get update && apt-get install -y \
#   python3 \
#   build-essential \
#   && rm -rf /var/lib/apt/lists/*

# Install Python and build tools for native dependencies (Alpine version)
RUN apk add --no-cache python3 make g++ 

# Set the working directory
WORKDIR /app
# COPY package.json .

# Copy package.json and bun.lockb (if it exists)
COPY ./.output/server/package.json .
ARG NODE_ENV
# RUN if [ "$NODE_ENV" = "development" ]; \
#   then npm install; \
#   else npm install --only=production; \
#   fi
# RUN npm install
# RUN npm rebuild --arch=x64 --platform=linux --libc=musl sharp
# COPY . ./
ENV PORT 3000
EXPOSE $PORT
CMD ["npm", "start"]
