# Zulip Mini UI - Security Guide

## 🔐 IMPORTANT: Before Pushing to Git!

### ⚠️ Current Security Status

**✅ SAFE TO COMMIT:**

- Source code files (`.cs`, `.tsx`, `.ts`)
- Example configuration (`appsettings.Example.json`)
- This security guide

**❌ NEVER COMMIT:**

- `appsettings.json` - Contains secrets!
- `appsettings.Development.json` - May contain secrets!
- `.env` files - Contains API keys!

### 🛡️ What We Did

1. **Added to `.gitignore`:**

   ```
   **/appsettings.json
   **/appsettings.*.json
   !**/appsettings.Example.json
   ```

2. **Created Example File:**
   - `Backend/appsettings.Example.json` - Template without secrets

3. **Secrets in Current `appsettings.json`:**
   - ⚠️ JWT_SIGNING_KEY - Development key (CHANGE IN PRODUCTION!)
   - ⚠️ TOKEN_ENC_KEY - Development key (CHANGE IN PRODUCTION!)
   - ⚠️ APP_INVITE_CODE - `welcome123` (CHANGE!)
   - ⚠️ Database Password - `postgres` (CHANGE!)

### 🚀 Before Production

```bash
# Generate new JWT key (64+ chars)
openssl rand -base64 64

# Generate new encryption key (32 bytes)
openssl rand -base64 32

# Update appsettings.json with new keys
# NEVER commit this file!
```

### ✅ Checklist Before Git Push

- [ ] `appsettings.json` is in `.gitignore`
- [ ] No hardcoded passwords in code
- [ ] No API keys in frontend code
- [ ] Example files have placeholder values
- [ ] README warns about secrets

### 🔍 Check for Secrets

```bash
# Search for potential secrets
git grep -i "password\|secret\|key" -- '*.json' '*.cs' '*.ts'

# Check what will be committed
git status
git diff --cached
```

### 📝 Current Development Keys

**These are ONLY for development! Change in production:**

```
JWT_SIGNING_KEY: "this-is-a-very-secure-key-for-development-only..."
TOKEN_ENC_KEY: "this-is-a-very-secure-encryption-key-for-tokens..."
APP_INVITE_CODE: "welcome123"
DB_PASSWORD: "postgres"
```

## ✅ You're Safe to Push!

The `.gitignore` is configured correctly. Just make sure:

1. `appsettings.json` is NOT staged
2. Change all keys before production deployment
