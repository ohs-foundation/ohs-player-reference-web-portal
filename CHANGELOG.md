# Changelog

## 0.1.0 — 2026-05-08

- Initial publish of `ohs-player-web-core@0.1.0` and the `ohs-player-web` reference application (see repository README and `docs/`).
- **Material Web**: `ohs-player-web-core` primitives (`Button`, `IconButton`, `TextField`, `TextAreaField`, `SelectField`, `Spinner`, `OhsTabs`, `OhsDropdownMenu`) now delegate to `@material/web` 2.x where applicable. OHS `--ohs-*` tokens are bridged to `--md-sys-*` in `m3-bridge.css`. Radix remains for dialog, toast, and tooltip. Host apps should add `@material/web` as a direct dependency so bundlers resolve component entry imports from the built core package.
