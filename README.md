# Portfolio Full-Stack Application

[![project img](https://raw.githubusercontent.com/Bader-Idris/nuxt3-fullstack-portfolio/26e3f86aaa361639f25b0ce933df59ea982e5e41/client/public/thumbnail.webp)](https://baderidris.com)

A comprehensive full-stack portfolio application built with Nuxt 4, featuring real-time communication, authentication, and multi-platform support. For more detailed information, refer to the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [Environment Configuration](#environment-configuration)
- [Docker Setup](#docker-setup)
- [Building for Production](#building-for-production)
- [Mobile Application](#mobile-application)
- [Electron Application](#electron-application)
- [Production Deployment](#production-deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting with this project, ensure you have the following tools installed on your system:

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Bun](https://bun.sh/) JavaScript runtime
- Git version control system

### Installing Prerequisites

**Docker Installation:**
```bash
# Download and run the official Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add current user to docker group (Linux only)
sudo usermod -aG docker $USER
```

> [!IMPORTANT]  
> After installing Docker, it's recommended to follow the [Docker post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/) for enhanced security and performance, including running Docker as a non-root user and configuring additional security options.

**Bun Installation:**
```bash
# Using the official Bun installer
curl -fsSL https://bun.sh/install | bash

# Or using npm
npm install -g bun
```

**Git Installation:**
```bash
# For Ubuntu/Debian
sudo apt install git
# For macOS
xcode-select --install
# For Windows, download from https://git-scm.com/
```

> [!IMPORTANT]  
> After running `usermod -aG docker $USER`, you must log out and log back in or reboot to apply the Docker group changes. For additional post-installation configurations, refer to the [Docker post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/).

## Getting Started

### Cloning the Repository

```bash
git clone https://github.com/Bader-Idris/nuxt4-fullstack-portfolio.git ./portfolio

# It's recommended to rename the project directory to 'portfolio', if you didn't use prior command
sudo mv nuxt4-fullstack-portfolio portfolio
cd portfolio
```

### Installing Dependencies

> [!IMPORTANT]  
> Ensure you have Bun installed before running these commands.

```bash
bun install
```

## Development

### Starting the Development Server

To start the development server, navigate to `http://localhost:3000`:

```bash
bun run dev
```

> [!TIP]  
> For the complete development experience with all backend services, use the Docker setup as described below.

## Environment Configuration

### Core Environment Variables

Create your environment configuration from the example file:

```bash
cp .env.example .env
```

> [!CAUTION]  
> Modify the values in the `.env` file to reflect your specific configuration.

> [!CAUTION]  
> If you are using Windows, ensure that you install Git and use Git Bash for an improved development experience.

### Platform-Specific Environment Files

The project includes environment configuration for different platforms:

- `.env.example` - Main application environment variables
- `.env.electron.example` - Electron application environment variables
- `.env.capacitor.example` - Mobile application environment variables

## Docker Setup

### Development Environment

The project uses Docker Compose for a complete development environment that includes all necessary backend services.

1. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start Docker Services**
   ```bash
   docker compose -f b.dev.yml up -d --build
   ```

3. **Access the Application**
   - Frontend: `http://localhost:3000`
   - Backend services will be automatically configured

> [!WARNING]  
> The application uses intensive backend services and runs best with Docker for a consistent experience.

### Production Environment

> [!IMPORTANT]  
> Ensure Docker is installed on your production machine.

To deploy in production with SSL certificates:

```bash
docker compose -f ./a.prod-certbot.yml up -d --build
```

> [!IMPORTANT]  
> **CRITICAL**: The project directory MUST be named `portfolio` for production deployment. The Nginx configuration is hardcoded to look for containers from the `portfolio` directory. If you cloned the repository with a different name, you must either rename the directory to `portfolio` or update the Nginx configuration files accordingly.

## Building for Production

### Standard Build

To build the application for production:

```bash
bun run build
```

> [!WARNING]  
> If you're trying to build the app on a weak server with limited resources, please follow the instructions in the [weak_servers.md](./weak_servers.md) file to ensure a successful build process.

To locally preview the production build:

```bash
bun run preview
```

### Production Docker Image

> [!TIP]  
> A pre-built Docker image is available on [Docker Hub](https://hub.docker.com/repository/docker/baderidris/nuxt-portfolio/general). You can find instructions on how to pull the image and run it with Docker Compose in the repository's documentation.

## Mobile Application

### Setup

To add Android and iOS support:

```bash
bunx cap add android ios
```

Create the mobile environment file:

```bash
cp .env.capacitor.example .env.capacitor
# Configure the environment variables
```

### Customizing App Icons

To customize your app icons, modify the icons in the `/assets` folder as desired, then run:

```bash
bunx capacitor-assets generate --assetPath "./assets" --ios --android
```

> You can review the configuration requirements in the `assets/requirements.md` file.

### Firebase Push Notifications

> [!WARNING]  
> Required to prevent app crashes with push notifications.

To run properly without crashing the mobile app, you must have the file `android/app/google-services.json`. Check the [Capacitor documentation](https://capacitorjs.com/docs/apis/push-notifications) and [Firebase documentation](https://firebase.google.com/docs/android/setup#add-config-file).

### Android Development Setup

To build the Android app, ensure you have [Android Studio](https://developer.android.com/studio/install) installed and set these environment variables:

- `ANDROID_HOME`
- `CAPACITOR_ANDROID_STUDIO_PATH`

> [!CAUTION]  
> Restart your shell session after adding the environment variables.

## Electron Application

### Setup

To create a production build for Electron:

1. Create the Electron environment file:
   ```bash
   cp .env.electron.example .env.electron
   # Configure the environment variables
   ```

2. Use the following commands to build the Electron application:

   - `bun run build:electron`: Build for the current platform
   - `bun run build:electron:all`: Build for Windows, macOS, and Linux
   - `bun run build:electron:win`: Build for Windows only
   - `bun run build:electron:mac`: Build for macOS only
   - `bun run build:electron:linux`: Build for Linux only
   - `bun run build:electron:dir`: Build in an unpackaged directory for testing

### Domain Configuration

Make sure to update the domain name `baderidris.com` in the `b.dev.yml` file and associated configuration files to your own domain name.

## Production Deployment

### SSL Certificate Management

#### Certificate Renewal Setup

To automate certificate renewals, create a cron job by modifying the paths in the `/server/config/nginx/ssl_renew.sh` file, then add this to your crontab:

```bash
# To edit your crontab, run:
crontab -e

# Add the following line to schedule the renewal script:
0 12 * * * /home/bader/portfolio/server/config/nginx/ssl_renew.sh >> /var/log/cron.log 2>&1
```

> [!TIP]  
> Review the `ssl_renew.sh` file for additional useful tips and configurations.

#### Post-Deployment Certificate Setup

After the initial deployment, you will need to force Certbot to renew certificates to remove the `--staging` flag. It is recommended to create a separate compose file for this purpose and for future renewals.

## Security

To enhance the security of your application and prevent common attacks such as DDoS, we have implemented Fail2Ban.

### Fail2Ban Configuration

The following files are included in the security configuration:

```bash
ls server/config/fail2ban/
# Contains:
# - filter.d directory
# - my_custom_jail.local file
```

### Custom Jails and Filters

Custom jails and filters have been created to allow users to add their configurations after installing the tool. This flexibility helps you tailor the security settings to your specific needs.

## Troubleshooting

### Common Issues

- **Weak Server Builds**: Refer to [weak_servers.md](./weak_servers.md) for build optimization on limited resources
- **Docker Issues**: Ensure Docker and Docker Compose are properly installed and running
- **Environment Variables**: Make sure all required environment variables are properly configured

---

Thank you for using the Portfolio Full-Stack Application! If you have any questions or need further assistance, feel free to reach out.
