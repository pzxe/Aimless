# Aimless: project rules

## Release notes and README copy (permanent rule)

- Every GitHub Release and every README update is **public product copy for gamers**. Write it in natural, short, friendly language, like a game patch note.
- **Never** write it as a conversational AI reply: no "I added…", "You asked for…", "I checked…", no internal test logs, no apologies, no mentions of the assistant or the build process.
- Release notes use this shape only: **✨ What's New**, **⚡ Improvements** (2–3 short bullets), **🐛 Bug Fixes** (2–3 user-facing bullets), **📦 Downloads** (a 2-line guide: `Setup.exe` vs `NoInstall.zip`, plus SHA-256 values).
- **Every newly added UI feature must be shown with a screenshot or GIF embedded in the release notes** (commit the image under `docs/screenshots/` and reference it with its `raw.githubusercontent.com/pzxe/Aimless/main/docs/screenshots/<file>` URL).
- Keep the README short and visual: hero, one section per main feature with its GIF, a 3-line download note, a minimal footer. No developer specs, build instructions, formulas or walls of screenshots there.
- Never claim something was tested unless it actually was.

## Project notes

- `npm test`, `npm run build`, `npm run dist:win`; README GIFs are recorded with `npm run build && npm run gifs` (`ONLY=<name>.gif` records one).
- Five languages (en, ar, es, ru, pt) must stay in parity; tests enforce it.
