# This is the custom nginx Dockerfile that fetches the static files from the Nuxt build output
# and serves them using nginx
ARG BUILDER_IMAGE=baderidris/nuxt-portfolio:3.5.0-testing-prod
# ARG BUILDER_IMAGE=baderidris/nuxt-portfolio:3.5.0-testing-deno-prod
# ARG BUILDER_IMAGE=baderidris/nuxt-portfolio:3.5.0-testing-bun-prod
FROM ${BUILDER_IMAGE} AS builder
# FROM baderidris/nuxt-portfolio:3.5.0-production-slim AS builder

FROM nginx:stable-alpine
# Debug: Verify copied assets during build
# RUN [ "ls", "-R", "/var/www/html" ]
COPY --from=builder /app/.output/public /var/www/html
# COPY ./server/config/nginx/default.conf /etc/nginx/conf.d/default.conf
