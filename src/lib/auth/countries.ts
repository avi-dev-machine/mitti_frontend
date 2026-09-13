/* ── MITTI — Country dial codes ──
 *
 * Supabase phone auth needs E.164, which means the country code is part of
 * the number. MITTI is built for India first, so India leads the list, but
 * assuming every user is Indian would silently break everyone else — hence a
 * real selector rather than a hardcoded +91.
 *
 * Scope: South Asia and the regions with the largest agricultural diaspora,
 * plus the countries MITTI is most likely to be demonstrated in. Add more as
 * deployments require.
 */

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Dial code including the leading plus. */
  dial: string;
  flag: string;
  /** Typical national subscriber length, used only for the input placeholder. */
  nationalDigits: number;
}

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India',          dial: '+91',  flag: '🇮🇳', nationalDigits: 10 },
  { code: 'BD', name: 'Bangladesh',     dial: '+880', flag: '🇧🇩', nationalDigits: 10 },
  { code: 'NP', name: 'Nepal',          dial: '+977', flag: '🇳🇵', nationalDigits: 10 },
  { code: 'LK', name: 'Sri Lanka',      dial: '+94',  flag: '🇱🇰', nationalDigits: 9 },
  { code: 'PK', name: 'Pakistan',       dial: '+92',  flag: '🇵🇰', nationalDigits: 10 },
  { code: 'BT', name: 'Bhutan',         dial: '+975', flag: '🇧🇹', nationalDigits: 8 },
  { code: 'MM', name: 'Myanmar',        dial: '+95',  flag: '🇲🇲', nationalDigits: 9 },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪', nationalDigits: 9 },
  { code: 'SG', name: 'Singapore',      dial: '+65',  flag: '🇸🇬', nationalDigits: 8 },
  { code: 'MY', name: 'Malaysia',       dial: '+60',  flag: '🇲🇾', nationalDigits: 9 },
  { code: 'ID', name: 'Indonesia',      dial: '+62',  flag: '🇮🇩', nationalDigits: 10 },
  { code: 'TH', name: 'Thailand',       dial: '+66',  flag: '🇹🇭', nationalDigits: 9 },
  { code: 'PH', name: 'Philippines',    dial: '+63',  flag: '🇵🇭', nationalDigits: 10 },
  { code: 'VN', name: 'Vietnam',        dial: '+84',  flag: '🇻🇳', nationalDigits: 9 },
  { code: 'KE', name: 'Kenya',          dial: '+254', flag: '🇰🇪', nationalDigits: 9 },
  { code: 'NG', name: 'Nigeria',        dial: '+234', flag: '🇳🇬', nationalDigits: 10 },
  { code: 'ZA', name: 'South Africa',   dial: '+27',  flag: '🇿🇦', nationalDigits: 9 },
  { code: 'BR', name: 'Brazil',         dial: '+55',  flag: '🇧🇷', nationalDigits: 11 },
  { code: 'GB', name: 'United Kingdom', dial: '+44',  flag: '🇬🇧', nationalDigits: 10 },
  { code: 'US', name: 'United States',  dial: '+1',   flag: '🇺🇸', nationalDigits: 10 },
  { code: 'CA', name: 'Canada',         dial: '+1',   flag: '🇨🇦', nationalDigits: 10 },
  { code: 'AU', name: 'Australia',      dial: '+61',  flag: '🇦🇺', nationalDigits: 9 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function findCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}

/** A placeholder that matches the country, e.g. "98765 43210" for India. */
export function phonePlaceholder(country: Country): string {
  const n = country.nationalDigits;
  if (n === 10) return '98765 43210';
  if (n === 9) return '98 765 4321';
  if (n === 8) return '9876 5432';
  return '9'.repeat(n);
}
