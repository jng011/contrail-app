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
  terms.html       /terms     Terms of Use (linked from every nav and footer)
  404.html         any unknown path
  style.css        shared styles for /privacy, /terms, /support and 404 (tokens in :root)
  assets/          everything the pages load, self-hosted (rule 3):
    fonts/         Poppins woff2 subsets + OFL.txt (licence)
    vendor/        gsap.min.js, ScrollTrigger.min.js (GSAP 3.12.5), lenis.min.js (Lenis 1.1.13)
    img/           photos as responsive WebP + ATTRIBUTION.csv (source, photographer, licence for each)
    screens/       app screenshots as WebP at 720w + 1080w (srcset), from 1206x2622 simulator captures with a
                   clean 9:41 status bar and no painted Dynamic Island (the bezel draws the real one)
      duo/         the home page's #duo section: unfolded iPhone Duo screens (2853x2007 simulator captures) pre-composited
                   into Apple's "iPhone Duo - Night Sky - Inner Open Landscape" bezel, WebP at 720w + 1080w; plus
                   replay-outer.mp4 (+ poster), a 4.4 s loop of the outside-screen replay recorded from the Duo simulator
                   (-coverPreview, outer display, 1398x2034 = the bezel's screen opening), played under the outer bezel.
    device/        Apple's iPhone 18 Pro black bezel (Apple Design Resources) at 2x/1x + LICENSE-NOTE.txt.
                   Every phone on the site uses it (.phone / .phone-screen / .phone-bezel in index.html).
                   Also Apple's "iPhone Duo - Night Sky - Outer Open" bezel (WebP 720w/1080w) for the #duo 3D phone.
                   Use bezels unaltered (resize only) and never imply Apple endorsement.
    comet/         Comet keyframe files replayed on the home page
    demo/          the interactive app demo on the home page (#demo): demo.css + demo.js build a working mock of the
                   app inside the bezel (Home, Record, Finding your shots, Library, shot viewer, Settings, Comet's intro).
                   Range render crops as WebP (our own Blender render, see img/ATTRIBUTION.csv) and Comet's voice lines.
                   It reuses video/ clips and loads them only once a session starts. Nothing in the phone may link out or
                   navigate the page. Keep its copy to shipping features (rule 1): no Watch, Save to Photos or Share.
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
   - keeps every shot in a library grouped by day, where you can favorite, filter to favorites, and delete
   - needs iOS 26+ and works best on iPhone 15 Pro or later

   It does **not** (yet) show launch numbers, carry distance, club data, or swing analysis, and has no
   Apple Watch app. **Saving a shot to Photos with the tracer drawn in, and sharing the trimmed shot, are not
   built yet** (the exporter is a future PR; today "Save to Photos" is UI-only and Share sends the whole session
   video). Don't mention any of these until they ship.
   **iPhone Duo (#duo on the home page):** the Duo-optimized layout (unfolded, every screen in two halves) and the
   outside-screen replay are not in the App Store build yet, so the section carries a "Coming soon" tag. Don't say the
   app "runs on" iPhone Duo as a feature (every iPhone app does). Once the Duo build ships, remove the tag. The section
   sits after "How it works"; scroll turns the 3D phone (CSS-sticky stage + one scrubbed ScrollTrigger in its own
   script at the end of index.html, no JS pin), and reduced motion shows both sides flat.
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
4. **No prices or purchase terms anywhere on the site** (Jayden's rule): no price, no trial length, no
   "one-time", "free", "unlock" or "subscription" wording. The App Store shows that. Restore Purchases help
   on /support may stay, without terms.
5. **No technical detail about the tracer:** don't describe how detection, tracking or physics work, which
   models are used, or accuracy numbers. Keep it to what the user does and sees.
6. **No other brands:** no competitor names, and no Apple trademarks beyond the plain device and OS names.
   Use Apple's official App Store badge if you add one, following Apple's badge guidelines.
7. **Contact:** sammy@contrailgolf.app or jayden@contrailgolf.app (set by Sammy, the site manager, October 2026).


**Short sessions, not buckets (Jayden, contrail-app#4):** never say "record/hit your whole bucket" or "one take for the bucket". 1080p240 + sensors is about 4.3 MB/s (≈15 GB an hour) and the phone gets hot fast. Describe short sessions: a few swings, stop, let it process.

## Design

- Dark, quiet and fast. Tokens: ink `#1d1b1c`, text `#eeece7`, accent `#c8f169` (the tracer lime). They live in
  `public/style.css` `:root` and, for the home page, in its inline `<style>` (keep the two in sync).
- Liquid Glass only on things that float over content (the nav capsule, chips over the hero photo), never on cards
  or flat backgrounds, with `prefers-reduced-transparency` and `prefers-contrast` fallbacks.
- Motion (home page): GSAP ScrollTrigger + Lenis from `assets/vendor/`. The markup is always the final state; the
  script only adds motion when `prefers-reduced-motion` allows it. Swapping the hero photo: see the comment above
  `.hero-frame` in `index.html` (the tracer path is in the photo's own coordinates).
- Photos must be licence-clean (Pexels/Unsplash licence, CC0, or our own) and listed in `assets/img/ATTRIBUTION.csv`.
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
