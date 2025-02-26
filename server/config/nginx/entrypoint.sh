#!/bin/sh
# Start Fail2Ban service
mkdir -p /var/run/fail2ban
# touch /var/run/fail2ban/fail2ban.sock \
#   /var/lib/fail2ban/fail2ban.sqlite3 \
#   /var/run/fail2ban/fail2ban.pid

fail2ban-server -b -x --logtarget=/var/log/fail2ban.log

# Start NGINX in foreground
exec nginx -g "daemon off;"
