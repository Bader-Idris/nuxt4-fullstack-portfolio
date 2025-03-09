#!/bin/bash

DOCKER="/usr/bin/docker"

cd /home/bader/portfolio || exit 1 # Ensure WORKDIR change succeeds

# If the certificate is not within 30 days of expiration, Certbot skips renewal
# although we can force it to renew using this flag after renew: --force-renewal
$DOCKER compose -f ./b.comp.prod.yaml run certbot renew && $DOCKER compose -f ./b.comp.prod.yaml kill -s SIGHUP nginx
$DOCKER system prune -af

<<COMMENT
# give this file privileges with:
chmod +x /root/personal-project/server/config/nginx/ssl_renew.sh
# use this command to open the crontab root file as specified interval
crontab -e
# then to make it work each day midnoon. Don't use ~ symbol it won't work, put it at latest line
0 12 * * * /root/personal-project/server/config/nginx/ssl_renew.sh >> /var/log/cron.log 2>&1
# it'll log to that file, both stdin and stderr, use tail -n <number_of_lines> <file_path> to get required data
# as this one
tail -n 50 /var/log/cron.log
TODO: when to use --dry-run, and when not??
COMMENT
