# 🔌 Fixing Windows TCP Port Exclusions (Hyper-V / WinNAT)

If your development servers (like Nuxt on `3000`, Nginx on `5000`, or APIs on `8000` / `8080`) are failing to bind to their default ports and starting on random ports instead, this is usually caused by **Windows NAT (WinNAT) / Hyper-V dynamic port reservations**.

Windows dynamically reserves blocks of ports for WSL2/Hyper-V, often blocking standard development ports even if no active process is running on them.

---

## 🛠️ How to Move the Dynamic Port Range (Permanent Fix)

To prevent Windows from dynamically reserving ports below `49152` (freeing up ports `3000`, `5000`, `8000`, `8080`, etc.), you can force Windows to use the standard high-range ports for dynamic allocation.

### Step 1: Open Terminal as Administrator
Right-click on **Start** and select **Terminal (Admin)**, **PowerShell (Admin)**, or **Command Prompt (Admin)**.

### Step 2: Set the TCP Dynamic Port Ranges
Run the following commands to restrict dynamic port allocation to start at `49152`:

```cmd
:: Set IPv4 Dynamic Ports
netsh int ipv4 set dynamicport tcp start=49152 num=16384

:: Set IPv6 Dynamic Ports (Optional but recommended)
netsh int ipv6 set dynamicport tcp start=49152 num=16384
```

### Step 3: Restart Windows NAT / Hyper-V Services
To apply the changes immediately without restarting your entire computer, restart the WinNAT service:

```cmd
net stop winnat
net start winnat
```

> [!IMPORTANT]
> A full PC restart is highly recommended after setting the dynamic port ranges to ensure all WSL2 and Hyper-V network components register the new range correctly.

---

## 🔍 How to Check Current Exclusions & Reservations

If you want to verify which ports are currently excluded or inspect your dynamic ranges:

### Show Current Excluded Port Ranges
```cmd
netsh interface ipv4 show excludedportrange protocol=tcp
```

### Show Current Dynamic Port Range
```cmd
netsh int ipv4 show dynamicport tcp
```
*(After applying the fix, this should show `Start Port: 49152` and `Number of Ports: 16384`)*.
