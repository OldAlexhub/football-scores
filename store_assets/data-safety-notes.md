# Data Safety notes — Football Scores Today

Use these notes to fill in the Google Play Data Safety form. They reflect what the app and its third-party SDKs (Google AdMob, Google UMP, football data providers) actually do — keep them in sync if you add or remove an SDK.

## Data collected and shared

### Advertising ID
- **Collected:** Yes, by Google AdMob (via Google Play services), not by Old Alex Hub directly.
- **Shared:** Yes, with Google AdMob and its ad-serving partners.
- **Purpose:** Advertising (ad serving, ad personalization subject to consent, analytics, fraud prevention).
- **Optional:** Personalization is subject to the UMP consent choice; the identifier itself is supplied by the OS to the ad SDK.

### Device or other identifiers
- **Collected:** Yes, by Google AdMob for ad delivery/fraud prevention.
- **Shared:** Yes, with Google AdMob.

### Approximate location
- **Collected:** Only insofar as Google AdMob infers coarse location (e.g., country/region) from IP for ad delivery and consent-region detection (EEA/UK gating for the UMP form). The app itself never requests device location permissions.
- **Shared:** Yes, with Google AdMob for ad serving and consent purposes.

### App interactions
- **Collected:** Yes — locally, for in-app features (favorites, predictions, reminders, ad frequency capping). Ad impression/click events are also processed by Google AdMob for ad delivery and measurement.
- **Shared:** Ad interaction events are shared with Google AdMob. App-feature data (favorites, predictions, matchday plans) is **not** shared anywhere — it stays in local device storage.

### Crash logs / diagnostics
- **Collected:** Standard Android/Google Play Services diagnostic data may be collected per Google Play's own platform-level data collection, independent of this app's own code.

## Data NOT collected

- No account creation, no name, no email address, no phone number.
- No precise (GPS) location.
- No contacts, photos, files, calendar, or SMS access.
- No health, financial, or payment information — the app has no purchases.
- No data sold to third parties.

## Data deletion

All app-created data (favorites, predictions, matchday plans, reminders, preferences) can be deleted in-app from More → Data Management → Reset all data, or by uninstalling the app. There is no Old Alex Hub server account to request deletion from, since none exists.

## Encryption in transit

Football data requests and AdMob network traffic use HTTPS/TLS. The app disables cleartext traffic in release builds.
