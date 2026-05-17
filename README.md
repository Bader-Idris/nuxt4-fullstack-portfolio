# Portfolio Full-Stack Application

<div align="right">

**Language:**
<a href="./README.md">
<img src="https://flagcdn.com/16x12/us.png" alt="English" width="16" height="12">
English
</a> |
<a href="./README.ar.md">
<img src="https://flagcdn.com/16x12/sa.png" alt="العربية" width="16" height="12">
العربية
</a> |
<a href="./README.es.md">
<img src="https://flagcdn.com/16x12/es.png" alt="Español" width="16" height="12">
Español
</a>

</div>

[![project img](https://raw.githubusercontent.com/Bader-Idris/nuxt4-fullstack-portfolio/26e3f86aaa361639f25b0ce933df59ea982e5e41/client/public/thumbnail.webp)](https://baderidris.com)

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
- [Mail Server](#mail-server)
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

# It's recommended to rename the project directory to 'portfolio' if you didn't use the previous command
sudo mv nuxt4-fullstack-portfolio portfolio
cd portfolio
```

### Installing Dependencies

> [!IMPORTANT]  
> Ensure you have Bun installed before running these commands.

```bash
bun install
```

### Database Migrations

> [!IMPORTANT]
> **Database migration is critical for the first build!** It's intentionally separated from the main build process to give you control.

Before running the application, ensure your database schema is up-to-date by running the Prisma migrations:

```bash
bunx prisma migrate deploy
bunx prisma generate
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

### mongoDB cli v8 commands

```js
show dbs
// your MONGO_DB_NAME
use MONGO_DB_NAME
show collections
// for instance users collection
db.getCollection("users").find()
// to find in collections:
db.users.find({ field: "value" }) // such as
db.users.find({ "email": "contact@baderidris.com" })

// to modify the role based on email do:
db.users.updateOne(
  { "email": "contact@baderidris.com" },
  { $set: { "role": "admin" } }
)
// to delete do:
db.users.deleteOne({ "email": "contact@baderidris.com" })
```

### migration from mongoDB 4.4.29 to 8.2.5 command

```sh
# after you've done the backup command with:
docker exec mongo sh -c 'mongodump --archive --gzip -u <Mongo_user> -p <Mongo_password> --authenticationDatabase admin' > /path/to/your/backup-4.4.gz
# some data will be lose, I've seen that the chats were lost! but not the admin messages!

# Then do this command to restore data: (the best approach is to do sequential versioning as 4 -> 5 -> 6 etc...)

docker exec -i mongo mongorestore \
  --archive --gzip \
  -u <Mongo_user> \
  -p <Mongo_password> \
  --authenticationDatabase admin \
  < /path/to/your/backup-4.4.gz

# and do this for compatibility
docker exec -it mongo mongosh -u <Mongo_user> -p <Mongo_password> --authenticationDatabase admin --eval '
  db.adminCommand({ setFeatureCompatibilityVersion: "8.2", confirm: true });
  db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 });
'

```

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
> **CRITICAL**: The project directory MUST be named `portfolio` for production deployment. The Nginx configuration is hardcoded to look for containers in the `portfolio` directory. If you cloned the repository with a different name, you must either rename the directory to `portfolio` or update the Nginx configuration files accordingly.

## Building for Production

### Standard Build

To build the application for production:

```bash
# make it yours
cp ./compose.prod.test.yaml.example ./compose.prod.test.yaml
# then stop dev if running, and start building!
docker compose -f b.dev.yml down; docker compose -f compose.prod.test.yaml up -d redis postgres mongo ; docker compose -f compose.prod.test.yaml build --progress=plain app; docker compose -f compose.prod.test.yaml up -d
```

> [!CAUTION]  
> Building the application on a server with limited resources is considered a bad practice. For optimal performance and reliability, we strongly recommend using the pre-built Docker image available at [Docker Hub](https://hub.docker.com/r/baderidris/nuxt-portfolio) instead of building from source on your server. If you must build on a weak server, please follow the instructions in the [weak_servers.md](./weak_servers.md) file to ensure a successful build process.

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

To run properly and prevent the mobile app from crashing, you must have the file `android/app/google-services.json`. Check the [Capacitor documentation](https://capacitorjs.com/docs/apis/push-notifications) and [Firebase documentation](https://firebase.google.com/docs/android/setup#add-config-file).

### Android Development Setup

To build the Android app, ensure you have [Android Studio](https://developer.android.com/studio/install) installed and set these environment variables:

- `ANDROID_HOME`
- `CAPACITOR_ANDROID_STUDIO_PATH`

> [!CAUTION]  
> Restart your shell session after adding the environment variables.

### Android 15+ Compatibility Fix

> [!CAUTION]  
> For Android 15+ compatibility, after creating the Android project, you need to add the following line to every style section with `Theme.AppCompat.*` in the file `android/app/src/main/res/values/styles.xml` to fix the overlay=true bug in Capacitor:

```xml
<item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
```

This ensures proper display behavior on Android 15+ devices when using Capacitor with `overlay=true` settings.

You can check out the [issue here](https://github.com/ionic-team/capacitor-plugins/issues/2350#issuecomment-2904401405)

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

Make sure to update the domain name `baderidris.com` in the `b.dev.yml` file and associated configuration files with your own domain name.

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

After the initial deployment, you will need to force Certbot to renew the certificates to remove the `--staging` flag. It is recommended to create a separate compose file for this purpose and for future renewals.

## Mail Server

The project includes a fully functional mail server setup running at `mail.baderidris.com`. It is built using Docker Mailserver and supports DKIM, SPF, DMARC, and MTA-STS.

For detailed instructions on how to configure and manage the mail server, including DNS records and user management, please refer to the [Mail Server Setup Script](./server/config/mailserver/whatToDoOnMailserver.sh) and the [detailed documentation](./docs/README.md).

## Security

To enhance the security of your application and prevent common attacks such as DDoS, Fail2Ban has been implemented.

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

- **Weak Server Builds**: Refer to [weak_servers.md](./weak_servers.md) for guidance on optimizing builds for limited resources
- **Docker Issues**: Ensure Docker and Docker Compose are properly installed and running
- **Environment Variables**: Make sure all required environment variables are properly configured

## Community

Join our community discussions! Feel free to communicate with the maintainer and other community members on [GitHub Discussions](https://github.com/Bader-Idris/nuxt4-fullstack-portfolio/discussions).

---

Thank you for using the Portfolio Full-Stack Application! If you have any questions or need further assistance, feel free to reach out.