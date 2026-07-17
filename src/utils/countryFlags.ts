/** Generates flag emoji from country codes at runtime so source encoding can never corrupt them. */
const COUNTRY_CODE_BY_NAME: Record<string, string> = {
  England: 'GB',
  Scotland: 'GB',
  Wales: 'GB',
  Spain: 'ES',
  Germany: 'DE',
  Italy: 'IT',
  France: 'FR',
  Netherlands: 'NL',
  Portugal: 'PT',
  Belgium: 'BE',
  Turkey: 'TR',
  Austria: 'AT',
  Greece: 'GR',
  Algeria: 'DZ',
  Egypt: 'EG',
  Morocco: 'MA',
  Mexico: 'MX',
  'United States': 'US',
  Brazil: 'BR',
  Argentina: 'AR',
  China: 'CN',
  Colombia: 'CO',
  Japan: 'JP',
  Australia: 'AU',
};

function flagForCode(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  return String.fromCodePoint(...[...upper].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

export function flagForCountry(country: string | null | undefined): string {
  if (!country || country === 'International') return String.fromCodePoint(0x1f30d);
  const code = COUNTRY_CODE_BY_NAME[country];
  return code ? flagForCode(code) : String.fromCodePoint(0x26bd);
}
