# Contributing

Thanks for helping improve Sensitivity Converter.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

Before opening a pull request, make sure `npm test` and `npm run build` both pass. CI runs them on every push and pull request.

## Adding or changing a game

Game data lives in [`src/data/games/games.ts`](src/data/games/games.ts).

1. **Only use a constant you can source.** Link a developer statement, the game's config files, or several independent measurements that agree. Put the sources in your PR description.
2. **Never guess.** If sources disagree or none exist, add the game with `formula: null` and `accuracy: 'unsupported'`. Users can still calibrate it.
3. Use `accuracy: 'approximate'` when a value has limited confirmation or depends on settings players may change.
4. Set `sensitivityStep` only if you know the smallest step the game accepts.
5. Set `nonLinearSlider: true` if the in-game slider is not linear.
6. Add a note under `note.<gameId>` (or reuse an existing note) in **all five** dictionaries in `src/i18n/` (`en`, `ar`, `es`, `ru`, `pt`). The i18n tests fail if a key is missing, empty, or its placeholders differ.
7. Do not add copyrighted logos or artwork. Games use the text badge (`short` + `color`).
8. Add or update tests in `src/core/sensitivity/sensitivity.test.ts` for any new formula behaviour.

A non-linear game needs a new formula `kind` in `src/core/sensitivity/types.ts` and `formulas.ts`, with both directions (sensitivity → degrees and degrees → sensitivity) implemented and tested.

## Translations

Every UI string lives in `src/i18n` (English is the source; Arabic, Spanish, Russian and Portuguese must stay in sync). Native-speaker corrections are very welcome. Don't hardcode user-facing text in components. Keep game names, DPI and units in Latin script in Arabic, since that is what players see in-game.

## Code style

- Keep the calculation engine (`src/core`) free of React and browser APIs.
- Prefer small components and logical CSS properties (`ms-`, `pe-`, `start-`) so RTL keeps working.
- Treat anything read from storage or imported files as untrusted and validate it.

## Reporting issues

Please include the games, DPI and sensitivity values, the result you got, and what you expected. Include how you measured it, if you did.
