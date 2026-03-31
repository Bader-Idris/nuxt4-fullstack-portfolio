#!/bin/bash
# =============================================================================
# Generate Self-Signed Certificate for Windows Code Signing (Testing Only)
# =============================================================================
# This script generates a self-signed certificate for testing Windows builds
# from Linux/Ubuntu. WARNING: Self-signed certificates will show security
# warnings to users. For production, purchase a certificate from a trusted CA.
# =============================================================================

set -e

# Configuration
CERT_DIR="$(dirname "$(readlink -f "$0")")/envs"
CERT_FILE="${CERT_DIR}/Cert.pfx"
PRIVATE_KEY="${CERT_DIR}/private.key"
CERTIFICATE="${CERT_DIR}/certificate.crt"
CSR_FILE="${CERT_DIR}/request.csr"

# Certificate details (customize these)
CN="Bader Idris Portfolio"
O="Bader Idris"
C="US"
VALIDITY_DAYS=730

# Password for the .pfx file (CHANGE THIS!)
PASSWORD="${WIN_CSC_KEY_PASSWORD:-ChangeMeToASecurePassword123!}"

echo "============================================================================="
echo "Self-Signed Certificate Generator for Windows Code Signing"
echo "============================================================================="
echo ""
echo "⚠️  WARNING: This certificate is for TESTING ONLY!"
echo "   Apps signed with this certificate will show security warnings."
echo "   For production, purchase a certificate from a trusted CA."
echo ""
echo "Certificate Details:"
echo "  Common Name (CN): ${CN}"
echo "  Organization (O): ${O}"
echo "  Country (C):     ${C}"
echo "  Validity:        ${VALIDITY_DAYS} days"
echo "  Output File:     ${CERT_FILE}"
echo ""

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL is not installed. Installing..."
    sudo apt update && sudo apt install -y openssl
fi

# Create directory if it doesn't exist
mkdir -p "${CERT_DIR}"

echo "📝 Generating private key..."
openssl genrsa -out "${PRIVATE_KEY}" 2048

echo "📝 Generating certificate signing request (CSR)..."
openssl req -new -key "${PRIVATE_KEY}" -out "${CSR_FILE}" \
    -subj "/CN=${CN}/O=${O}/C=${C}"

echo "📝 Generating self-signed certificate with Code Signing extension..."
# Create extensions config for code signing
cat > "${CERT_DIR}/extensions.cnf" << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_code_signing
prompt = no

[req_distinguished_name]
CN = ${CN}
O = ${O}
C = ${C}

[v3_code_signing]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature
extendedKeyUsage = codeSigning
subjectKeyIdentifier = hash
EOF

# Generate certificate with code signing extensions
openssl x509 -req -days ${VALIDITY_DAYS} -in "${CSR_FILE}" \
    -signkey "${PRIVATE_KEY}" -out "${CERTIFICATE}" \
    -extfile "${CERT_DIR}/extensions.cnf" -extensions v3_code_signing

echo "📝 Creating PKCS#12 file (.pfx)..."
openssl pkcs12 -export -out "${CERT_FILE}" \
    -inkey "${PRIVATE_KEY}" \
    -in "${CERTIFICATE}" \
    -passout pass:"${PASSWORD}"

# Clean up extensions file
rm -f "${CERT_DIR}/extensions.cnf"

echo ""
echo "============================================================================="
echo "✅ Certificate generated successfully!"
echo "============================================================================="
echo ""
echo "Certificate file: ${CERT_FILE}"
echo "Password: ${PASSWORD}"
echo ""
echo "📋 Next Steps:"
echo "   1. Update your .env file:"
echo "      export WIN_CSC_LINK=\"${CERT_FILE}\""
echo "      export WIN_CSC_KEY_PASSWORD=\"${PASSWORD}\""
echo ""
echo "   2. Source the .env file:"
echo "      source electronAssets/builder/envs/.env"
echo ""
echo "   3. Build your Windows app:"
echo "      bun run build:electron:win"
echo ""
echo "⚠️  Security Notes:"
echo "   - Keep this certificate file secure"
echo "   - Don't commit it to version control (already in .gitignore)"
echo "   - For production, purchase a certificate from:"
echo "     • SSL.com: https://www.ssl.com/certificates/code-signing/"
echo "     • Sectigo: https://sectigo.com/"
echo "     • DigiCert: https://www.digiCert.com/"
echo "     • GlobalSign: https://www.globalsign.com/"
echo ""
echo "============================================================================="
