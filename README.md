<div align="center">

<img src="public/favicon.svg" width="80" height="80" alt="Aimless logo" />

# Aimless

**One aim. Every game.**<br />
**سنس واحد. لكل الألعاب.**

The local-first FPS toolkit: a mouse sensitivity converter that matches the real distance of a 360° turn, plus tournament brackets, a mousepad visualizer and aim calculators. Five languages, honest accuracy labels for every game.

[![CI](https://img.shields.io/github/actions/workflow/status/pzxe/Aimless/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/pzxe/Aimless/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/website?url=https%3A%2F%2Fpzxe.github.io%2FAimless%2F&label=live%20demo&up_message=online&down_message=offline&logo=githubpages&logoColor=white)](https://pzxe.github.io/Aimless/)
[![Latest release](https://img.shields.io/github/v/release/pzxe/Aimless?label=release&color=ff2e4d)](https://github.com/pzxe/Aimless/releases/latest)
[![License: MIT](https://img.shields.io/github/license/pzxe/Aimless?color=blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](tsconfig.app.json)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](package.json)
[![Languages](https://img.shields.io/badge/languages-EN%20·%20AR%20·%20ES%20·%20RU%20·%20PT-ff2e4d)](#-languages)
[![Local-first](https://img.shields.io/badge/local--first-zero%20telemetry-3fcf8e?logo=shield&logoColor=white)](#-privacy-and-security)

[![🚀 Live Web Preview](https://img.shields.io/badge/🚀_Live_Web_Preview-ff2e4d?style=for-the-badge)](https://pzxe.github.io/Aimless/)
[![⬇️ Download for Windows](https://img.shields.io/badge/⬇️_Download_for_Windows-1f1f25?style=for-the-badge)](https://github.com/pzxe/Aimless/releases/latest)
[![🐛 Report Bug / Request Game](https://img.shields.io/badge/🐛_Report_Bug_%2F_Request_Game-1f1f25?style=for-the-badge)](https://github.com/pzxe/Aimless/issues)

<img src="docs/screenshots/demo-landing.gif" width="900" alt="The Aimless presentation page: animated hero, a live converter, and the eDPI versus cm/360° comparison" />

</div>

<details>
<summary><b>🌍 نبذة عن الأداة بالعربية</b></summary>
<br />
<div dir="rtl">

**Aimless** أداة مجانية ومفتوحة المصدر للاعبي ألعاب التصويب. تطابق **المسافة الفعلية التي يتحركها الماوس لدورة كاملة 360°** (سم/360°) بين الألعاب باستخدام ثابت الدوران الخاص بكل لعبة.

- **محوّل دقيق** لـ 20 لعبة، لكل منها مستوى دقة واضح: *موثّق* أو *تقريبي* أو *معايَر* أو *غير مدعوم*. لا نخمّن أي ثابت.
- **جداول بطولات** بنظام الإقصاء الفردي أو المزدوج، لمواجهات 1v1 أو فرق 5v5، مع النتائج والتصدير.
- **مُصوِّر لوحة الماوس** و**مقياس أسلوب التصويب** وحاسبات **التصويب بالمنظار** و**معدل الاستطلاع**.
- **خصوصية كاملة:** كل البيانات تبقى على جهازك، بلا حسابات ولا تتبّع ولا اتصال بالإنترنت.
- **خمس لغات** مع واجهة عربية كاملة من اليمين إلى اليسار.

**التشغيل:** جرّب [النسخة على الويب](https://pzxe.github.io/Aimless/) أو حمّل [تطبيق ويندوز](https://github.com/pzxe/Aimless/releases/latest). النسخ غير موقّعة رقميًا، لذا قد يظهر تحذير SmartScreen: اختر «مزيد من المعلومات» ثم «التشغيل على أي حال».

</div>
</details>

---

## ✨ What's inside

| | |
|---|---|
| 🎯 **Sensitivity converter** | 20 games, independent DPI, live cm/360° and eDPI, the nearest value the target game accepts, and a step-by-step calculation. |
| 🏷️ **Honest accuracy labels** | Every result is *Verified*, *Approximate*, *Calibrated* or *Unsupported*, with notes explaining why. No constants are invented. |
| 🏆 **Tournament brackets** | Single or double elimination (upper and lower brackets, grand final with optional bracket reset), 1v1 or 5v5, rosters, manual or random seeding, automatic byes, scores, map notes and JSON / SVG / PNG export. |
| 🖱️ **Mousepad visualizer** | Your 360° turn drawn to scale on a small, medium, large, XL or custom pad, with an overflow warning. |
| 🎚️ **Aim style meter** | Classifies your cm/360° as wrist (< 25 cm), hybrid (25–40 cm) or arm (> 40 cm) aim, with ergonomic notes. |
| 🔭 **ADS / scope calculator** | Focal-length (0%) and monitor-distance matching from FOV, magnification or a custom multiplier. |
| 📶 **Polling rate calculator** | Counts per report and the minimum hand speed at 1000, 2000, 4000 and 8000 Hz. |
| 📊 **Compare, profiles, history** | Match several games to one reference, save and share profiles, and reuse past conversions. |
| 🌐 **Five languages** | English, العربية (full RTL), Español, Русский and Português. |
| 🎨 **Settings that matter** | cm or inches, pad size, five accent colours, comfortable or compact density, full / reduced / instant (0 ms) motion, startup view and optional sound feedback. |
| 🔒 **Local-first** | No accounts, no telemetry, no network requests. Runs in the browser or as an offline Windows app. |

## 🎬 In action

| Converter | Tournament brackets |
|---|---|
| <img src="docs/screenshots/demo-converter.gif" alt="Converting Valorant to Overwatch 2 with live results, swap, and the step-by-step math" /> | <img src="docs/screenshots/demo-tournament.gif" alt="Creating a double-elimination bracket and entering scores" /> |
| **Compare + Arabic RTL + themes** | |
| <img src="docs/screenshots/demo-compare-rtl.gif" alt="Matching four games to one cm/360°, then switching to Arabic and toggling light and dark themes" /> | |

## 📸 Screenshots

| | |
|---|---|
| ![Presentation landing page](docs/screenshots/landing-hero.png) | ![Converter: Valorant to Overwatch 2](docs/screenshots/converter-dark.png) |
| **Presentation page.** A live converter in the hero, with direct access to the workspace. | **Converter.** Valorant → Overwatch 2, with the nearest value the game accepts and the step-by-step calculation. |
| ![Double-elimination tournament bracket](docs/screenshots/tournament-bracket.png) | ![Mousepad visualizer and aim style meter](docs/screenshots/mousepad-visualizer.png) |
| **Tournaments.** Double elimination with scores, connectors and highlighted ready matches. | **Mousepad.** One full turn to scale on a 45 cm pad, and the aim style it suits. |
| ![Compare view with cm/360° chart](docs/screenshots/compare-dark.png) | ![Arabic right-to-left interface](docs/screenshots/converter-rtl-ar.png) |
| **Compare.** Four games matched to the same cm/360°. | **Arabic (RTL).** The whole interface mirrors for right-to-left reading. |
| ![Games database with accuracy badges](docs/screenshots/games-calibration.png) | |
| **Games.** Every constant is labelled, and any game can be calibrated. | |

## 🎮 Supported games

| Game | Yaw (°/count at sens 1) | Accuracy |
|---|---|---|
| Valorant | 0.07 | ✅ Verified |
| Counter-Strike 2 | 0.022 | ✅ Verified |
| Counter-Strike: Global Offensive | 0.022 | ✅ Verified |
| Apex Legends | 0.022 | ✅ Verified |
| Team Fortress 2 | 0.022 | ✅ Verified |
| Quake Live | 0.022 | ✅ Verified |
| Overwatch 2 | 0.0066 | ✅ Verified |
| Call of Duty: Warzone | 0.0066 | ✅ Verified |
| Call of Duty: Black Ops 6 | 0.0066 | ✅ Verified |
| Call of Duty: Black Ops 7 | 0.0066 (assumed same as BO6) | 🟡 Approximate |
| Quake Champions | 0.022 | 🟡 Approximate |
| Destiny 2 | 0.0066 | 🟡 Approximate |
| Fortnite | 0.005555 per 1 % of “Mouse Sensitivity X” | 🟡 Approximate |
| Rainbow Six Siege | 0.00572957795 (multiplier 0.02) | 🟡 Approximate |
| PUBG: Battlegrounds | — (non-linear slider, sources disagree) | ⛔ Unsupported |
| Battlefield 6 | — | ⛔ Unsupported |
| The Finals | — | ⛔ Unsupported |
| XDefiant (servers shut down) | — | ⛔ Unsupported |
| Halo Infinite | — | ⛔ Unsupported |
| Splitgate 2 | — | ⛔ Unsupported |

Unsupported games can be used after you calibrate them with your own measurement. Corrections with sources are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

## ⚠️ Accuracy limitations

- Conversions match **hipfire** 360° distance. The ADS calculator gives a FOV-based starting point, but games apply scoped sensitivity differently.
- Matching cm/360° does not guarantee identical feel. FOV, input processing, raw input, frame rate and acceleration all play a part.
- *Approximate* games rely on limited community measurements or on settings that can change rotation, such as Rainbow Six Siege's `MouseSensitivityMultiplierUnit`. Verify by measuring a 360° turn in-game.
- Calibration assumes linear scaling. For a non-linear slider (PUBG), a calibration is only accurate near the sensitivity you measured.
- The aim style bands and mousepad presets are common rules of thumb and typical sizes, not measurements of skill or specific products.

<details>
<summary><b>🧮 The math</b></summary>
<br />

Everything lives in [`src/core`](src/core): pure TypeScript with no UI dependencies, covered by unit tests.

**Sensitivity** ([`core/sensitivity`](src/core/sensitivity))

```
degrees per count = yaw × sensitivity
cm/360°           = 360 / (degrees per count × DPI) × 2.54
eDPI              = DPI × sensitivity
target sens       = source degrees per count × source DPI / target DPI / target yaw
calibrated yaw    = 360 × 2.54 / (cm/360 × DPI × sensitivity)
```

**Aim tools** ([`core/tools`](src/core/tools))

```
ADS ratio (monitor distance p, 0 < p ≤ 1) = atan(p · tan(zoom/2)) / atan(p · tan(hip/2))
ADS ratio (focal length, p → 0)           = tan(zoom/2) / tan(hip/2)
magnification                             = tan(hip/2) / tan(zoom/2)
counts per poll                           = speed (cm/s) / 2.54 × DPI / Hz
turns across pad                          = pad width / cm/360
```

**Brackets** ([`core/tournament`](src/core/tournament)). A tournament is a fixed match graph plus recorded results. Participants, byes, walkovers and the champion are derived from the graph every time. Editing an earlier score automatically invalidates later results that no longer apply, and imported files can't inject a bracket structure: the graph is always rebuilt from the participants. Property tests play hundreds of random results across every bracket size and check that each double-elimination bracket from 3 to 20 entrants completes, with every non-champion losing exactly twice.

- Calculations use full double precision; rounding only happens for display.
- FOV conversion uses `hFOV = 2·atan(tan(vFOV/2) · aspect)`.

</details>

## 🖥️ Windows desktop app

Download `Aimless-v2.0.0-Portable.exe` (a single file) or `Aimless-v2.0.0-Windows-NoInstall.zip` (extract it and run `Run-Aimless.bat` or `Aimless.exe`) from the [latest release](https://github.com/pzxe/Aimless/releases/latest).

Nothing is installed and the app never asks for administrator rights (`requestedExecutionLevel: asInvoker`). It opens straight into the workspace; the presentation page is one click away in the top bar. The window can't navigate away from the bundled files, and all permission requests are denied.

<details>
<summary><b>🛡️ Windows SmartScreen notes</b></summary>
<br />

`Run-Aimless.bat` runs `Unblock-File` on `Aimless.exe` before starting it. This removes the "downloaded from the internet" mark, so the exe itself starts without the SmartScreen prompt. **The builds are not code-signed**, so Windows can still warn:

- The `.bat` you extracted also carries the internet mark, so Windows may show a warning when you open it the first time.
- The portable `.exe` is unsigned and new, so SmartScreen may show "Windows protected your PC". Choose **More info → Run anyway**.
- Windows 11 **Smart App Control**, when enabled, blocks unsigned apps entirely.

The only reliable way to remove these warnings is to sign the builds with a code-signing certificate. If you'd rather not run an unsigned app, the [web version](https://pzxe.github.io/Aimless/) is the same app. Each release lists SHA-256 checksums.

</details>

## 🌐 Languages

English, العربية, Español, Русский and Português, switchable from the top bar or Settings. Arabic uses a full right-to-left layout. A test checks that every key exists, is non-empty and uses the same placeholders in all five languages. Translations other than English were written for this project; corrections from native speakers are very welcome.

## 🚀 Getting started

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev          # start the dev server
npm test             # run the test suite (Vitest)
npm run build        # type-check and build to dist/
npm run preview      # serve the production build
```

<details>
<summary><b>More scripts</b></summary>
<br />

| Script | What it does |
|---|---|
| `npm run dist:win` | Builds the Windows portable `.exe` and no-install `.zip` into `release/` |
| `npm run electron:start` | Builds and runs the desktop app locally |
| `npm run screenshots` | Captures the README screenshots (starts its own preview server) |
| `npm run gifs` | Records the README GIF demos (starts its own preview server) |
| `npm run icon` | Regenerates `build/icon.png` and `build/icon.ico` from the SVG logo |

Screenshots and GIFs drive your installed Google Chrome through `playwright-core`, so no browser download is needed.

</details>

Every push to `main` is tested, built and deployed to GitHub Pages automatically.

## 🗂️ Project structure

```
src/
  core/
    sensitivity/      conversion engine
    tools/            mousepad, ADS, polling, aim style
    tournament/       bracket generation, resolution, import/export
  data/games/         game database
  store/              Zustand stores persisted to localStorage
  i18n/               en, ar, es, ru, pt
  components/         UI, layout, landing, tools, tournament, games, converter, profiles
  pages/              Landing, Dashboard, Converter, Compare, Tournaments, Mousepad, Tools, …
electron/             desktop wrapper (main process)
scripts/              screenshot, GIF and icon generators
```

**Tech stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Lucide icons, Sonner toasts, Vitest and Electron. Fonts (Inter, Oswald, Noto Sans Arabic) are bundled locally.

## 🔒 Privacy and security

- All data is stored in `localStorage` on your device. Nothing is sent anywhere.
- Imported profile and tournament files are parsed with `JSON.parse` only, size-limited and validated field by field. Unknown fields are dropped, and tournament structures are rebuilt rather than trusted. An imported file cannot execute code.
- Exported bracket images escape all user text.

## 🤝 Contributing

Contributions are welcome, especially **sourced** game data and translation fixes. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, or [open an issue](https://github.com/pzxe/Aimless/issues) to request a game.

## 📄 License

[MIT](LICENSE)

Game names are trademarks of their respective owners. This project is not affiliated with or endorsed by any game publisher. It uses no game artwork: game badges are text-based placeholders, and all imagery is original.
