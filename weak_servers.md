# Building on Weak Servers

If you are attempting to build the application on a server with limited resources (1GB of RAM, 1GB of CPU, and 25GB SSD), follow the instructions below to successfully complete the build process.

## Configuring Swap Space

To enhance the server's memory capacity, you can create a swap file. Execute the following commands:

```bash
# Create a swap file of 4GB
sudo fallocate -l 4G /swapfile

# If fallocate fails, use the following command instead:
# sudo dd if=/dev/zero of=/swapfile bs=1M count=4096

# Set the correct permissions for the swap file
sudo chmod 600 /swapfile

# Format the swap file
sudo mkswap /swapfile

# Activate the swap file
sudo swapon /swapfile
```

### Verify Active Swap

To confirm that the swap is active, run:

```bash
free -h
```

You should see an output indicating "Swap" with approximately 4GB.

## Making Swap Permanent

To ensure that the swap file persists across reboots, add it to your `/etc/fstab`:

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Adjusting Swappiness

You can optionally adjust the **swappiness** setting, which determines how aggressively the system uses swap space. For servers, it is recommended to set it to `10` (favoring RAM) or keep it at the default value of `60`.

To set swappiness to `10`, run:

```bash
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Running the Build Command

To optimize the build process, it is advisable to run the build command with the following environment variable:

```bash
NODE_OPTIONS=--max-old-space-size=4096 bun run build
```

> **Note:** This configuration helps prevent the build process from being terminated due to memory limitations. 🎆🎇
