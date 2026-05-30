# This is the custom nginx Dockerfile that fetches the static files from the Nuxt build output
# and serves them using nginx.
# FROM baderidris/nuxt-portfolio:3.3.4-production-slim AS builder
FROM baderidris/nuxt-portfolio:3.4.0-testing-prod AS builder

FROM nginx:stable-alpine
COPY --from=builder /app/.output/public /var/www/html
# Debug: Verify copied assets during build

# RUN [ "ls", "-R", "/var/www/html" ]

COPY ./server/config/nginx/nginx_with_certbot_secured.conf /etc/nginx/conf.d/secured.conf
COPY ./server/config/nginx/for_server_exclusively.html /usr/share/nginx/html/index.html
COPY ./server/config/mailserver/mta-sts.txt /var/www/html/.well-known/mta-sts.txt
