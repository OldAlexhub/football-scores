# Football Scores Today

A complete, Android-only, bare React Native (TypeScript) football companion app: scores, fixtures, standings, predictions, and matchday planning. Free to use, supported by Google AdMob.

- **Package name:** `com.oldalexhub.footballscores`
- **Developer:** Old Alex Hub
- **Platform:** Android only
- **Framework:** Bare React Native 0.86, TypeScript, React 19, new architecture enabled

## Contents

- [Overview & features](#overview--features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Android setup (JAVA_HOME / ANDROID_HOME)](#android-setup)
- [Football data provider setup](#football-data-provider-setup)
- [Caching & data delays](#caching--data-delays)
- [AdMob configuration](#admob-configuration)
- [UMP consent](#ump-consent)
- [Banner & interstitial architecture](#banner--interstitial-architecture)
- [app-ads.txt](#app-adstxt)
- [Safe-area implementation](#safe-area-implementation)
- [Notifications](#notifications)
- [Android home-screen widget](#android-home-screen-widget)
- [Debug build](#debug-build)
- [Release build & release.py](#release-build--releasepy)
- [Data attribution](#data-attribution)
- [Troubleshooting](#troubleshooting)

## Overview & features

Football Scores Today lets fans browse match schedules by league and date, follow favorite teams and competitions, inspect standings, build a personalized "My Matchday" plan, detect clashing fixtures, avoid spoilers with Spoiler Shield, set local match reminders, record private score predictions (not gambling), compare team form, explore hypothetical table scenarios, and export/share/back up everything locally. It works fully without an account and without any Old Alex Hub backend — all user-created data lives in local SQLite + MMKV storage on the device.

Five bottom tabs: **Matches**, **My Matchday**, **Predict**, **Insights**, **More**.

## Architecture

```
src/
  ads/            AdMob + UMP consent, banner/interstitial managers, frequency capping
  components/     Shared UI (MatchCard, safe-area shells, buttons, cards, empty/loading/error states)
  config/         adsConfig.ts (ad unit IDs, frequency caps), providerKeys.ts (API tokens, git-ignored)
  content/        Embedded legal text (privacy policy shown in-app)
  hooks/          Data-fetching hooks (matches range, competitions, resolved matches by id)
  i18n/           i18next setup + English/Arabic locale files
  navigation/     React Navigation stacks/tabs, linking config
  providers/      Football data provider adapters + provider manager (fallback, caching, health)
  screens/        All screens, organized by tab + shared detail screens
  services/       Clash detection, prediction scoring/stats, spoiler shield, exports, notifications, widget bridge
  state/          React contexts backed by storage (preferences, favorites, watch plan, reminders, predictions)
  storage/        SQLite schema/migrations, repositories, MMKV-backed stores, backup/restore
  theme/          Light/dark theme + ThemeProvider
  types/          Domain model shared across the whole app
  utils/          Dates, ids
android/
  app/src/main/java/com/oldalexhub/footballscores/
    MainActivity.kt, MainApplication.kt
    widget/       FootballWidgetProvider.kt, WidgetBridgeModule.kt, WidgetBridgePackage.kt (home-screen widget)
```

## Installation

`assets/logo.png` ships as a placeholder (solid-color mark) so `release.py` and Android icon generation have something to work with out of the box — replace it with real branding before your first store submission.

Requires Node 22+, a JDK (17 or 21), and the Android SDK.

```sh
npm install
cp src/config/providerKeys.example.ts src/config/providerKeys.ts
# edit providerKeys.ts with your own free football-data.org / API-Football tokens (both optional)
npm start
# in a second terminal:
npm run android
```

## Android setup

`release.py` automates locating/setting these, but for manual `npx react-native run-android`:

- **JAVA_HOME** must point at a JDK 17+ (Android Studio ships one under `Android Studio/jbr`).
- **ANDROID_HOME** / **ANDROID_SDK_ROOT** must point at your Android SDK, with `platform-tools` on `PATH`.
- `android/local.properties` needs `sdk.dir=<path>` — `release.py` writes this for you without clobbering any other properties already in that file.

## Football data provider setup

Football Scores Today ships four provider adapters behind one interface (`src/providers/types.ts`):

| Provider | Key required? | Notes |
|---|---|---|
| **OpenFootball** | No | Public-domain fixture/result datasets. No live status, no standings, no crests. Always available. |
| **football-data.org** | Yes (free tier available) | Primary configurable current-data source (API v4). Schedules, scores, standings, teams, head-to-head. |
| **API-Football** | Yes (free tier available) | Optional enrichment source (api-sports.io). |
| **Cached** | No | Serves the last successful response for a query when every live provider fails or the device is offline. |

### football-data.org setup
1. Register at https://www.football-data.org/client/register for a free API token.
2. Put it in `src/config/providerKeys.ts` as `FOOTBALL_DATA_ORG_TOKEN`.

### OpenFootball fallback
No setup needed — it's the always-available, no-key fallback and default source when nothing else is configured.

### API-Football (optional)
1. Register at https://dashboard.api-football.com/register.
2. Put your key in `src/config/providerKeys.ts` as `API_FOOTBALL_KEY`.

The app remains fully usable with both keys left blank — `providerManager.ts` skips unconfigured providers and falls back automatically.

## Caching & data delays

`src/providers/cacheKeys.ts` defines TTLs: competition/team metadata 24h, upcoming fixtures 6h, recent results/standings 60min, historical data 7 days. Manual refresh has a 20-second cooldown (`providerManager.canManualRefresh`). Cached data is always clearly labeled in the UI (`matches.cachedNotice` / `matches.staleNotice`) — the app never claims "live" unless the active provider genuinely supports it.

## AdMob configuration

All ad configuration lives in **`src/config/adsConfig.ts`**, the single source of truth:

- **Production App ID:** `ca-app-pub-7831002909037560~7761656669` (also in `AndroidManifest.xml` as `com.google.android.gms.ads.APPLICATION_ID`, and in `app.json` for reference)
- **Production banner:** `ca-app-pub-7831002909037560/5490596409`
- **Production interstitial:** `ca-app-pub-7831002909037560/8033119406`
- **Debug (test) banner:** `ca-app-pub-3940256099942544/9214589741`
- **Debug (test) interstitial:** `ca-app-pub-3940256099942544/1033173712`

`adsConfig.ts` picks test vs. production IDs based on `__DEV__`, validates every ID's shape at import time, and **throws in release builds** if a test ID is ever selected there. Never edit the production IDs.

## UMP consent

`src/ads/AdConsentManager.ts` wraps `react-native-google-mobile-ads`'s UMP APIs: request updated consent info → show the form only if required → gate `mobileAds().initialize()` on the result (`src/ads/AdService.ts`). Ads are never requested before this resolves. Users can revisit their choice anytime from **More → Advertising & Privacy → Manage advertising choices** (`AdvertisingPrivacyChoicesScreen`).

## Banner & interstitial architecture

See `store_assets/monetization-implementation-notes.md` for the full component map. In short: one persistent banner (`SafeAdContainer`) lives inside the custom tab bar (`SafeBottomBar`) and survives tab switches; screens that must never show it call `useSuppressBanner()`. Interstitials preload one at a time (`AdPreloadController`) and are only requested to show via `maybeShowInterstitial(placement)` **after** a user-visible action already completed — frequency caps live in `AdFrequencyController.ts` and `adsConfig.ts`'s `FREQUENCY_CAPS`.

## app-ads.txt

See `store_assets/app-ads-txt-instructions.md` — this must be hosted on your developer website, not shipped in the app package.

## Safe-area implementation

`react-native-safe-area-context` wraps the root (`AppShell.tsx` → `SafeAreaProvider`). Shared shells: `ScreenContainer`, `SafeScrollView`, `KeyboardSafeScreen`, `SafeBottomBar`, `SafeStickyAction`, `SafeModalContainer`, and the ad-specific `SafeAdContainer`. `SafeBottomBar` computes `insets.bottom` itself; scroll views add bottom padding for the tab bar + banner + gesture inset.

## Notifications

Local-only, via `@notifee/react-native` (`src/services/notifications.ts`, `src/services/reminderService.ts`). `POST_NOTIFICATIONS` is requested only on Android 13+ (API 33), the first time a user enables a reminder — never at launch. No exact-alarm permission is used. Reminder text is always spoiler-safe generic wording, never a score or result.

## Android home-screen widget

Kotlin `AppWidgetProvider` at `android/app/src/main/java/com/oldalexhub/footballscores/widget/FootballWidgetProvider.kt`, fed by a small native module (`WidgetBridgeModule.kt`) that JS calls via `src/services/widgetBridge.ts` (wired into `WidgetSyncEffect.tsx`, mounted once at the app root). The widget reads sanitized JSON from plain Android `SharedPreferences` — never JS/MMKV directly — and never renders ads.

## Debug build

```sh
npm run android
```
Uses the debug keystore (`android/app/debug.keystore`) and Google's test ad units automatically.

## Release build & release.py

```sh
python release.py --check-env      # verify Java/SDK detection only
python release.py                  # full build: keystore, APK, AAB, screenshots, packaging
python release.py --skip-build --screenshots-only
python release.py --generate-key-only
```

`release.py` (Python standard library only) locates the project, verifies `assets/logo.png`, detects `JAVA_HOME`/Android SDK, writes `android/local.properties`, generates (or reuses) a release keystore + `android/signing.properties` (both git-ignored), validates the package name and every AdMob ID (including refusing to ship a Google test ID in a release build), builds a signed APK and AAB, captures emulator screenshots via `adb`, and packages everything into `releases/` (builds, screenshots, branding, store-assets, docs, signing-info) outside the app source tree. Output artifact names: `Football-Scores-Today-release.apk` / `.aab`.

**Keystore backup:** back up `android/keystores/release.keystore` and `android/signing.properties` somewhere safe outside version control the moment `release.py` generates them — losing the release keystore means you can never update the app on Google Play under the same listing again.

## Data attribution

See `store_assets/data-source-attribution.md`.

## Troubleshooting

**Ads not loading**
- Confirm `adsConfig.ts` resolved the expected IDs for your build type (test in debug, production in release).
- Check that `AdService.initializeAdsOnce()` reached `'ready'` (consent must resolve to "ads allowed" first).
- Confirm you're online and not rate-limited by Google's ad servers.

**App ID missing from manifest**
- Confirm `AndroidManifest.xml` has the `com.google.android.gms.ads.APPLICATION_ID` `<meta-data>` inside `<application>`, with no typos, and that it wasn't accidentally overwritten by a manifest merge from another library.

**Wrong ad unit ID format**
- App IDs look like `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (tilde). Ad unit IDs look like `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY` (slash). `adsConfig.ts` validates both shapes at import time and will throw with a clear message if either is wrong.

**Consent not completing**
- In debug, add your test device ID to `CONSENT_CONFIG.debugTestDeviceIds` in `adsConfig.ts` so the UMP form reliably appears for EEA/UK-simulated geography.
- Never force debug geography in a release build.

**No ads showing at all (banner never appears anywhere)**
- This is almost always a UMP consent misconfiguration, not a code bug. If `requestInfoUpdate()` throws `Publisher misconfiguration: ... no form(s) configured for the input app ID`, it means no Privacy & messaging consent message has ever been created in the AdMob console for this app ID. The app correctly treats an unresolved consent state as "cannot request ads" and shows nothing — by design, since ads must never be requested before consent completes. **Fix:** in AdMob → Apps → Football Scores Today → Privacy & messaging, create at least one message (EEA and/or US states). This is a one-time account setup step done by the AdMob account owner, not something fixable in code. See `store_assets/admob-release-checklist.md`.

**Test ads in release / production ads in debug**
- This should be structurally impossible — `adsConfig.ts` picks IDs from `__DEV__` and throws in release if a test ID slipped through. If you see this, check for a stale Metro bundle or a hardcoded ID bypassing `adsConfig.ts`.

**Banner overlapping content / nav**
- The banner only renders inside `SafeBottomBar`, above the tab buttons and above `insets.bottom`. If you added a new bottom-pinned control elsewhere, use `SafeStickyAction`/`SafeAdContainer` conventions rather than raw absolute positioning.

**Interstitial not showing / frequency cap confusion**
- Check `AdFrequencyController.canShowInterstitial()`'s conditions (180s session warm-up, 4 actions before the first ad, 3 actions + 8 minutes between ads, 2/session, 5/day) — these are intentionally conservative. Use the debug-only Ad Diagnostics path (`isAdsDiagnosticsEnabled()` in `adsConfig.ts`) while testing.

**AdMob app readiness / app-ads.txt verification**
- See `store_assets/app-ads-txt-instructions.md` and `store_assets/admob-release-checklist.md`.

**ANDROID_HOME / JAVA_HOME not found**
- Run `python release.py --check-env` to see exactly what was detected and where it looked (Android Studio's bundled JBR, common SDK install paths, existing environment variables).

**Safe-area overlap on specific devices**
- Test with gesture navigation, 3-button navigation, and edge-to-edge enabled; `SafeBottomBar`/`SafeAdContainer` both read `useSafeAreaInsets()` directly rather than hardcoding padding.
