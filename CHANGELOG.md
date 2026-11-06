# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.2] - 2026-11-06

### Added
- **GitHub button** in the app's top bar (web and desktop app) and on the presentation page, linking to the repository. In the desktop app it opens in your default browser.
- **Tools quality of life:**
  - Every calculator remembers its last inputs between visits (stored locally; cleared by "Clear all data").
  - A "Use converter setting" button fills the cm/360°, sensitivity-for-a-distance, DPI change, eDPI, ADS and polling tools from the converter in one click.
  - DPI quick picks (400 / 800 / 1600 / 3200).
  - ↑ / ↓ arrow keys step numeric fields (Shift for ×10) in the tools and the converter.

### Fixed
- “Fill empty slots” in the tournament creator could reuse a name that was already taken, which then blocked generating the bracket.
- The Settings page overflowed sideways on phones.
- The desktop top bar was transparent, so content showed through it while scrolling.
- The bracket's Export menu now closes with Escape.
- The hero converter overflowed at phone width; nav links wrapped at tablet width; mousepad stats overlapped on phones.

### Changed
- **Accessibility:** filled buttons and badges now use a deeper accent shade so their labels meet the 4.5:1 contrast minimum, for every accent colour in dark and light themes. Secondary grey text is brighter and also passes.
- **Presentation page polish:**
  - One shared content width.
  - Each section fills exactly one screen on desktop.
  - Two clear hero actions, with the stats on the hero itself.
  - Consistent button styles and heading sizes.
  - The download panel and footer form the closing screen.
  - Clearer section headings in all five languages.
- Screenshots and GIF demos refreshed.

## [2.0.1] - 2026-11-06

### Changed
- Landing page tagline is now “Same feeling, different number” (updated in all five languages).

## [2.0.0] - 2026-11-06

### Added
- **Presentation landing page** (`/welcome`). An animated hero with a live converter, real-data counters, an eDPI vs cm/360° comparison computed by the engine, a bento feature grid, an embedded tools playground and Windows download links. The web app opens here by default; the desktop app opens straight into the workspace.
- **Tournament brackets.** Single and double elimination (upper and lower brackets, grand final, optional bracket reset), 1v1 or 5v5, team rosters, manual or random seeding, automatic byes, best-of 1/3/5/7, quick-score entry, map notes and renameable rounds. Editing a score invalidates later results that no longer apply. Export as JSON, SVG or PNG, or copy a text summary; validated JSON import.
- **Mousepad visualizer** (`/mousepad`). A to-scale 360° turn on small, medium, large, XL or custom pads, with an overflow warning. Also shown in the converter.
- **Aim style meter.** Wrist (< 25 cm), hybrid (25–40 cm) or arm (> 40 cm) classification with ergonomic notes.
- **ADS / scope calculator.** Focal-length and monitor-distance matching from FOV, magnification or a custom multiplier.
- **Polling rate calculator** for 1000–8000 Hz.
- **Three new languages:** Spanish, Russian and Portuguese (five in total). A language menu in the top bar; tests enforce full key and placeholder parity.
- **New settings:** cm or inch units everywhere, mousepad size, five accent colours, comfortable or compact density, full / reduced / instant motion, startup view and optional Web Audio sound feedback.
- Live web version on GitHub Pages, deployed on every push to `main`.
- README GIF demos (`npm run gifs`) and refreshed screenshots (`npm run screenshots`).

### Changed
- **New design system** based on the project's inspiration board: near-black grounds with an accent light spill, translucent cards with a lit edge, condensed display type (Oswald, bundled locally), glowing active states and a crimson default accent.
- The app shell has grouped navigation, a top bar with the language menu, the theme toggle and a link to the presentation page.
- The dashboard shows tournaments and links to the new tools.
- Settings storage is version 2; version 1 settings are migrated automatically.
- The package is renamed to `aimless`.

### Fixed
- The Compare table overflowed its card at window widths around 1280px.
- Several single-column grids could exceed the viewport on phones.

## [1.0.0] - 2026-11-06

### Added
- Calculation engine for eDPI, cm/360°, game-to-game conversion, step rounding with error reporting, user calibration and FOV conversion.
- Database of 20 games with Verified, Approximate and Unsupported classifications and per-game notes.
- Converter, dashboard, compare view, profile manager with JSON import/export, conversion history, tools page and games page.
- English and Arabic interfaces with full RTL support; dark, light and system themes.
- Windows desktop app (Electron): portable `.exe` and a no-install `.zip` with a `Run-Aimless.bat` launcher, running as invoker.
- App icon generated from the SVG logo, README screenshots, Vitest suite and GitHub Actions CI.
