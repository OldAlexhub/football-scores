# Monetization implementation notes — Football Scores Today

Internal reference for the AdMob architecture. See also `src/config/adsConfig.ts` (single source of truth for IDs and frequency caps) and `README.md` → "AdMob configuration".

## Components

| File | Responsibility |
|---|---|
| `src/config/adsConfig.ts` | Production/debug/test ad unit IDs, validation, frequency-cap constants, consent config |
| `src/ads/AdConsentManager.ts` | Google UMP request/show/privacy-options flow |
| `src/ads/AdService.ts` | One-time consent → SDK-configure → SDK-initialize chain |
| `src/ads/AdLifecycleManager.ts` | App foreground/background tracking, session bookkeeping |
| `src/ads/AdProvider.tsx` | Mounts once at the app root, bootstraps the above |
| `src/ads/BannerEligibilityController.ts` + `useSuppressBanner.ts` | Pub-sub suppression signal any sensitive screen registers with while mounted |
| `src/ads/keyboardVisibility.ts` | Global keyboard-visible flag shared by banner + interstitial gating |
| `src/ads/SafeAdContainer.tsx` | The one persistent banner slot, mounted inside `SafeBottomBar` |
| `src/ads/InFeedNativeAd.tsx` | Clearly labeled native ad used after the fourth match/headline; collapses on load failure |
| `src/ads/AppOpenAdManager.ts` | Preloads and caps app-open ads for returning users starting a new long session |
| `src/ads/AdPreloadController.ts` | Single `InterstitialAd` instance lifecycle: load, retry with backoff, show |
| `src/ads/AdFrequencyController.ts` | Pure frequency-cap decision function + persisted counters |
| `src/ads/InterstitialEligibilityEngine.ts` | Combines frequency caps + ad readiness + "sensitive workflow" signal |
| `src/ads/InterstitialManager.ts` | Public `maybeShowInterstitial(placement)` entrypoint screens call |
| `src/storage/adStateRepo.ts` | MMKV-backed `AdFrequencyState` / `AdSessionState` / `AdPlacementState` persistence |

## Why one banner instance

`SafeAdContainer` is mounted exactly once, inside the custom bottom tab bar (`SafeBottomBar`). Because React Navigation keeps the tab bar mounted while screens within a tab's stack push/pop, the same banner survives navigation to Competition Details, Team Details, and read-only Match Details without a new ad request — it only unmounts (and stops requesting) when a screen registered via `useSuppressBanner()` is on top, when the keyboard is visible, or when the app is backgrounded.

## Why interstitials are placement-based, not screen-based

`maybeShowInterstitial(placement)` is called after a user already sees the real result of their action (export done, share sheet closed, plan saved) — never before or during it. The frequency engine tracks `lastEligibleActionType` and refuses to show the same placement twice in a row, per the product spec's anti-repetition rule.

## Native and app-open safeguards

Native ads are placed inside long content feeds after the fourth organic item, carry both “Ad” and “Sponsored” labels, and never imitate a match or article. App-open ads are eligible only after three sessions and at least four hours since the previous app-open impression. Release builds keep both formats disabled until dedicated production unit IDs are supplied in `adsConfig.ts`; debug builds use Google's official test units.

## Extending

To add a new eligible completion point: add its name to `AD_PLACEMENT_NAMES` in `adsConfig.ts` and to the `AdPlacementName` union in `src/types/domain.ts`, then call `maybeShowInterstitial('your_new_placement')` right after the user acknowledges the completed action's result — never before.
