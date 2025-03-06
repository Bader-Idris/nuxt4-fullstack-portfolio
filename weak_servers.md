# info

If you're trying to build the app in a weak server with 1GB of RAM, 1GB of CPU, and 25GBs of SSD, this is the solution to be able to build it in the server:

```sh
# You have to swap storage to rent to rams, via:
sudo fallocate -l 4G /swapfile # if fallocate fails, use:
# sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile # this is to format it as swap
sudo swapon /swapfile # this activates it
```

Verify the swap is active:

```sh
free -h
# Output should show "Swap" with ~4GB
```

> make it Permanent

to save your changes for further shutdowns and reboots, run:

```sh
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

We can optionally adjust **swappiness** (how aggressively the system uses swap).
For a server, set it to `10` (prefer RAM) or `60` (default)

```sh
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

Now, it's better to run the build command with this variable:

```sh
NODE_OPTIONS=--max-old-space-size=4096 bun run build
```

> Now the building process does not get killed due to leap issues! 🎆🎇
