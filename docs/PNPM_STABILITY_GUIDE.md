# pnpm Stability & CI/CD Strategy 🚀

This document outlines the "Robusten" approach for forcing package versions and bypassing supply-chain policies to ensure stable, reproducible builds in both local and Docker/CI environments.

---

## 1. Forcing Package Versions (Overrides)

In this project, we use **pnpm v11**. As of this version, the `pnpm` field in `package.json` is deprecated. We have moved all version constraints to `pnpm-workspace.yaml`.

### Why Lock Internal Packages?
Some internal dependencies of large modules (like `@nuxtjs/seo`) can introduce breaking changes even in patch releases. For example, we lock `nuxt-schema-org` to `6.0.4` because newer versions currently cause SSR failures.

### Implementation: `pnpm-workspace.yaml`
```yaml
overrides:
  nuxt-schema-org: 6.0.4
  # ... other forced versions
```

---

## 2. Docker & CI/CD Robustness

### The "Minimum Release Age" Problem
pnpm has a security policy that rejects packages published within the last 24 hours. In a fast-moving CI/CD pipeline, this often causes "fresh" dependency updates to break the build with an `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`.

### The Fix: `Dockerfile`
We explicitly disable this check and use `--frozen-lockfile` to ensure the exact resolutions from your host are replicated in the container.

```dockerfile
# Disable supply-chain policy checks for very fresh packages
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm config set minimum-release-age 0 && \
    pnpm install --shamefully-hoist --frozen-lockfile
```

---

## 3. Validation & Testing Commands

Use these commands to verify that your environment is correctly applying the "Robusten" strategy.

### A. Syncing the Lockfile
If you change `pnpm-workspace.yaml`, run this locally to update the `pnpm-lock.yaml`:
```bash
pnpm config list && pnpm install --no-frozen-lockfile
```

### B. Verifying the Lock (Direct Grep)
Check if the lockfile actually points to the forced version:
```bash
grep "nuxt-schema-org" pnpm-lock.yaml | head -n 20
```

### C. Verifying the Dependency Tree
Check the resolved version within the context of its parent package:
```bash
pnpm list nuxt-schema-org --depth 10
```
*Expected Output: `nuxt-schema-org@6.0.4`*

---

## 4. Troubleshooting
If you see version mismatches:
1. Delete `node_modules`.
2. Run `pnpm install --no-frozen-lockfile`.
3. Verify with `pnpm list <package-name>`.

---
*Created for Production Stability.*
