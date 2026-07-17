# Google Play store listing — Football Scores Today

## Titles (per-locale)

| Locale | Title |
|---|---|
| Default / international | Football Scores Today |
| United States (en-US) | Soccer Games Today |
| Arabic (ar) | مباريات ونتائج كرة القدم |

Android launcher label (all locales, shown under the home-screen icon): **Football Scores**

## Category

Sports

## Short description

See `short-description.txt` (English). Localize naturally for the `en-US` and `ar` listings — the US listing should use "soccer" terminology, the Arabic listing should read naturally in Arabic, not as a literal translation.

## Full description

See `full-description.txt`. Key points every localized description should keep:

- Football/soccer scores, fixtures, schedules, results, standings
- My Matchday personalization, clash detection, weekend planner
- Spoiler Shield
- Private predictions — explicitly **not** gambling/betting
- No account required, free with ads
- English + Arabic (RTL) support
- Non-affiliation with FIFA/UEFA/leagues/clubs/broadcasters

## Graphics checklist

- App icon: `assets/logo.png` (already sized/exported per Play's icon spec by the build)
- Feature graphic: see `feature-graphic-notes.md`
- Phone screenshots: captured automatically by `release.py` into `releases/screenshots/`; captions in `screenshot-captions.txt`

## Contact & policy links

- Privacy Policy: host `PRIVACYPOLICY.md` (or an equivalent page) and link it in Play Console → Store presence → Store listing → Privacy Policy, and also set it in AdMob's app settings.
- Website: required for `app-ads.txt` hosting — see `app-ads-txt-instructions.md`.

## Data Safety section

Fill in using `data-safety-notes.md`.

## Compliance reminders

- Do not use "Live" in the title.
- Do not claim official affiliation with any league/club/broadcaster/federation.
- Do not use betting/gambling language anywhere in the listing.
- Do not reference the internal project codename ("MatchPilot") anywhere in public-facing copy.
