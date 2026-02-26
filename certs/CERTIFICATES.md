# Apple Wallet Pass Signing Certificates

To create **signed** `.pkpass` files that work on any iPhone, you need certificates from your Apple Developer account.

## Prerequisites

- [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- OpenSSL installed (macOS has it by default; on Windows you may need to install it)

## Step 1: Create a Pass Type ID

1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list/passTypeId)
2. Click **+** to add a new Pass Type ID
3. Description: e.g. "Perspective Studio Card"
4. Identifier: `pass.com.perspective.studio` (or `pass.com.yourcompany.yourapp` — must match `passTypeIdentifier` in `pass.json`)
5. Register

## Step 2: Create the Pass Signing Certificate

1. In the Pass Type IDs list, click your new Pass Type ID
2. Click **Create Certificate**
3. Follow Apple’s instructions to create a Certificate Signing Request (CSR) via **Keychain Access**
   - [Apple’s CSR guide](https://developer.apple.com/help/account/create-certificates/create-a-certificate-signing-request)
4. Upload the CSR, then download the `.cer` file

## Step 3: Get Your Team ID

1. In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/), check **Membership** or your certificate details
2. Your **Team ID** is a 10-character string (e.g. `ABC123XY12`)
3. Update `teamIdentifier` in `wallet-pass/perspective.pass/pass.json` to match

## Step 4: Download WWDR Certificate

1. Go to [Apple PKI](https://www.apple.com/certificateauthority/)
2. Download **Apple Worldwide Developer Relations - G4 (Expiring 02/07/2031)**
3. Save the `.cer` file

## Step 5: Convert to PEM Files

Create a `certs` folder in the project root and put the PEM files there.

### From macOS Keychain (recommended)

1. Double-click the downloaded pass certificate (`.cer`) to add it to Keychain
2. In Keychain Access, find the certificate, right-click → **Export**
3. Export as `.p12`, choose a password (save it for `SIGNER_KEY_PASSPHRASE`)
4. In terminal:

```bash
cd certs

# Extract certificate (replace YOUR.p12 and P12_PASSWORD)
openssl pkcs12 -in YOUR.p12 -clcerts -nokeys -out signerCert.pem -passin pass:P12_PASSWORD

# Extract private key (replace P12_PASSWORD and KEY_PASSPHRASE)
openssl pkcs12 -in YOUR.p12 -nocerts -out signerKey.pem -passin pass:P12_PASSWORD -passout pass:KEY_PASSPHRASE
```

If you see an OpenSSL error about algorithms, add `-legacy`:

```bash
openssl pkcs12 -in YOUR.p12 -nocerts -out signerKey.pem -passin pass:P12_PASSWORD -passout pass:KEY_PASSPHRASE -legacy
```

### Convert WWDR certificate

```bash
# Replace WWDR_G4.cer with the downloaded filename
openssl x509 -inform DER -outform PEM -in WWDR_G4.cer -out wwdr.pem
```

### From terminal (alternative)

If you generated a CSR and key manually:

```bash
# Convert .cer to .pem
openssl x509 -inform DER -outform PEM -in pass.cer -out signerCert.pem

# WWDR
openssl x509 -inform DER -outform PEM -in WWDR_G4.cer -out wwdr.pem
```

## Step 6: File Layout

Your `certs/` folder should contain:

```
certs/
├── wwdr.pem       # Apple WWDR G4 certificate
├── signerCert.pem # Your Pass Type signing certificate
├── signerKey.pem  # Your private key
└── CERTIFICATES.md # This file
```

**Do not commit** `signerCert.pem`, `signerKey.pem`, or `.p12` files. They are listed in `.gitignore`.

## Step 7: Create the Signed Pass

```bash
# Set your Team ID (must match pass.json and your certificate)
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# Optional: if signerKey.pem has a passphrase
export SIGNER_KEY_PASSPHRASE="your_key_passphrase"

# Optional: override website URL
export WEBSITE_URL="https://yoursite.com/perspective"

npm run create-pkpass-signed
```

The signed `perspective-card.pkpass` will be created in the project root.

## Troubleshooting

**"Invalid data error reading pass" / "passTypeIdentifier or teamIdentifier may not match"**

- `passTypeIdentifier` in `pass.json` must exactly match the Pass Type ID you registered
- `teamIdentifier` must match your Apple Team ID
- Verify with: `openssl x509 -inform PEM -in certs/signerCert.pem -noout -text` and check Subject / OU

**OpenSSL "unsupported" or "RC2" errors**

- Use the `-legacy` flag when extracting from `.p12`

**Pass adds in Simulator but not on a real device**

- Real devices require a signed pass; use `create-pkpass-signed`
