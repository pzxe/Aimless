# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [2.3.0] - 2026-11-07

### Added
- **In-app auto-updater** (desktop), built on GitHub Releases with no code signing and no extra dependencies.
  - **Check:** `GET /repos/pzxe/Aimless/releases/latest` (`User-Agent: Aimless-Updater`), compared with strict semver (`2.10.0` > `2.9.0`, a pre-release is older than its release). Runs by itself 3 seconds after launch (toggle, on by default) and on demand with **Check for Updates**.
  - **Download:** streamed into `%TEMP%` with live `update:progress` events (percent, transferred bytes, total bytes, speed) shown as a progress bar with MB and MB/s, plus Cancel.
  - **Install:** one click on **Update & Restart Now**. A short PowerShell script waits for the app to exit, installs, repairs the Desktop and Start menu shortcuts through `WScript.Shell`, starts the new version and deletes itself.
    - *Setup install:* runs `Aimless-vX-Setup.exe /S` (silent, same install folder).
    - *Portable .exe:* puts the new file next to the old one under its new name, deletes the old one and repoints the shortcut.
    - *No-install ZIP folder:* unpacks the new ZIP over the folder.
  - **Safety:** downloads only from GitHub's hosts; a redirect to any other host is refused before it is contacted; only the latest non-draft, non-pre-release of this repository is considered; the file must match the SHA-256 GitHub publishes for it, and the hash is checked again right before it runs; a release without a published checksum is never installed automatically (a manual download link is offered). Nothing installs without your click.
  - `electron-builder` now has `publish: github (pzxe/Aimless)`, so `latest.yml` is generated and attached to releases.
- **Application Updates** card at the top of Settings: version badge, last-checked time, live states (checking with spinner, up to date, update available with title, size and collapsible release notes, downloading with progress, ready to install, installing, error with Try again and a manual download link), **Check for Updates**, "Automatically check for updates on startup" (on), "Auto-download updates in background" (off) and **Refresh Desktop Shortcut**. The toggles are saved in the settings store and pushed to the main process.
- A dot on **Settings** in the sidebar while an update is available, downloading or ready.
- **Web app:** the same card checks the latest release, shows whether a newer version or Windows app exists, clears stale cached copies, and offers a one-click "Clear cache & reload" or the direct Windows installer download. It never contacts GitHub until you click.
- 51 new strings in all five languages. 26 new tests (203 in total), including a check that the generated PowerShell is accepted by the real PowerShell parser even with hostile quotes in the paths.

### Changed
- "Refresh Desktop Shortcut" moved from the Defaults card into the Application Updates card.
- The privacy text now says the only network requests are rank lookups and update checks.

### Fixed
Found by running the real packaged apps through a full update against a mock GitHub (ZIP, Portable and Setup; 46 checks) before release:
- Every update would have been refused as coming from an untrusted host: Electron's `net.fetch` leaves the response URL empty, so the origin could not be checked. A redirect to a foreign host was also contacted before being refused. Downloads now use `net.request` with manual redirects and vet the URL and every hop before any request is made.
- The updater script never started: it was launched `detached`, which gives PowerShell no console, so it exited silently. It is now started through `Start-Process`, and the app quits only after the launcher has finished.
- Shortcut repair rewrote **any** `Aimless.lnk` it found. With an installed copy and a portable copy side by side, updating one would have repointed the other's shortcut. It now only repairs shortcuts that point at the app being updated.

### Known limitations
- v2.2.2 and older have no updater: install v2.3.0 by hand once; later releases can update themselves.
- The builds are not code-signed, so Windows SmartScreen may warn on a manual download.
- The portable build is renamed to the new version's file name when it updates (for example `Aimless-v2.3.0-Portable.exe` becomes `Aimless-v2.4.0-Portable.exe`).

## [2.2.2] - 2026-11-07

### Added
- **Quick action row** at the bottom of the sidebar (desktop sidebar and mobile menu), right above "All data stays on this device": four equal buttons with hover tooltips.
  - GitHub icon opens the developer's profile (`github.com/pzxe`), tooltip "Developer GitHub (@pzxe)".
  - Star icon with a gold glow opens the repository, tooltip "Star Aimless on GitHub".
  - Twitch icon opens `twitch.tv/1usl`, tooltip "Watch 1usl on Twitch".
  - Sparkles icon opens the releases page, tooltip "Releases & Updates".
  - They are real links (`target="_blank"`, `rel="noopener noreferrer"`): a new tab on the web, and the default browser in the desktop app (the window's open handler sends https links to `shell.openExternal`, so they never load inside the app window).
- **Developer & Tech Stack** card in Settings: clickable badges for TypeScript, React 19, Electron, Tailwind CSS 4, Vite, Zustand, Node.js and Vitest (each links to the project's site), and four clickable contact cards: Twitch (`1usl`), X / Twitter (`@87lx`), GitHub (`pzxe`) and Discord (`1usl`). The Discord card copies the username and shows "Discord username '1usl' copied!"; a button beside it opens Discord in the browser (Discord has no public profile URL for a username).
- 15 new strings in all five languages (en, ar, es, ru, pt). 4 new tests (177 in total).

### Fixed
- Found while testing: the leftmost quick-action tooltip was cut off by the window edge. The outer tooltips now align to their button's edge.

## [2.2.1] - 2026-11-07

### Added
- **Real game icons for 104 of the 125 games**, bundled in `public/game-icons/` (160×160 WebP, about 800 KB), so they work offline in the desktop app and on the web. `scripts/fetch-game-icons.mjs` finds each game with the Steam Store Search API, takes the official client icon from Steam's CDN and falls back to Wikipedia / official favicons for non-Steam titles. Every icon was checked by eye; wrong or generic ones (a publisher logo shared by many games, a blank tile) were rejected. The other 21 games, mostly shut-down or off-Steam titles, keep the generated badge, which is also the automatic fallback if an image fails to load. Shown in the game picker, Games page, converter, compare, profiles, tournaments and the landing page.
- **Alt Accounts** page (Library → Alt Accounts): a local vault for main and alt accounts.
  - Fields: account name, game, username / email, password (masked, show/hide), in-game ID, rank, RR, region, status (ranked ready, cooldown, phone verified, warmup, banned, inactive), notes and an optional linked sensitivity profile that loads into the converter in one click.
  - One-click **copy username / password / tag** with a toast that never echoes the secret; search, filters (game, region, status, favourites) and sorting (recent, highest rank, name, game).
  - **AES-GCM (256-bit) encryption at rest** through the Web Crypto API, an optional **PIN / passphrase lock** (PBKDF2-SHA-256, 210,000 iterations, random salt; the key exists only while unlocked) with a Lock button, and **encrypted JSON export / import** protected by its own passphrase.
- **Live rank tracker** on every account card:
  - **Overwatch 2** through the keyless OverFast API (`#` is converted to `-` in BattleTags): avatar, namecard, title, endorsement level and the PC competitive rank of Tank, Damage, Support and Open Queue with the official rank icons. Private profiles show a clear notice.
  - **Valorant** through the HenrikDev API: current rank with its official icon, RR progress bar with points to rank up, last-game RR change, peak rank and season, level and region auto-detected. Official tier icons and colours come from valorant-api.com and are bundled as an offline snapshot that refreshes itself.
  - **Manual rank and RR** (with the official Valorant icons) for every game, for offline use or when rate-limited.
  - Tracker deep links: Tracker.gg (Valorant, Overwatch 2, CS2, Apex, Siege, Warzone, Marvel Rivals, PUBG), Leetify (CS2), OP.GG (Valorant, PUBG), Blizzard and OverFast (Overwatch 2), Fortnite Tracker.
  - Optional free HenrikDev API key field with an ⓘ explanation. Each card has a **Refresh rank** button and "Updated X min ago".
- **Desktop: `fetch-live-rank` IPC.** Rank requests run in the Electron main process, so browser CORS never applies. It only accepts HTTPS GET requests to `overfast-api.tekrop.fr`, `api.henrikdev.xyz` and `valorant-api.com`, refuses redirects, and caps time and size.
- 140 new strings in all five languages.
- 56 new tests (173 in total): BattleTag and Riot ID parsing, tracker URL builders, AES-GCM round trips / wrong passphrase / tampering, rank parsers, the fetch flows, the vault store (ciphertext at rest, PIN lock, backup), and the games data.

### Changed
- **Accuracy audit:** Titanfall 2 is now **Verified** (Source 0.022° yaw, published consistently by independent sensitivity databases). The totals are 26 verified, 23 approximate and 76 unsupported. Other candidates were examined and deliberately **not** upgraded because sources conflict or none exists: Deadlock (0.022 vs 0.044), Halo Infinite (0.0225, 0.135 and 0.022), Marvel Rivals (0.022 is community-reported only), Krunker, Doom (2016), Call of Duty 4, Quake Champions (converters agree, but no developer source). Counter-Strike 1.6 / Source, Left 4 Dead 2, Portal 2, Day of Defeat and Black Mesa were already verified.
- The privacy text now says the only network requests are rank lookups you start yourself (it used to say none).
- "Clear all data" also wipes the Alt Accounts vault, and its confirmation says so.

### Fixed
- A late rank-refresh result can no longer write to a locked vault, which would otherwise have replaced it with an empty one (covered by a test).
- Copying a password no longer shows it in the toast (the shared copy helper gained a secret mode).
- Arabic full stops no longer jump to the wrong side after a Latin game name in the new strings.

### Known limitations
- HenrikDev now requires a free API key for every endpoint. Without one, Valorant live rank cannot load and the app says so; manual rank and RR still work. OverFast needs no key. The Valorant request path (v1 account, v2 MMR with a v3 fallback) was tested against mocked responses, not a real key.
- Rank icons for Overwatch 2 are loaded from Blizzard's CDN, so they need a connection; the rank text works offline.
- OP.GG profile URLs were built from their public URL patterns and were not opened one by one.

## [2.1.1] - 2026-11-07

### Added
- **Setup installer** `Aimless-v2.1.1-Setup.exe`: per-user (no administrator rights), creates an Aimless icon on the Desktop and in the Start menu. The Portable `.exe` and the NoInstall ZIP stay available.
- **Create desktop shortcut** for the portable build: a one-time prompt on first run and a button in Settings (Windows).
- **macOS-style title bar** in the desktop app: a frameless window with red / yellow / green traffic lights on the top-left (close, minimize, maximize/restore), a 38 px themed bar with the app name, native drag, double-click maximize, edge resizing, Aero Snap and Alt+F4. macOS keeps its native controls.
- New text-free app icon and logo (rotation ring, three crosshair ticks and a core diamond): `public/favicon.svg`, the in-app logo, `build/icon.png` and a multi-size `build/icon.ico`.

### Changed
- **Typography:** Space Grotesk (display / UI), IBM Plex Sans (Cyrillic), IBM Plex Sans Arabic (Arabic) and JetBrains Mono with tabular numerals for cm/360°, eDPI and sensitivity values. All fonts are bundled locally and work offline. Line height, weight and letter spacing were tuned; Arabic has no letter spacing.
- Cards and boxes in grid rows now share equal heights and aligned action buttons across all pages in LTR and RTL, desktop and mobile.

### Fixed
- Arabic: the window controls were drawn on the right; they now stay top-left.

## [2.1.0] - 2026-11-06

### Added
- **125 games** (up from 20), each with an original illustrated emblem bundled with the app and shown in the game picker, Games page, converter and compare. The honesty rules are unchanged: 25 verified, 24 approximate with a note explaining why, and 76 unsupported that you can calibrate with one measured 360° turn. No constants were invented.
- **Tournament overhaul:**
  - Team size: Solo (1v1), Duo (2v2) or Custom (any size up to 10), with any number of entrants.
  - 🎲 **Randomize** replaces the seeding option. It works while creating a tournament and on an existing bracket (with a confirmation when results would be cleared).
  - Series length from Bo1 to Bo15, set as a default and per stage (for example Bo1 early and Bo5 in the final). Each round shows its Bo chip.
  - Game-by-game results: map, score and overtime for each game. The series score and winner are worked out automatically, and games after the decider are locked. Quick series-score buttons are still there.
- **ⓘ help tips** next to fields, calculators, tournament controls and settings. They open on hover, focus or tap, close with Escape, and are translated into all five languages.
- Genre filter on the landing page's game wall.

### Changed
- **Landing page redesign:** a new hero (headline, a crossfading collage of real converter, tournament and tool pieces with a pause button, and one large call to action), a filterable wall of game emblems, a reworked feature grid and closing download section. The type system is now Geist and Geist Mono.
- The top bar is transparent at the top of the page, hides when you scroll down and comes back when you scroll up.
- The "Presentation" button was removed from the app. The landing page stays at `#/welcome`, and the desktop app opens on the dashboard.
- Scroll-in animations were removed from the landing page. Content is shown at rest.
- Visual polish across pages: spacing, select chevrons, arrow-key stepping in number fields.

### Fixed
- The tournament creator's error message was out of view at the bottom of the form, so "Generate bracket" seemed to do nothing. Errors now show beside the buttons, and an empty name falls back to the placeholder.
- The Games page overflowed sideways on phones.
- In Arabic, the hero collage reversed "1.00 · 800".

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
