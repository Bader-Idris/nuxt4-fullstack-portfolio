# Building on Resource-Constrained Servers

> [!WARNING]
> **Disclaimer:** Building this application on a server, especially one with limited resources, is strongly discouraged as it can lead to instability and performance issues. For a more reliable and efficient deployment, we highly recommend pulling the pre-built Docker image from Docker Hub.
>
> **Official Docker Image:** [https://hub.docker.com/r/baderidris/nuxt-portfolio](https://hub.docker.com/r/baderidris/nuxt-portfolio)

---

If you must build on a server with limited resources (e.g., 1GB RAM, 1 vCPU, 25GB SSD), these instructions will guide you through the process.

## Prerequisites

- A server with `sudo` privileges.

## Step 1: Configure Swap Space

A swap file can provide the additional memory needed for the build process.

1.  **Allocate a 4GB swap file:**

    ```bash
    # Use fallocate to create the swap file
    sudo fallocate -l 4G /swapfile

    # If fallocate is not available or fails, use dd instead
    # sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
    ```

2.  **Set the correct permissions:**

    ```bash
    sudo chmod 600 /swapfile
    ```

3.  **Set up the swap area:**

    ```bash
    sudo mkswap /swapfile
    ```

4.  **Activate the swap file:**
    ```bash
    sudo swapon /swapfile
    ```

## Step 2: Verify Swap Activation

Confirm that the swap space is active and recognized by the system.

```bash
free -h
```

The output should display a "Swap" line with a total size of approximately 4.0G.

## Step 3: Ensure Swap Persistence (Permanent Swap)

To ensure the swap file is automatically mounted after a system reboot, add it to the `/etc/fstab` file.

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Step 4: Adjust Swappiness (Optional)

Swappiness is a kernel parameter that controls how aggressively the system uses swap space. The value ranges from 0 to 100.

- **`10`**: Recommended for servers. The kernel will favor keeping data in RAM.
- **`60`**: Default value.

To set swappiness to `10`:

```bash
# Set the new value
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Apply the changes without rebooting
sudo sysctl -p
```

## Step 5: Run the Build Command

Finally, run the build command with an increased memory limit for the Node.js process.

```bash
NODE_OPTIONS=--max-old-space-size=4096 bun run build
```

> **Note:** This configuration helps prevent the build from failing due to out-of-memory errors. 🎆🎇