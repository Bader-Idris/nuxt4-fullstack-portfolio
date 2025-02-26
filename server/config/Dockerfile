FROM node:22.14.0-alpine3.21
WORKDIR /app
# COPY package.json .
COPY ./.output/server/package.json .
ARG NODE_ENV
RUN if [ "$NODE_ENV" = "development" ]; \
  then npm install; \
  else npm install --only=production; \
  fi
# COPY . ./
COPY . ./
ENV PORT 3000
EXPOSE $PORT
CMD ["npm", "start"]
