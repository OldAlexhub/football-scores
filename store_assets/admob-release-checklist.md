# AdMob release checklist — Football Scores Today

Run through this before every production release.

- [ ] App is linked to the correct Google Play app listing inside AdMob (Apps → Football Scores Today → linked app).
- [ ] AdMob payment profile is complete and verified.
- [ ] AdMob "App readiness" status is green for Football Scores Today.
- [ ] `app-ads.txt` is published at the developer website root with the exact line copied from AdMob, and the site is reachable (see `app-ads-txt-instructions.md`).
- [ ] Production IDs are exactly:
  - App ID: `ca-app-pub-7831002909037560~7761656669`
  - Banner: `ca-app-pub-7831002909037560/5490596409`
  - Interstitial: `ca-app-pub-7831002909037560/8033119406`
  - `src/config/adsConfig.ts` validates all three at import time and throws in release builds if a test ID is selected — confirm the release build actually threw no such error at startup (check logcat on first run).
- [ ] **UMP consent messages are configured in AdMob — Apps → Football Scores Today → Privacy & messaging → create at least one message (EEA, UK, and/or US states).** Until at least one message exists for this app ID, `AdsConsent.requestInfoUpdate()` throws `Publisher misconfiguration: ... no form(s) configured for the input app ID`, which this app correctly treats as "consent unresolved" and refuses to show any ads anywhere, for every user, in every region — this is the single most common reason a freshly-built app shows zero ads. It is not a code bug; it's a one-time setup step in the AdMob web console for this exact app ID (`ca-app-pub-7831002909037560~7761656669`), done once by whoever owns the account. After creating a message, it can take a short while to propagate before `requestInfoUpdate()` stops erroring.
- [ ] Privacy Policy URL is set in both the Play Console Data Safety section and in AdMob's app settings, and the in-app Privacy Policy screen matches `PRIVACYPOLICY.md`.
- [ ] Data Safety answers in Play Console match `store_assets/data-safety-notes.md`.
- [ ] Test ads are disabled in release — verify by installing the signed release build and confirming ad units load with production IDs (do **not** click them).
- [ ] No production ad was clicked during manual QA (use a separate AdMob test device for any build you personally click through).
- [ ] Banner is visually separated from bottom navigation and content (non-clickable separator visible, no overlap).
- [ ] Interstitial frequency caps behave as configured (see `src/config/adsConfig.ts` `FREQUENCY_CAPS`): no ad in the first 180 seconds, none before 4 eligible actions, ≥3 eligible actions and ≥8 minutes between ads, max 2 per session / 5 per rolling day.
- [ ] No interstitial appears on launch, on foreground, during onboarding, on tab change, or on back-button/exit.
