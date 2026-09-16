# Japanese and Russian Locales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the English placeholders in the Japanese and Russian locale resources with complete translations while preserving language-code routing, resource loading, interpolation, and build behavior.

**Architecture:** Keep `en.json` as the key and interpolation baseline. Generate `ja.json` and `ru.json` from the same ordered key set using cached batch translation with protected interpolation markers, then validate the resulting files with Jest and a standalone locale checker. Keep runtime routing in the existing i18next/Taro language modules and change only gaps exposed by tests.

**Tech Stack:** Node.js 20, Jest, i18next, react-i18next, Taro 4, JSON locale resources, Google Translate public endpoint for translation generation.

---

## File Map

- Create: `src/__tests__/i18nLocaleIntegrity.test.js` — verifies locale key parity, interpolation parity, and representative non-fallback values.
- Create: `scripts/check-i18n-locales.js` — validates JSON structure, key parity, interpolation tokens, empty values, and ordinary English fallback values.
- Create/update: `src/subpages/i18n/locales/ja.json` — complete Japanese resource values keyed by the English baseline.
- Create/update: `src/subpages/i18n/locales/ru.json` — complete Russian resource values keyed by the English baseline.
- Modify: `package.json` — point `i18n:check` at the actual locale directory and checker.
- Verify or modify only if needed: `config/index.js`, `src/api/req.js`, `src/i18n/config-t.js`, `src/i18n/index.js`, `src/i18n/instance.js`, `src/lang/consts.js`, `src/subpages/i18n/resources.js`, `src/utils/language-setting.js`.

### Task 1: Add a failing resource integrity test

**Files:**
- Create: `src/__tests__/i18nLocaleIntegrity.test.js`

- [x] **Step 1: Add tests for key and interpolation parity.** Load `en.json`, `ja.json`, and `ru.json` from `src/subpages/i18n/locales`; compare sorted key arrays and compare every `${number}` token list for each target locale.

- [x] **Step 2: Add representative fallback assertions.** Assert that the ordinary UI keys `10293ac1.02cc4f`, `10293ac1.1edff0`, `10293ac1.479ddf`, `61e2d21a.8bdc0a`, `6c0659eb.62d369`, and `a2d3a891.c017be` are not equal to their English values in either target locale.

- [x] **Step 3: Run the focused test and verify the failure is meaningful.**

Run: `npx jest src/__tests__/i18nLocaleIntegrity.test.js --runInBand`

Expected: key and interpolation tests pass; both fallback tests fail because the current `ja.json` and `ru.json` values equal English.

### Task 2: Generate complete Japanese and Russian resources

**Files:**
- Modify: `src/subpages/i18n/locales/ja.json`
- Modify: `src/subpages/i18n/locales/ru.json`

- [ ] **Step 1: Build a translation input from the English baseline.** Read `en.json` in insertion order, deduplicate identical non-empty natural-language values for request efficiency, and preserve a reverse map from each value to its keys.

- [ ] **Step 2: Protect interpolation tokens before translation.** Replace every `${0}`, `${1}`, and subsequent token with an opaque marker such as `__I18N_VAR_0__`; after translation, restore the original token and reject any response whose marker set differs from the source.

- [ ] **Step 3: Translate each unique value to Japanese and Russian with a retrying cache.** Use the approved public translation endpoint with source `en`, target `ja` or `ru`, concurrency limited to 8 requests, exponential retry for HTTP errors or invalid JSON, and a local temporary cache so a resumed run never re-translates completed values.

- [ ] **Step 4: Write target resources in the exact English key order.** Preserve empty English values as empty target values, preserve format-only strings such as `${0}/${1}` without translation, and write UTF-8 JSON with two-space indentation and a trailing newline.

- [ ] **Step 5: Review machine-translated output for product-specific terms and malformed strings.** Inspect all values containing `WeChat`, `SMS`, `VIP`, currency symbols, newline-separated invoice details, permission text, and prescription/medical wording; correct awkward or semantically incorrect target wording directly in the locale JSON while preserving tokens.

- [ ] **Step 6: Run the focused test and verify the green result.**

Run: `npx jest src/__tests__/i18nLocaleIntegrity.test.js --runInBand`

Expected: all tests pass for `ja` and `ru`.

### Task 3: Add a repeatable locale checker and verify runtime integration

**Files:**
- Create: `scripts/check-i18n-locales.js`
- Modify: `package.json`
- Verify or modify only if needed: `config/index.js`, `src/api/req.js`, `src/i18n/config-t.js`, `src/i18n/index.js`, `src/i18n/instance.js`, `src/lang/consts.js`, `src/subpages/i18n/resources.js`, `src/utils/language-setting.js`

- [ ] **Step 1: Implement the standalone checker.** It must parse `en.json`, `ja.json`, and `ru.json`; fail on key differences, missing target values for non-empty English strings, interpolation token differences, or ordinary English values copied unchanged. It may allow an unchanged value only when it is format-only or an explicit product/protocol token such as `ID`, `URL`, `SMS`, `VIP`, or `WeChat`.

- [ ] **Step 2: Update the package script to use the actual locale directory.** Set `i18n:check` to `node scripts/check-i18n-locales.js`, because the existing `.cursor` checker path is absent and points at `src/i18n/locales` while the project stores resources under `src/subpages/i18n/locales`.

- [ ] **Step 3: Verify all existing language integration points.** Confirm `ja` and `ru` appear in storage/i18next maps, accepted aliases, API country-code mapping, language names, resource registration, H5 loading, WeChat subpackage loading, build copy patterns, and compile-time text tables. Modify only a missing or incorrect entry.

- [ ] **Step 4: Run the checker.**

Run: `npm run i18n:check`

Expected: the checker reports 4,153 baseline keys, zero missing keys, zero interpolation mismatches, and no ordinary English fallback values.

### Task 4: Run regression tests and builds

**Files:**
- Verify: `src/__tests__/i18nLocaleIntegrity.test.js`
- Verify: all existing `src/__tests__/*.test.js`
- Verify: locale and integration files listed in Task 3

- [ ] **Step 1: Run the full Jest suite.**

Run: `npx jest --runInBand`

Expected: all test suites pass.

- [ ] **Step 2: Run the locale checker again after the full suite.**

Run: `npm run i18n:check`

Expected: zero locale integrity errors.

- [ ] **Step 3: Build H5.**

Run: `npm run build:h5`

Expected: exit code 0 and generated H5 resources include `ja` and `ru` without module-resolution errors.

- [ ] **Step 4: Build the WeChat mini-program.**

Run: `npm run build:weapp`

Expected: exit code 0 and generated `subpages/i18n/locales/ja.js`, `subpages/i18n/locales/ru.js`, and `subpages/i18n/resources.js` are present.

- [ ] **Step 5: Review the final diff.**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors; only the intended locale, checker, test, package, integration, and plan files are changed.
