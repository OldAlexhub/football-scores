# app-ads.txt setup — Football Scores Today

`app-ads.txt` is a website-hosted file (**not** something shipped inside the Android package) that tells ad systems which companies are authorized to sell ads on your behalf. Google requires it for stable, policy-compliant AdMob monetization once your app has meaningful traffic.

## Steps

1. **Add a developer website to the Google Play listing.** Play Console → your app → Store presence → Store listing → "Website". This website is what AdMob/Google will crawl for `app-ads.txt`.
2. **Host `app-ads.txt` at the website root** — i.e. `https://yourdomain.com/app-ads.txt`, not in a subfolder.
3. **Copy the exact personalized seller line from your AdMob account.** In AdMob: Apps → (select Football Scores Today) → App settings → look for the "app-ads.txt" panel, which shows a line like:
   ```
   google.com, pub-7831002909037560, DIRECT, f08c47fec0942fa0
   ```
   **Do not invent, guess, or reuse this line from another project.** Copy it verbatim from your own AdMob account for this exact app.
4. **Publish the file** at the website root and confirm it's publicly reachable (no login wall, no robots.txt block, correct `text/plain` content type).
5. **Request verification in AdMob.** AdMob periodically re-crawls `app-ads.txt`; you can also trigger a manual check from the same App settings panel.
6. **Confirm AdMob can access the file** — test the URL directly in a browser and with a simple `curl https://yourdomain.com/app-ads.txt` to make sure there's no redirect chain or CDN rule stripping it.
7. **Verify app readiness before expecting stable production ad serving.** AdMob's "App readiness" status (Apps → Football Scores Today → App settings) should show green/ready. Ads can still serve at low rates before this, but full-rate serving depends on this being resolved.

## Do not

- Do not place `app-ads.txt` inside the Android APK/AAB as a substitute for website hosting — it has no effect there. It must be crawlable on the public website tied to the Play Store listing.
- Do not publish a guessed or placeholder seller line — an incorrect line can cause AdMob to flag the account.
