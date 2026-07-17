/**
 * Maps a country/region name to its flag emoji for lightweight, free,
 * offline visual polish in competition lists — no image assets or network
 * requests required. "International" competitions get a globe instead of a
 * flag since they have no single country.
 */
const FLAG_BY_COUNTRY: Record<string, string> = {
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  Spain: '🇪🇸',
  Germany: '🇩🇪',
  Italy: '🇮🇹',
  France: '🇫🇷',
  Netherlands: '🇳🇱',
  Portugal: '🇵🇹',
  Belgium: '🇧🇪',
  Turkey: '🇹🇷',
  Austria: '🇦🇹',
  Greece: '🇬🇷',
  Algeria: '🇩🇿',
  Egypt: '🇪🇬',
  Morocco: '🇲🇦',
  Mexico: '🇲🇽',
  'United States': '🇺🇸',
  Brazil: '🇧🇷',
  Argentina: '🇦🇷',
  China: '🇨🇳',
  Colombia: '🇨🇴',
  Japan: '🇯🇵',
  Australia: '🇦🇺',
  International: '🌍',
};

export function flagForCountry(country: string | null | undefined): string {
  if (!country) return '🌍';
  return FLAG_BY_COUNTRY[country] ?? '⚽';
}
