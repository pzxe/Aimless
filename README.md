<div align="center">

<img src="public/favicon.svg" width="80" height="80" alt="Aimless logo" />

# Aimless

**Carry your aim between games, matched to the millimetre.**<br />
**انقل تصويبك بين الألعاب بنفس المسافة، بدقة حتى المليمتر.**

A local-first FPS mouse sensitivity converter. It matches the real distance your mouse travels for a 360° turn, with honest accuracy labels for every game, in English and Arabic.

[![CI](https://img.shields.io/github/actions/workflow/status/pzxe/Aimless/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/pzxe/Aimless/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/website?url=https%3A%2F%2Fpzxe.github.io%2FAimless%2F&label=live%20demo&up_message=online&down_message=offline&logo=githubpages&logoColor=white)](https://pzxe.github.io/Aimless/)
[![Latest release](https://img.shields.io/github/v/release/pzxe/Aimless?label=release&color=8b7cff)](https://github.com/pzxe/Aimless/releases/latest)
[![License: MIT](https://img.shields.io/github/license/pzxe/Aimless?color=blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](tsconfig.app.json)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](package.json)
[![Local-first](https://img.shields.io/badge/local--first-zero%20telemetry-3fcf8e?logo=shield&logoColor=white)](#privacy-and-security)

[![🚀 Live Web Preview](https://img.shields.io/badge/🚀_Live_Web_Preview-8b7cff?style=for-the-badge)](https://pzxe.github.io/Aimless/)
[![⬇️ Download Portable .exe](https://img.shields.io/badge/⬇️_Download_Portable_.exe-1f2633?style=for-the-badge)](https://github.com/pzxe/Aimless/releases/latest/download/Aimless-v1.0.0-Portable.exe)
[![📦 Download No-Install .zip](https://img.shields.io/badge/📦_Download_No--Install_.zip-1f2633?style=for-the-badge)](https://github.com/pzxe/Aimless/releases/latest/download/Aimless-v1.0.0-Windows-NoInstall.zip)
[![🐛 Report Bug / Request Game](https://img.shields.io/badge/🐛_Report_Bug_%2F_Request_Game-1f2633?style=for-the-badge)](https://github.com/pzxe/Aimless/issues)

<img src="docs/screenshots/demo-converter.gif" width="900" alt="Converting Valorant to Overwatch 2: live results, swap, and the step-by-step calculation" />

<img src="docs/screenshots/demo-compare-rtl.gif" width="900" alt="Matching four games to one cm/360°, then switching to Arabic (RTL) and toggling light and dark themes" />

</div>

<details>
<summary><b>🌍 نبذة عن الأداة بالعربية</b></summary>
<br />
<div dir="rtl">

**Aimless** أداة مجانية ومفتوحة المصدر لتحويل حساسية الماوس بين ألعاب التصويب. بدل الاعتماد على أرقام تقريبية، تطابق الأداة **المسافة الفعلية التي يتحركها الماوس لدورة كاملة 360°** (سم/360°)، باستخدام ثابت الدوران الخاص بكل لعبة.

- **محوّل دقيق:** اختر لعبة المصدر واللعبة الهدف وقيمة DPI لكل منهما، وشاهد النتيجة وخطوات الحساب مباشرة.
- **دقة واضحة:** كل نتيجة موسومة بـ *موثّق* أو *تقريبي* أو *معايَر* أو *غير مدعوم*، ولا نخمّن أي ثابت.
- **معايرة:** قِس سم/360° بنفسك داخل اللعبة لاستخدام الألعاب غير المدعومة.
- **مقارنة وملفات شخصية:** قارن عدة ألعاب، واحفظ إعداداتك واستوردها أو صدّرها بصيغة JSON.
- **خصوصية كاملة:** كل البيانات تبقى على جهازك، بلا حسابات ولا تتبّع ولا اتصال بالإنترنت.
- **واجهة عربية كاملة** من اليمين إلى اليسار، مع سمة داكنة أو فاتحة.

**التشغيل:** جرّب [النسخة على الويب](https://pzxe.github.io/Aimless/)، أو حمّل [الملف التنفيذي المحمول](https://github.com/pzxe/Aimless/releases/latest) لويندوز. النسخة غير موقّعة رقميًا، لذا قد يظهر تحذير SmartScreen. اختر «مزيد من المعلومات» ثم «التشغيل على أي حال».

**ملاحظة:** التحويل يطابق مسافة الدوران بدون تصويب (hipfire) فقط، وقد يختلف الإحساس بين الألعاب بسبب مجال الرؤية ومعالجة الإدخال.

</div>
</details>

---

## ✨ Features

| | |
|---|---|
| 🎯 **Converter** | Source and target games with independent DPI, live cm/360° and eDPI, swap, copy, and a step-by-step calculation. Shows the nearest value the target game accepts, with the rounding error. |
| 🏷️ **Honest accuracy labels** | Every result is *Verified*, *Approximate*, *Calibrated* or *Unsupported*, with notes explaining why. No constants are invented. |
| 📏 **Calibration** | Measure your own cm/360° in any game to unlock conversions for unsupported titles. |
| 📊 **Compare** | Line up games or profiles, match them all to a reference in one click, and see a cm/360° chart. |
| 👤 **Profiles** | Create, edit, duplicate, favorite, search and delete profiles. Import and export them as validated JSON. |
| 🕘 **History** | Recent conversions are saved locally and can be reused or cleared. |
| 🧰 **Tools** | cm/360° calculator, sensitivity for a target distance, DPI change, eDPI and FOV conversion (horizontal, vertical, 4:3). |
| 🌐 **English and Arabic** | Full RTL layout, dark, light or system theme, adjustable precision, responsive down to phone width. |
| 🔒 **Local-first** | No accounts, no tracking, no network requests. Data stays in your browser. |
| 🖥️ **Desktop app** | An offline Windows build, portable `.exe` or no-install `.zip`. No admin rights needed. |

## 📸 Screenshots

| | |
|---|---|
| ![Converter: Valorant to Overwatch 2](docs/screenshots/converter-dark.png) | ![Compare view with cm/360° chart](docs/screenshots/compare-dark.png) |
| **Converter.** Valorant → Overwatch 2, with the nearest value the game accepts and the step-by-step calculation. | **Compare.** Four games matched to the same cm/360°, with the distance chart. |
| ![Arabic right-to-left interface](docs/screenshots/converter-rtl-ar.png) | ![Games database with accuracy badges](docs/screenshots/games-calibration.png) |
| **Arabic (RTL).** The full interface mirrors for right-to-left reading. | **Games.** Every constant is labelled Verified, Approximate or Unsupported, and any game can be calibrated. |

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

Each game's notes in the app explain its classification. Unsupported games can be used after you calibrate them. Corrections with sources are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

## ⚠️ Accuracy limitations

- Conversions match **hipfire** 360° distance. Scoped and ADS sensitivity use separate per-game multipliers and are not converted.
- Matching cm/360° does not guarantee identical feel. FOV, input processing, raw input, frame rate and acceleration all affect how aim feels.
- *Approximate* games rely on limited community measurements or on settings that can change rotation, such as Rainbow Six Siege's `MouseSensitivityMultiplierUnit`. Verify by measuring a 360° turn in-game.
- Calibration assumes linear scaling. For a non-linear slider (PUBG), a calibration is only accurate near the sensitivity you measured.
- Game updates can change constants.

<details>
<summary><b>🧮 Calculation methodology (the math)</b></summary>
<br />

All calculations live in [`src/core/sensitivity`](src/core/sensitivity), a pure TypeScript module with no UI dependencies, covered by unit tests.

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

</details>

## 🖥️ Windows desktop app

| File | What it is |
|---|---|
| [`Aimless-v1.0.0-Portable.exe`](https://github.com/pzxe/Aimless/releases/latest/download/Aimless-v1.0.0-Portable.exe) | A single file. Double-click to run. |
| [`Aimless-v1.0.0-Windows-NoInstall.zip`](https://github.com/pzxe/Aimless/releases/latest/download/Aimless-v1.0.0-Windows-NoInstall.zip) | The unpacked app. Extract it anywhere and run `Run-Aimless.bat` (or `Aimless.exe`). |

Nothing is installed and the app never asks for administrator rights (`requestedExecutionLevel: asInvoker`). The window can't navigate away from the bundled files, and all permission requests (camera, microphone, notifications and so on) are denied.

<details>
<summary><b>🛡️ Windows SmartScreen notes</b></summary>
<br />

`Run-Aimless.bat` runs `Unblock-File` on `Aimless.exe` before starting it. This removes the "downloaded from the internet" mark, so the exe itself starts without the SmartScreen prompt. **The builds are not code-signed**, so Windows can still warn:

- The `.bat` you extracted also carries the internet mark, so Windows may show a warning when you open it the first time.
- The portable `.exe` is unsigned and new, so SmartScreen may show "Windows protected your PC". Choose **More info → Run anyway**.
- Windows 11 **Smart App Control**, when enabled, blocks unsigned apps entirely.

The only reliable way to remove these warnings is to sign the builds with a code-signing certificate. If you'd rather not run an unsigned app, use the [web version](https://pzxe.github.io/Aimless/). It is the same app.

Each release lists SHA-256 checksums so you can verify your download.

</details>

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
| `npm run screenshots` | Captures the README screenshots (needs `npm run preview` running) |
| `npm run gifs` | Records the README GIF demos (starts its own preview server) |
| `npm run icon` | Regenerates `build/icon.png` and `build/icon.ico` from the SVG logo |

Screenshots and GIFs drive your installed Google Chrome through `playwright-core`, so no browser download is needed.

</details>

The web build is a static site with a relative base path and hash routing, so `dist/` can be hosted anywhere. Every push to `main` is deployed to GitHub Pages automatically.

## 🗂️ Project structure

```
src/
  core/sensitivity/   calculation engine (pure, unit tested)
  data/games/         game database
  store/              Zustand stores persisted to localStorage
  i18n/               English and Arabic dictionaries
  components/         UI primitives, layout, games, converter, profiles
  pages/              Dashboard, Converter, Compare, Profiles, History, Tools, Games, Settings
  hooks/  utils/
electron/             desktop wrapper (main process)
scripts/              screenshot, GIF and icon generators
```

**Tech stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Lucide icons, Sonner toasts, Vitest and Electron. The UI components are written in the shadcn/ui style, without its CLI. Fonts are bundled locally.

## 🔒 Privacy and security

- All data is stored in `localStorage` on your device. Nothing is sent anywhere.
- Imported JSON is parsed with `JSON.parse` only, size-limited to 2 MB and validated field by field. Unknown fields are dropped. An imported file cannot execute code.

## 🤝 Contributing

Contributions are welcome, especially **sourced** game data. Read [CONTRIBUTING.md](CONTRIBUTING.md) before adding or changing a game constant, or [open an issue](https://github.com/pzxe/Aimless/issues) to request a game.

## 📄 License

[MIT](LICENSE)

Game names are trademarks of their respective owners. This project is not affiliated with or endorsed by any game publisher. It uses no game artwork: game badges are text-based placeholders.
