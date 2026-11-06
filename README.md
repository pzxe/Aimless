# Sensitivity Converter

A local-first toolkit for converting mouse sensitivity between FPS games, in English and Arabic.

It matches the **physical mouse distance for a full 360° turn (cm/360°)** between games using each game's own rotation constant. It also calculates eDPI, compares setups side by side, and stores your profiles in your browser. There are no accounts, no tracking and no network requests at runtime.

> **Honest by design.** The app never invents a conversion constant. A game with no reliable data is marked **Unsupported**, and you can calibrate it yourself with a real measurement. Approximate data is labelled as approximate.

---

## Screenshots

_Screenshots will be added here._

<!-- ![Converter](docs/screenshots/converter.png) -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

## Features

- **Converter.** Source and target panels with independent DPI, live results, swap, copy and reset, and a step-by-step calculation summary. Shows the nearest value the target game accepts, with the error that rounding introduces.
- **Accuracy labels.** Every result is labelled *Verified*, *Approximate*, *Calibrated* or *Unsupported*, with notes explaining why.
- **Calibration.** Measure your own cm/360° in any game to unlock conversions for unsupported titles.
- **Compare.** Line up any number of games or profiles, see cm/360° and the difference from a reference, and match all rows to the reference in one click.
- **Profiles.** Create, edit, duplicate, favorite, search and delete profiles, with optional notes, resolution and FOV.
- **Import / export.** Export one or all profiles as JSON. Imports are validated, so malformed files can't crash the app.
- **History.** Recent conversions are stored locally and can be reused or cleared.
- **Tools.** cm/360° calculator, sensitivity for a target distance, DPI change, eDPI and an FOV converter (horizontal, vertical and 4:3).
- **Game selector.** Searchable, with favorites, recently used games and full keyboard navigation.
- **Settings.** English and Arabic (full RTL), dark, light or system theme, display precision, default DPI and FOV display. You can reset settings or clear all data.
- **Responsive.** Works from phone width up to desktop.

## Supported games

| Game | Yaw (°/count at sens 1) | Accuracy |
|---|---|---|
| Valorant | 0.07 | Verified |
| Counter-Strike 2 | 0.022 | Verified |
| Counter-Strike: Global Offensive | 0.022 | Verified |
| Apex Legends | 0.022 | Verified |
| Team Fortress 2 | 0.022 | Verified |
| Quake Live | 0.022 | Verified |
| Overwatch 2 | 0.0066 | Verified |
| Call of Duty: Warzone | 0.0066 | Verified |
| Call of Duty: Black Ops 6 | 0.0066 | Verified |
| Call of Duty: Black Ops 7 | 0.0066 (assumed same as BO6) | Approximate |
| Quake Champions | 0.022 | Approximate |
| Destiny 2 | 0.0066 | Approximate |
| Fortnite | 0.005555 per 1 % of “Mouse Sensitivity X” | Approximate |
| Rainbow Six Siege | 0.00572957795 (multiplier 0.02) | Approximate |
| PUBG: Battlegrounds | — (non-linear slider, sources disagree) | Unsupported |
| Battlefield 6 | — | Unsupported |
| The Finals | — | Unsupported |
| XDefiant (servers shut down) | — | Unsupported |
| Halo Infinite | — | Unsupported |
| Splitgate 2 | — | Unsupported |

Each game's notes in the app explain its classification. Unsupported games can be used after you calibrate them.

## Calculation methodology

All calculations live in [`src/core/sensitivity`](src/core/sensitivity), a pure TypeScript module with no UI dependencies.

```
degrees per count = yaw × sensitivity
counts per 360°   = 360 / degrees per count
cm/360°           = counts per 360° / DPI × 2.54
eDPI              = DPI × sensitivity
```

To convert, the engine keeps the **degrees of rotation per inch of mouse movement** equal on both sides:

```
target degrees per count = source degrees per count × source DPI / target DPI
target sensitivity       = target degrees per count / target yaw
```

- Calculations use full double precision. Rounding only happens for display, using decimal-safe half-away-from-zero rounding.
- eDPI is only comparable between games that share the same yaw. The app warns you when it isn't.
- Calibration: `yaw = 360 × 2.54 / (cm/360 × DPI × sensitivity)`.
- FOV conversion uses `hFOV = 2·atan(tan(vFOV/2) · aspect)`. A “4:3” value describes the horizontal FOV of a 4:3 frame.

## Accuracy limitations

- Conversions match **hipfire** 360° distance. Scoped and ADS sensitivity use separate per-game multipliers and are not converted.
- Matching cm/360° does not guarantee identical feel. FOV, input processing, raw input, frame rate and acceleration all affect how aim feels.
- *Approximate* games rely on limited community measurements or on settings that can change rotation, such as Rainbow Six Siege's `MouseSensitivityMultiplierUnit`. Verify by measuring a 360° turn in-game.
- Calibration assumes linear scaling. For a non-linear slider (PUBG), a calibration is only accurate near the sensitivity you measured.
- Game updates can change constants. Corrections with sources are very welcome.

## Getting started

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev        # start the dev server
npm test           # run the test suite (Vitest)
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
```

The build is a static site with a relative base path and hash routing, so `dist/` can be hosted anywhere, including GitHub Pages.

## Project structure

```
src/
  core/sensitivity/   calculation engine (pure, unit tested)
  data/games/         game database
  store/              Zustand stores persisted to localStorage
  i18n/               English and Arabic dictionaries
  components/         UI primitives, layout, games, converter, profiles
  pages/              Dashboard, Converter, Compare, Profiles, History, Tools, Games, Settings
  hooks/  utils/
```

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Lucide icons, Sonner toasts and Vitest. The UI components are written in the shadcn/ui style, without its CLI or a component dependency. Fonts are bundled locally, so the app makes no requests to font CDNs.

## Privacy and security

- All data is stored in `localStorage` on your device. Nothing is sent anywhere.
- Imported JSON is parsed with `JSON.parse` only, size-limited to 2 MB and validated field by field. Unknown fields are dropped. An imported file cannot execute code.

## Contributing

Contributions are welcome, especially **sourced** game data. Read [CONTRIBUTING.md](CONTRIBUTING.md) before adding or changing a game constant.

## License

[MIT](LICENSE)

Game names are trademarks of their respective owners. This project is not affiliated with or endorsed by any game publisher. It uses no game artwork: game badges are text-based placeholders.
