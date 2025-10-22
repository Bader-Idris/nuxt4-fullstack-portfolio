# This is the custom nginx Dockerfile that fetches the static files from the Nuxt build output
# and serves them using nginx.
FROM baderidris/nuxt-portfolio:3.2.4-testing-prod AS builder

FROM nginx:stable-alpine
COPY --from=builder .output/public /var/www/html
COPY ./server/config/nginx/nginx_with_certbot_secured.conf /etc/nginx/conf.d/secured.conf:ro
COPY ./server/config/nginx/for_server_exclusively.html /usr/share/nginx/html/index.html:ro
COPY ./server/config/mailserver/mta-sts.txt /var/www/html/.well-known/mta-sts.txt:ro
