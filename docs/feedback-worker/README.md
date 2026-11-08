# Aimless feedback proxy

The in-app **Send feedback** form creates a GitHub issue on `pzxe/Aimless`. Creating an issue needs a GitHub token,
and a token inside a desktop or web app can be extracted by anyone, so the app never holds one. It posts the
feedback to this tiny proxy instead; the proxy keeps the token as a server-side secret and creates the issue.

Until the proxy exists, the form still works: it opens a pre-filled "New issue" page on GitHub (and copies the text).

## Deploy (Cloudflare Workers, the free plan is enough)

1. Create a **fine-grained personal access token** at https://github.com/settings/personal-access-tokens:
   repository access: only `pzxe/Aimless`; permission: **Issues: Read and write**; nothing else.
2. In this folder:
   ```
   npx wrangler login
   npx wrangler deploy worker.mjs --name aimless-feedback --compatibility-date 2025-01-01
   npx wrangler secret put GITHUB_TOKEN --name aimless-feedback
   ```
3. Note the URL it prints, for example `https://aimless-feedback.<you>.workers.dev`.
4. Build the app with that URL (PowerShell):
   ```
   $env:VITE_FEEDBACK_ENDPOINT = 'https://aimless-feedback.<you>.workers.dev'
   npm run build
   npm run dist:win
   ```
   Builds made without the variable use the pre-filled issue page instead.
5. Recommended: add a Cloudflare **Rate limiting rule** for the worker route (for example 5 requests per minute per IP).
   The worker also has a small in-memory limiter, but a platform rule is the hard limit.

## What it accepts

`POST` with a JSON body (sent as `text/plain` so browsers skip the CORS preflight):

```json
{ "type": "bug", "title": "3 to 120 characters", "body": "10 to 2000 characters",
  "meta": { "version": "2.5.3", "platform": "Win32", "language": "en" } }
```

`type` is `bug`, `feature` or `other`.

* The request is capped at 8 KB, titles and bodies are length-checked, and a hidden honeypot field rejects bots.
* `@mentions` and `#123` references are made inert, so a message cannot ping people or link other issues.
* The issue gets the labels `feedback` plus `bug`, `enhancement` or `question`.
* Answers: `201 {number, url}`, `400` invalid, `413` too large, `429` rate limited, `502` GitHub failed.

## Why not call the GitHub API straight from the app?

The GitHub REST API needs authentication to create an issue. A token shipped in the app is public the moment the app
is downloaded, and anyone could use it to spam or modify the repository.
