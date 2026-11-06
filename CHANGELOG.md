# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Windows desktop app (Electron). Ships as a portable `.exe` and a no-install `.zip` with a `Run-Aimless.bat` launcher. Runs as invoker, with no admin prompt.
- Real screenshots in the README, generated with `npm run screenshots`.
- App icon generated from the SVG logo (`npm run icon`).

### Changed
- Runtime libraries moved to `devDependencies`. Vite bundles them into `dist/`, so the desktop package ships no `node_modules`.

## [1.0.0] - 2026-11-06

### Added
- Calculation engine for eDPI, cm/360°, game-to-game conversion, step rounding with error reporting, user calibration and FOV conversion.
- Database of 20 games with Verified, Approximate and Unsupported classifications and per-game notes.
- Converter with independent target DPI, swap, copy, reset, save as profile and a calculation summary.
- Dashboard with quick convert, statistics, recent conversions, profiles and favorite games.
- Compare view with match-to-reference and a cm/360° chart.
- Profile manager: create, edit, duplicate, favorite, search, delete, and import/export as JSON.
- Conversion history, tools page and games database page.
- English and Arabic interfaces with full RTL support. Dark, light and system themes.
- Vitest suite covering the engine, import validation and translations.
- GitHub Actions workflow for tests and build.
