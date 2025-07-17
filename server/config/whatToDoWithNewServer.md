# intro

> You have rent a server/droplet or what ever its name is, now what?

1. **update the system**: `sudo apt update && sudo apt full-upgrade -y`
2. **add a new user**: `sudo useradd -m -s /bin/bash <username>`
3. **set a password for the new user**: `sudo passwd <username>`
4. **add the new user to the sudoers file**: `echo "<username> ALL=(ALL:ALL) ALL" | sudo tee -a /etc/sudoers`
5. *Don't Do this step*, it freezes digitalOcean's droplets even for consoles!! **secure ssh**: `sudo nano /etc/ssh/sshd_config` and change `PermitRootLogin yes` to `PermitRootLogin no`
6. **install ufw**: `sudo apt install ufw`
7. **allow ssh and http**: `sudo ufw allow ssh` and `sudo ufw allow http`
8. **enable ufw**: `sudo ufw enable`
9. **install docker**: `sudo apt install docker.io`
10. **install docker compose**: `sudo apt install docker-compose`
11. **install the project repo**: `git clone <your-project.git>`
12. **add docker group to the new user**: `sudo usermod -a -G docker <username>`
13. **make sure docker is installed and running**: `docker run hello-world`
14. **run a.prod-certbot.yml**: `docker compose -f ./b.prod-certbot.yml up -d`
15. **stop a.prod-certbot.yml**: `docker compose -f ./b.prod-certbot.yml stop`
16. **run b.prod-certbot.yml**: `docker compose -f ./b.prod-certbot.yml up -d`
17. **force certbot to renew certs to get rid of --staging flag**: `docker compose -f ./b.prod-certbot.yml run certbot renew --force-renewal`
18. **add certification renewal shell file to corntab**: `crontab -e`
19. **add the file in server/config/nginx/ssl_renew.prod.sh**
20. **prevent DDoS attacks using fail2ban, and other common tools**, the tool can mitigate brute-force attacks, and more!

> You are now ready to go!

## how to section

install docker, the easiest and fastest way is to get the file from the official site [here](https://get.docker.com/)

install fail2ban: `sudo apt install fail2ban`, it'll be disabled by default, due to undesired configs, use this to check its status `systemctl status fail2ban.service`, and install `pyinotify` using: `sudo apt install python3-pyinotify`, it's fast for fail2ban to monitor logs

```sh
cd /etc/fail2ban
head -20 jail.conf # this is the default config file
```

based on the tutoring of the file, we will add our own config file to fail2ban

```sh
# we can separate our configs to group them in jail.d/ or we can use `jail.local` file for all configs
sudo cp jail.conf jail.local # to start modifying our custom file
# make sure you're at: /etc/fail2ban
sudo nano jail.local
```

initially two sections are important for us: [DEFAULT] && [sshd]

these are common configs: `bantime`, `findtime`, `maxretry` ;these two `[findtime, maxretry]` are saying: I'm a `rate limiter`, with **window** of 10 minutes and 5 **attempts** within

to send email alerts check these:

```sh
[DEFAULT]
. . .
destemail = root@localhost
sender = root@<fq-hostname>
mta = sendmail
. . .
```

🔴use postfix container for it!🔴

banned ips will be isolated in our firewall configs until the ban time expires `by default`, could be changed though, check the section of set of `action_<followed-by-alert-type>` as: 🔴`{action_mw, action_mwl, action_xarf, action_cf_mwl}`🔴

```sh
[DEFAULT]
. . .
action = $(action_)s
. . .

# it's configured above this line
```

check the full tutorial, [here](https://www.digitalocean.com/community/tutorials/how-to-protect-ssh-with-fail2ban-on-ubuntu-22-04#individual-jail-settings);

individual services are included in a header like this: `[ sshd ]`, they require being enabled with: `enabled = true` under their header, by default SSH is enabled, and others are not!

Two important settings are: `filter` and `logpath`, to set the logging level and its path; `filter` is a reference to this dir: `/etc/fail2ban/filter.d` and its configs, OMG that's A LOT, nginx included 😍, it has 4 files: `{nginx-bad-request.conf,nginx-botsearch.conf,nginx-http-auth.conf,nginx-limit-req.conf}`.

back to our `/etc/fail2ban/jail.local` file: this is the nginx section though: `[nginx-http-auth]`, so we can do this:

```sh
# if you have too many brute-force attacks on your nginx, use this!
[nginx-http-auth]
enabled = true
# make it's logpath the error one, not the access!

# then in our shell:
sudo systemctl enable fail2ban
# then start it manually for this time, as other systemctl service, should be enabled for future booting, and started for current one
sudo systemctl start fail2ban
# verify with:
sudo systemctl status fail2ban
# sudo service fail2ban restart
```

I'll install it in the host, and bind nginx logs of `/var/log/nginx` to same path in the hosting machine, so, we need to do this: `mkdir -p /var/log/nginx`, then bind the logs to be able to connect fail2ban to it!

```yaml
      # create this dir to bind containerized nginx logs for fail2ban issues
      - /var/log/nginx:/var/log/nginx
```

🔴================testing================🔴
create this file: `/etc/fail2ban/jail.d/nginx-docker.conf`

and this these configs to it:

```ini
[nginx-http-auth]
enabled = true
port = 80,443
logpath = /var/log/nginx/*error.log
maxretry = 3
findtime = 3600
bantime = 86400
action = docker-iptables-multiport[name=nginx, port="80,443", protocol=tcp]

[nginx-ddos]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/access.log
findtime = 60
maxretry = 100
bantime = 3600
action = %(action_mwl)s
```

then create a custom docker action file: `/etc/fail2ban/action.d/docker-iptables-multiport.conf`

```ini
[Definition]
actionstart = iptables -N f2b-<name>
              iptables -A f2b-<name> -j RETURN
              iptables -I DOCKER-USER -p <protocol> -m multiport --dports <port> -j f2b-<name>

actionstop = iptables -D DOCKER-USER -p <protocol> -m multiport --dports <port> -j f2b-<name>
             iptables -F f2b-<name>
             iptables -X f2b-<name>

actioncheck = iptables -n -L DOCKER-USER | grep -q 'f2b-<name>[ \t]'

# Add connection rate limiting
actionban = iptables -I f2b-<name> 1 -s <ip> -m hashlimit \
           --hashlimit-above 100/sec --hashlimit-burst 500 \
           --hashlimit-mode srcip --hashlimit-name ddos-<name> -j DROP


actionunban = iptables -D f2b-<name> -s <ip> -j DROP
```

to view new rules we can use: `sudo iptables -S` and with grep as: `sudo iptables -S | grep f2b`
🔴=======================================🔴

---

> [!WARNING]  
> SYN Flood is a critical ugly DDoS attack

To protect from this type of attack, activate it from `/etc/sysctl.conf` file, and add the filter in `fail2ban`

```sh
# activate/add these settings in /etc/sysctl.conf:
# Enable SYN cookies to handle SYN floods
net.ipv4.tcp_syncookies = 1

# Reduce the time connections stay in SYN_RECV state
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 2

# Increase the backlog queue for incoming connections
net.ipv4.tcp_max_syn_backlog = 4096

# Limit the number of orphaned connections (helps with resource exhaustion)
net.ipv4.tcp_max_orphans = 16384

# Enable TCP window scaling for better performance under load
net.ipv4.tcp_window_scaling = 1

# Drop spoofed packets and protect against source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Enable protection against IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Limit the rate of ICMP packets (optional, to mitigate ICMP-based floods)
net.ipv4.icmp_echo_ignore_all = 0
net.ipv4.icmp_ratelimit = 1000
```

Then apply changes: `sudo sysctl -p`
