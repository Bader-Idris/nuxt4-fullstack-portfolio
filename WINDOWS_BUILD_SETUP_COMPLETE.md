# Windows Electron Build from Ubuntu - Complete Setup Guide

## ✅ All Fixed Issues

1. **Certificate path error** - Fixed config.js to load .env properly
2. **Native module rebuild error** - Added `npmRebuild: false` to config
3. **Certificate code signing extension** - Updated generator script with EKU
4. **OpenSSL 1.1 compatibility** - Required for osslsigncode on Ubuntu 24.04

---

## 🔧 Setup Steps (DO THESE FIRST)

### Step 1: Install OpenSSL 1.1 Compatibility

Ubuntu 24.04 uses OpenSSL 3.0, but electron-builder's osslsigncode needs OpenSSL 1.1:

```bash
# Download and install OpenSSL 1.1
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
rm libssl1.1_1.1.1f-1ubuntu2_amd64.deb

# Verify installation
ldconfig -p | grep libcrypto
# Should show: libcrypto.so.1.1 => /usr/lib/x86_64-linux-gnu/libcrypto.so.1.1
```

### Step 2: Generate Code Signing Certificate

```bash
cd /home/bader/Desktop/portfolio
./electronAssets/builder/generate-self-signed-cert.sh
```

This creates:
- `electronAssets/builder/envs/Cert.pfx` - The certificate file
- Password: `ChangeMeToASecurePassword123!`

### Step 3: Configure Environment Variables

Edit `electronAssets/builder/envs/.env`:

```bash
# Remove 'export' keywords - dotenv doesn't understand them
WIN_CSC_LINK="/home/bader/Desktop/portfolio/electronAssets/builder/envs/Cert.pfx"
WIN_CSC_KEY_PASSWORD="ChangeMeToASecurePassword123!"
```

**Important:** Do NOT use `export` keyword - dotenv can't parse it.

### Step 4: Build for Windows

```bash
DOMAIN_NAME=http://localhost:5000 SOCKET_URL=ws://localhost:5000 bun run build:electron:win
```

Output will be in: `release/3.3.1/`

---

## 📁 Files Modified/Created

### Modified Files:
- `electronAssets/builder/config.js` - Added `npmRebuild: false`, `nodeGypRebuild: false`
- `electronAssets/builder/generate-self-signed-cert.sh` - Added code signing extension
- `electronAssets/builder/envs/.env` - Removed `export` keywords

### Created Files:
- `electronAssets/builder/WINDOWS_BUILD_FROM_LINUX.md` - Comprehensive guide
- `electronAssets/builder/generate-self-signed-cert.sh` - Certificate generator
- `electronAssets/README.md` - Complete reference
- `QUICK_START_WINDOWS_BUILD.md` - Quick reference
- `FIX_WINDOWS_BUILD_NATIVE_MODULES.md` - Native module fix details
- `setup-windows-build.sh` - One-command setup script

---

## 🔍 Troubleshooting

### Error: `libcrypto.so.1.1: cannot open shared object file`

**Solution:** Install OpenSSL 1.1 (Step 1 above)

### Error: `no certificates with ExtKeyUsageCodeSigning`

**Solution:** Regenerate certificate with updated script (Step 2 above)

### Error: `node-gyp does not support cross-compiling`

**Solution:** Already fixed in config.js with `npmRebuild: false`

### Error: `certificate.pfx doesn't exist`

**Solution:** Check path in `.env` is absolute and file exists:
```bash
ls -la /home/bader/Desktop/portfolio/electronAssets/builder/envs/Cert.pfx
```

---

## 🚀 Quick Commands Reference

```bash
# Install OpenSSL 1.1
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
rm libssl1.1_1.1.1f-1ubuntu2_amd64.deb

# Generate certificate
./electronAssets/builder/generate-self-signed-cert.sh

# Build for Windows
DOMAIN_NAME=http://localhost:5000 SOCKET_URL=ws://localhost:5000 bun run build:electron:win

# Build for all platforms
DOMAIN_NAME=http://localhost:5000 SOCKET_URL=ws://localhost:5000 bun run build:electron:all
```

---

## ⚠️ Important Notes

1. **Self-signed certificate** shows "Unknown Publisher" warning - OK for testing
2. **For production**, purchase certificate from:
   - [SSL.com](https://www.ssl.com/certificates/code-signing/) (~$50/year)
   - [Sectigo](https://sectigo.com/)
   - [DigiCert](https://www.digiCert.com/)
3. **Keep certificate secure** - Don't commit to git (already in .gitignore)
4. **OpenSSL 1.1 is EOL** - But required for electron-builder's osslsigncode

---

## 🔐 Windows SmartScreen Warning Levels

When users download your Windows app, they'll see a SmartScreen warning. The severity depends on your certificate:

| Certificate Type | Warning Level | User Experience |
|-----------------|---------------|-----------------|
| **No certificate** | 🔴 **Red block** | "Windows protected your PC" - User must click "More info" → "Run anyway" |
| **Self-signed certificate** | 🔴 **Red block** | "Windows protected your PC" - Same as no certificate |
| **Trusted CA certificate (new)** | 🟡 **Yellow warning** | "Unknown publisher" - User can click "Run" directly |
| **Trusted CA certificate (established)** | ✅ **No warning** | After building reputation, no warning appears |

### Option 3: Purchase a Code Signing Certificate (Recommended for Production)

To get the **yellow warning** instead of red, you need a certificate from a trusted Certificate Authority (CA):

#### Step 1: Purchase a Certificate

Providers:
- **SSL.com** - https://www.ssl.com/certificates/code-signing/ (~$50/year)
- **Sectigo** - https://sectigo.com/
- **DigiCert** - https://www.digiCert.com/
- **GlobalSign** - https://www.globalsign.com/

#### Step 2: Receive and Convert Certificate

CA will provide certificate files (usually `.crt`, `.cer`, or `.p7b`). Convert to `.pfx`:

```bash
# If CA provides separate certificate and private key
openssl pkcs12 -export -out certificate.pfx \
    -inkey your-private-key.key \
    -in your-certificate.crt \
    -passout pass:YourPassword123!
```

Or if CA provides a `.pfx` directly, skip this step.

#### Step 3: Update Environment Variables

```bash
# electronAssets/builder/envs/.env
WIN_CSC_LINK="/path/to/your/certificate.pfx"
WIN_CSC_KEY_PASSWORD="YourPassword123!"
```

#### Step 4: Rebuild

```bash
DOMAIN_NAME=http://localhost:5000 SOCKET_URL=ws://localhost:5000 bun run build:electron:win
```

#### Benefits of a Trusted CA Certificate

1. **🟡 Yellow warning initially** - Less alarming for users
2. **✅ No warning after reputation** - After enough downloads without issues
3. **Professional appearance** - Shows your organization name
4. **Required for some distributions** - Some app stores require code signing

#### Note on EV Certificates

**EV (Extended Validation) certificates** provide immediate SmartScreen reputation but:
- Cost more (~$400+/year)
- Require hardware token (physical USB device)
- Must sign on Windows machine with token attached

For most projects, a standard code signing certificate is sufficient.

---

---

## 📚 Documentation Files

- `QUICK_START_WINDOWS_BUILD.md` - Quick start guide
- `WINDOWS_BUILD_FROM_LINUX.md` - Comprehensive Windows build guide
- `FIX_WINDOWS_BUILD_NATIVE_MODULES.md` - Native module error fix
- `electronAssets/README.md` - Complete electronAssets reference

---

## 🔐 Certificate Password

Current password: `ChangeMeToASecurePassword123!`

To change it, regenerate the certificate with:
```bash
WIN_CSC_KEY_PASSWORD="YourNewPassword123!" ./electronAssets/builder/generate-self-signed-cert.sh
```

Then update `.env` with the new password.

---

**Last Updated:** 2026-03-31
**Tested On:** Ubuntu 24.04, Electron Builder 26.8.1
