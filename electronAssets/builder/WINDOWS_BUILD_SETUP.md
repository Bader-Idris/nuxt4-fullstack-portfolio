# Windows Electron Build Setup Guide

This guide explains how to properly set up your environment for building Windows Electron applications with proper code signing.

## Problem Overview

When building Electron applications on Windows, you might encounter these errors:

1. `executor is not a function` - related to signtool execution in electron-builder
2. `Env WIN_CSC_LINK is not correct, cannot resolve: C:\path\to\Cert.pfx doesn't exist` - related to certificate path configuration

## Solution Steps

### Step 1: Fix the electron-builder Configuration

The configuration in `electronAssets/builder/config.js` has been updated to use the correct property names:

```javascript
// Correct configuration for Windows signing
win: {
  icon: 'electronAssets/resources/icon.ico',
  publish: [
    {
      provider: 'github',
      owner: 'Bader-Idris',
      repo: 'Bader-Idris',
      private: true
    }
  ],
  forceCodeSigning: false,
  cscLink: process.env.WIN_CSC_LINK || path.join(__dirname, 'envs', 'Cert.pfx'),
  cscKeyPassword: process.env.WIN_CSC_KEY_PASSWORD,
  target: windowsTargets
},
```

Key changes:
- `certificateFile` → `cscLink`
- `certificatePassword` → `cscKeyPassword`
- Removed problematic `signtoolOptions` and `signDlls` properties

### Step 2: Certificate File Location

Your certificate file `Cert.pfx` should be located at:
```
electronAssets/builder/envs/Cert.pfx
```

Make sure the file exists in that location. If it doesn't exist, you need to:

1. Generate a new certificate or obtain an existing one
2. Place it in the correct location: `electronAssets/builder/envs/Cert.pfx`

### Step 3: Environment Variables Configuration

Create or update your environment file at `electronAssets/builder/envs/.env`:

```bash
WIN_CSC_LINK=electronAssets/builder/envs/Cert.pfx
WIN_CSC_KEY_PASSWORD=your_certificate_password_here
```

### Step 4: Install Windows SDK (for signtool.exe)

If you need to install the Windows SDK to get signtool.exe, follow these steps:

#### Option 1: Install Windows SDK via Visual Studio Installer
1. Download and install Visual Studio Community (free) or Build Tools for Visual Studio
2. During installation, select "Windows 10/11 SDK"
3. This will install signtool.exe in the correct location

#### Option 2: Install Windows SDK Standalone
1. Go to the [Microsoft Windows SDK page](https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/)
2. Download and install the latest Windows SDK
3. signtool.exe will be available in the Windows Kits directory

#### Verify signtool Installation
Open Command Prompt or PowerShell and run:
```cmd
where signtool
```

If found, you should see output similar to:
```
C:\Program Files (x86)\Windows Kits\10\bin\10.0.xxxx.xxxxx\x64\signtool.exe
```

### Step 5: Alternative - Skip Code Signing for Testing

If you want to build without code signing for testing purposes, you can temporarily modify your configuration:

```javascript
win: {
  // ... other settings
  forceCodeSigning: false,
  // Remove or comment out the cscLink and cscKeyPassword
  // cscLink: process.env.WIN_CSC_LINK || path.join(__dirname, 'envs', 'Cert.pfx'),
  // cscKeyPassword: process.env.WIN_CSC_KEY_PASSWORD,
  target: windowsTargets
},
```

### Step 6: Build Commands

After setting up your environment, you can run:

```bash
# Build for Windows only
npm run build:electron:win

# Or if using Bun
bun run build:electron:win

# Build for all platforms
npm run build:electron:all
```

## Troubleshooting

### Common Issues and Solutions:

1. **Certificate file not found:**
   - Ensure `Cert.pfx` exists at `electronAssets/builder/envs/Cert.pfx`
   - Check that the file path in your `.env` file is correct

2. **signtool.exe not found:**
   - Install Windows SDK as described above
   - The SDK includes signtool.exe which is needed for code signing

3. **Certificate password not accepted:**
   - Verify the password in your `.env` file is correct
   - Ensure there are no special characters or hidden characters in the password

4. **Path issues on Windows:**
   - Use forward slashes in paths for cross-platform compatibility
   - Example: `electronAssets/builder/envs/Cert.pfx` instead of `electronAssets\builder\envs\Cert.pfx`

### Additional Notes:

- The certificate file (Cert.pfx) should be kept secure and not committed to version control
- Make sure your environment variables are loaded properly by dotenv
- If using PowerShell, ensure you have appropriate execution policies set for scripts

## Certificate Generation and Signing Issues

If you need to generate a self-signed certificate for development/testing purposes, you can use PowerShell:

### Option 1: Generate Self-Signed Certificate (PowerShell)

Open PowerShell as Administrator and run:

```powershell
# Generate a new self-signed certificate for code signing
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Your Company Name" -KeyUsage DigitalSignature -FriendlyName "Your App Name Code Signing" -CertStoreLocation "Cert:\CurrentUser\My"

# Export the certificate to PFX format
$certPath = "electronAssets/builder/envs/Cert.pfx"
$password = "YourSecurePassword123!"  # Use a strong password
$securePassword = ConvertTo-SecureString -String $password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $certPath -Password $securePassword

# Get the certificate thumbprint for reference
Write-Host "Certificate Thumbprint: $($cert.Thumbprint)"
```

**Important**: Replace "Your Company Name", "Your App Name Code Signing", and "YourSecurePassword123!" with appropriate values.

### Troubleshooting Signing Errors

If you encounter the error "SignTool Error: A required function is not present", this means the signing options being used are not supported by your Windows version or the cached signtool version.

To fix this, you can modify your electron-builder configuration to use simpler signing options:

```javascript
win: {
  icon: 'electronAssets/resources/icon.ico',
  publish: [
    {
      provider: 'github',
      owner: 'Bader-Idris',
      repo: 'Bader-Idris',
      private: true
    }
  ],
  forceCodeSigning: false, // Set to false to skip code signing for testing
  cscLink: process.env.WIN_CSC_LINK || path.join(__dirname, 'envs', 'Cert.pfx'),
  cscKeyPassword: process.env.WIN_CSC_KEY_PASSWORD,
  // Alternative: Remove timestamp server for compatibility
  sign: process.env.WIN_CSC_KEY_PASSWORD ?
    async (configuration) => {
      const { WindowsSignToolManager } = require('app-builder-lib/out/codeSign/windowsCodeSign');
      const manager = new WindowsSignToolManager({
        ...configuration,
        // Use older signing options for compatibility with older Windows SDK
        timestampServer: undefined  // Remove timestamp for compatibility
      });
      return await manager.signFile(configuration.path);
    } : undefined,
  target: windowsTargets
},
```

Or, for a simpler approach, you can temporarily disable code signing to test if the build works:

```javascript
win: {
  icon: 'electronAssets/resources/icon.ico',
  forceCodeSigning: false, // This will skip code signing
  target: windowsTargets // You might want to avoid 'appx' target temporarily
},
```

## AppX Build Error Fix

The AppX target requires an Application.Id that doesn't contain periods. To fix the error "AppX Application.Id can not be consists of alpha-numeric and period", you have these options:

### Option 1: Change your main appId in package.json

Update your `package.json` to use an appId without periods:

```json
{
  "name": "nuxt4-fullstack-portfolio",
  "private": true,
  "version": "3.2.6",
  "main": "dist-electron/main/index.js",
  "appId": "com_baderidris_www",
  ...
}
```

### Option 2: Build AppX separately with a different configuration

Create a separate configuration file for AppX builds (e.g., `electronAssets/builder/config-appx.js`):

```javascript
const baseConfig = require('./config.js');
module.exports = {
  ...baseConfig,
  appId: 'com_baderidris_www',  // appId without periods for AppX
  win: {
    ...baseConfig.win,
    target: [{ target: 'appx', arch: 'x64' }]
  }
};
```

Then build AppX separately:
```bash
electron-builder --config=electronAssets/builder/config-appx.js
```

### Option 3: Skip AppX target temporarily

If you only need other Windows targets, you can modify your windowsTargets array to exclude AppX:

```javascript
const windowsTargets = [
  // { target: 'appx', arch: 'x64' }, // Commented out for now
  // { target: 'zip', arch: 'x64' }, // not worthy!
  { target: 'portable', arch: 'x64' },
  { target: 'nsis', arch: 'x64' }
]

### Option 2: Using makecert (Legacy - if available)

If you have the Windows SDK tools installed, you might also use:

```cmd
makecert -r -pe -ss My -n "CN=Your Company Name" -sky signature -sv MyCert.pvk MyCert.cer
pvk2pfx -pvk MyCert.pvk -spc MyCert.cer -pfx Cert.pfx
```

### Option 3: Production Certificate

For production applications, you should purchase a code signing certificate from a trusted Certificate Authority (CA) like:
- DigiCert
- Sectigo (formerly Comodo)
- GlobalSign
- GoDaddy

## Using the Generated Certificate

Once you have your certificate file:
1. Place it at `electronAssets/builder/envs/Cert.pfx`
2. Update your `.env` file with the correct password
3. Make sure your `WIN_CSC_LINK` environment variable points to the correct path

## Security Considerations

- Store your certificate file securely
- Don't commit certificate files or passwords to version control
- Use environment variables for sensitive information
- For production, use certificates from trusted CAs
- Consider using a secure key management solution for production builds