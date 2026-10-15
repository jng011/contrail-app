# Contrail website: notes for coding agents

This repo is the public website for **Contrail**, an iPhone golf shot tracer (App Store app 6822867212,
bundle `com.contrail.golf`). It's a small static site served by a Cloudflare Worker at
**https://contrailgolf.app**. Sammy manages it, and Jayden owns the domain and the Cloudflare account.

The app's code lives elsewhere (`jng011/golf-shot`). Nothing about how the tracer works internally belongs here.

## How it deploys

- Every push to `main` deploys automatically. Cloudflare Workers Builds runs `npx wrangler deploy` with
  `wrangler.jsonc`, which serves `./public` as static assets. There's no server code and no build step.
- Live in about a minute at `https://contrailgolf.app` (also `www.` and `contrail-app.jaydenghiyam.workers.dev`).
- No API key is needed and none is shared: the deploy runs inside Cloudflare, triggered by GitHub.
- Other branches don't deploy. For bigger changes, use a branch and a PR into `main`.
- Preview locally: `npx wrangler dev` → http://localhost:8787.
- Check the deploy: open the site, or look at the commit's status on GitHub.

## Layout

```
public/            everything here is served as-is
  index.html       /          home
  support.html     /support   App Store "Support URL"   (must always work)
  privacy.html     /privacy   App Store "Privacy Policy URL" (must always work)
  404.html         any unknown path
  style.css        shared styles (tokens in :root)
wrangler.jsonc     Worker config: name contrail-app, assets dir, 404 handling
AGENTS.md          this file (not served)
README.md          short human summary (not served)
```

URLs have no `.html` (`html_handling: auto-trailing-slash`), so link to `/support` and not `support.html`.
**Never rename or remove `/support` or `/privacy`:** App Store Connect points to them, and Apple rejects
apps whose support or privacy links break.

## Rules for the copy

1. **Only claim what the shipping app does.** Check the app (`jng011/golf-shot`, `App/`) before you add
   a feature. Today it:
   - records a range session at 240 fps with camera, microphone, motion, compass, location and LiDAR (on iPhones that have it)
   - finds each shot on its own (no tapping between swings; the ball is found on the first swing;
     tapping a ball that's already down is optional and locks focus/exposure)
   - cuts each shot into its own clip and draws the ball's flight over the video
   - saves kept shots to Photos with the tracer drawn in
   - is free to download, has a 7-day free trial **the user starts** (a $0 in-app purchase), then a
     **one-time $2.99 unlock**: no subscription, nothing renews, nothing is charged automatically
   - needs iOS 26+ and works best on iPhone 15 Pro or later

   It does **not** (yet) show launch numbers, carry distance, club data, or swing analysis, and has no
   Apple Watch app. Don't mention any of these until they ship.
2. **The privacy policy must match the app exactly.**
   - No account, no server, no analytics, no ads, no tracking. Everything stays on the iPhone.
   - Permissions: Camera, Microphone, Motion & Fitness, Location (while using), Photos (add only).
     These come from `App/project.yml` → `NS…UsageDescription` in `jng011/golf-shot`; if those change,
     update this page.
   - Full session recordings are excluded from iCloud Backup; kept shots are included with normal app data.
   - Purchases are handled by Apple; the app never sees payment details.
   - Update "Last updated" whenever the policy changes. If the app ever starts collecting data, the App
     Store privacy label must change too: tell Jayden first.
3. **The site itself collects nothing:** no analytics, cookies, trackers, embeds, third-party scripts or
   fonts from other domains. The privacy policy promises this. Keep everything self-hosted in `public/`.
4. **Prices:** write "$2.99" only where a US price is fine. The App Store shows local prices elsewhere.
5. **No technical detail about the tracer:** don't describe how detection, tracking or physics work, which
   models are used, or accuracy numbers. Keep it to what the user does and sees.
6. **No other brands:** no competitor names, and no Apple trademarks beyond the plain device and OS names.
   Use Apple's official App Store badge if you add one, following Apple's badge guidelines.
7. **Contact:** jaydenghiyam@gmail.com, unless Jayden says otherwise.

## Design

- Dark, quiet and fast. Tokens live in `public/style.css` `:root`: ink `#1d1b1c`, text `#eeece7`, accent
  `#c8f169` (the tracer lime).
- Brand assets (icon, Comet mascot): `jng011/golf-shot` → `docs/brand/`. Follow `docs/brand/mascot/README.md`.
  Export what you need into `public/` (SVG or optimised PNG/WebP) rather than hot-linking.
- Phone first: it must work at 320 px wide with no horizontal scroll. Respect `prefers-reduced-motion`.
- Accessibility: real headings, alt text, contrast at least 4.5:1, visible focus styles.
- Keep pages light: no frameworks are needed. If you add a build step, update `wrangler.jsonc` and this
  file, and make sure `npx wrangler deploy` still works from a clean clone.

## Checklist before pushing to main

- [ ] `/`, `/support`, `/privacy` and an unknown path all load (`npx wrangler dev`).
- [ ] Every claim is true of the current App Store / TestFlight build (rule 1).
- [ ] The privacy page still matches the app (rule 2), and "Last updated" was bumped if it changed.
- [ ] No third-party requests: open DevTools → Network, and only contrailgolf.app is listed.
- [ ] Checked at 320 px and 1280 px wide.
