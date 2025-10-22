# This is the custom nginx Dockerfile that fetches the static files from the Nuxt build output
# and serves them using nginx.
FROM baderidris/nuxt-portfolio:3.2.4-testing-prod AS builder

FROM nginx:stable-alpine
COPY --from=builder .output/public /var/www/html
COPY ./server/config/nginx/default.conf /etc/nginx/conf.d/default.conf:ro
