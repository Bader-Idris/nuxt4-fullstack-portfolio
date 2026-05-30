# This is the custom nginx Dockerfile that fetches the static files from the Nuxt build output
# and serves them using nginx
ARG BUILDER_IMAGE=baderidris/nuxt-portfolio:3.4.0-testing-prod
FROM ${BUILDER_IMAGE} AS builder
# FROM baderidris/nuxt-portfolio:3.3.4-production-slim AS builder
# FROM baderidris/nuxt-portfolio:3.2.6-testing-bun-prod AS builder
# FROM baderidris/nuxt-portfolio:3.2.5-testing-deno-prod AS builder

FROM nginx:stable-alpine
# Debug: Verify copied assets during build
# RUN [ "ls", "-R", "/var/www/html" ]
COPY --from=builder /app/.output/public /var/www/html
# COPY ./server/config/nginx/default.conf /etc/nginx/conf.d/default.conf
