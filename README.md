# Nuxt Minimal Starter

[![project img](https://raw.githubusercontent.com/Bader-Idris/nuxt3-fullstack-portfolio/26e3f86aaa361639f25b0ce933df59ea982e5e41/client/public/thumbnail.webp)](https://baderidris.com)

Welcome to the Nuxt Minimal Starter! This repository provides a foundational setup for a full-stack application using Nuxt 3, along with various useful Docker containers. For more detailed information, refer to the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction).

## Table of Contents

- [Setup](#setup)
- [Development Server](#development-server)
- [Production](#production)
- [Mobile Application Setup](#mobile-application-setup)
- [Required Environment Variables](#required-environment-variables)
- [Production Setup](#production-setup)
- [Security](#security)

## Setup

> [!IMPORTANT]  
> Ensure that you have [Bun](https://bun.sh/) installed on your machine.

Install the necessary dependencies:

```bash
bun install
```

## Development Server

To start the development server, navigate to `http://localhost:3000`:

```bash
bun run dev
```

## Production

To build the application for production, run:

```bash
bun run build
```

> [!WARNING]  
> If you're trying to build the app on a weak server with limited resources, please follow the instructions in the [weak_servers.md](./weak_servers.md) file to ensure a successful build process.

To locally preview the production build:

```bash
bun run preview
```

### Docker Configuration

Refer to the `b.dev.yml` file to set up your full-stack application.

1. Create a new `.env` file based on the `.env.example` file and fill in your correct environment variables.
2. Run the following command to start your Docker containers:

```bash
docker compose -f b.dev.yml up -d --build
```

Congratulations! 🎉👏 You are now running your own full-stack production-ready initial version of the project!

### Domain Configuration

Make sure to update the domain name `baderidris.com` in the `b.dev.yml` file and its associated configuration files to your own domain name.

## Mobile Application Setup

To add Android and iOS support, create the respective directories in your project:

```bash
bunx cap add android ios
```

To create your `.env.capacitor` file, rename the existing example file:

```bash
mv .env.capacitor.example .env
```

And add correct environment variables to it!

### Adding App Icons

To customize your app icons, modify the icons in the `/assets` folder as desired, then run:

```bash
bunx capacitor-assets generate --assetPath "./assets" --ios --android
```

> You can review the configuration requirements in the `assets/requirements.md` file.

### Building the Android App

To build the Android app, ensure you have [Android Studio](https://developer.android.com/studio/install) installed on your machine and set the required environment variables.

> [!CAUTION]  
> Restart your shell session after adding the environment variables.

Key environment variables include:

- `ANDROID_HOME`
- `CAPACITOR_ANDROID_STUDIO_PATH`

## Required Environment Variables

> [!CAUTION]  
> Modify the values in the `.env` file to reflect your specific configuration.

To create your `.env` file, rename the existing example file:

```bash
mv .env.example .env
```

> [!CAUTION]  
> If you are using Windows, ensure that you install Git and use Git Bash for an improved development experience.

## Production Setup

> [!IMPORTANT]  
> Ensure that Docker is installed on your machine.

To initiate the production setup, run the following command at the project root level:

```bash
docker compose -f ./a.prod-certbot.yml up -d --build
```

Afterward, you will need to force Certbot to renew certificates to remove the `--staging` flag. It is recommended to create a separate compose file for this purpose and for future renewals.

> [!IMPORTANT]  
> replicas and docker swarm concerns

You have to name the root project dir as `portfolio` or change `server/config/nginx/nginx_with_certbot_secured.conf` file => upstream servers based on your container name?s or outer ip address?es

### Setting Up Cron for Certificate Renewal

To automate certificate renewals, create a cron job by modifying the paths in the `/server/config/nginx/ssl_renew.sh` file, then add this file to your crontab:

```bash
# To edit your crontab, run:
crontab -e

# Add the following line to schedule the renewal script:
0 12 * * * /home/bader/portfolio/server/config/nginx/ssl_renew.sh >> /var/log/cron.log 2>&1
```

> [!TIP]  
> Review the `ssl_renew.sh` file for additional useful tips and configurations.

## Security

To enhance the security of your application and prevent common attacks such as DDoS, we have implemented Fail2Ban.

The following files are included in the configuration:

```bash
ls server/config/fail2ban/
directory => filter.d
file => my_custom_jail.local
```

### Custom Jails and Filters

We have created custom jails and filters to allow users to add their configurations after installing the tool. This flexibility helps you tailor the security settings to your specific needs.

---

Thank you for using the Nuxt Minimal Starter! If you have any questions or need further assistance, feel free to reach out.
