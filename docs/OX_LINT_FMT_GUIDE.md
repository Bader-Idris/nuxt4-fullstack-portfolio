# Oxlint & Oxfmt: High-Performance Linting & Formatting 🚀

This document outlines the configuration and integration of the **Oxc** toolchain (`oxlint` and `oxfmt`) as a modern, high-performance replacement for ESLint and Prettier.

---

## 1. Why Oxc? (Architecture Rationale)

The project has transitioned to the Oxc toolchain for two primary reasons:

*   **Speed:** `oxlint` and `oxfmt` are written in Rust and are up to 100x faster than their JavaScript counterparts. This ensures that linting and formatting never become a bottleneck in the development loop or CI/CD pipelines.
*   **Developer Experience (DX):** By using the Oxlint Language Server (LSP), we get instantaneous feedback directly in the editor without the overhead of heavy JS-based plugins.

---

## 2. Configuration Files

### A. Oxlint (`.oxlintrc.json`)
This file controls the rules and plugins used for linting.
- **Plugins Enabled:** `typescript`, `unicorn`, `oxc`, and `vue`.
- **Categories:** We have enabled `correctness` (as errors), and `suspicious`, `pedantic`, and `style` (as warnings).

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "vue"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "pedantic": "warn",
    "style": "warn"
  }
}
```

### B. Oxfmt (`.oxfmtrc.json`)
Controls code formatting. It is designed to be highly compatible with Prettier while being significantly faster.
- **Ignore Patterns:** Standard build and dependency folders are ignored to avoid unnecessary processing.

---

## 3. Editor Integration (VS Code)

To get "ESLint-like" behavior where errors appear in real-time, you must install the **Oxlint** extension.

### Settings (`.vscode/settings.json`)
The project includes a workspace settings file to automate the experience:
- **`oxlint.run: "onType"`**: Errors appear as you type.
- **`source.fixAll.oxlint`**: Automatically fixes issues (like unused imports or simple style violations) every time you save.

```json
{
  "oxlint.enable": true,
  "oxlint.run": "onType",
  "editor.codeActionsOnSave": {
    "source.fixAll.oxlint": "always"
  }
}
```

---

## 4. Vue Support & Limitations

### Current State
Oxlint has native support for Vue Single File Components (SFCs). It checks both the `<script>` and `<template>` blocks for common errors.

### Attribute Ordering (`vue/attributes-order`)
*   **Status:** Not currently supported natively in Oxc (as of mid-2026).
*   **Workaround:** While `oxfmt` can sort Tailwind CSS classes, it does not yet handle the full Vue Style Guide attribute ordering. This is a trade-off for the massive speed gains provided by the toolchain.

---

## 5. Common Commands

| Task | Command |
| :--- | :--- |
| **Lint Check** | `pnpm lint` |
| **Lint & Auto-fix** | `pnpm lint:fix` |
| **Format Check** | `pnpm fmt:check` |
| **Format (Write)** | `pnpm fmt` |

---
*Created for a faster, cleaner development experience.*
