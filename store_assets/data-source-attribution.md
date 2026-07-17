# Data source attribution — Football Scores Today

Football Scores Today displays football data from the following sources. Each match, competition, and standings row displayed in the app is tagged internally with the provider that supplied it, and the active source is shown in the app under Matches → refresh notice and More → Data Sources.

## OpenFootball
Public-domain football fixture and result datasets (https://github.com/openfootball/football.json). Used as the no-key fallback source. Does not provide live status, standings, or team crests. Historical and schedule/result data only.

## football-data.org (API v4)
The primary configurable current-data source when an API token is supplied. Provides schedules, scores, standings, team metadata, and head-to-head data, subject to the token's plan limits. See https://www.football-data.org for terms of use and free-tier registration.

## API-Football (api-sports.io)
An optional enrichment source when an API key is supplied. Provides richer match, lineup, and statistics data where the configured plan allows. See https://www.api-football.com for terms of use.

## Cached data
When no live provider request succeeds (offline, rate-limited, or a provider outage), the app falls back to the most recently successful response for that same query, clearly marked as cached/stale in the UI.

## Notes

- Football Scores Today does not scrape football websites and does not use private/unofficial endpoints.
- Team crests, logos, and any other provider-supplied imagery are only used where the active provider's terms permit it, with an initials-based fallback always available.
- Football Scores Today is not affiliated with any of the above providers' data being described as "official"; each is a data supplier, not a partner or affiliate of Old Alex Hub.
