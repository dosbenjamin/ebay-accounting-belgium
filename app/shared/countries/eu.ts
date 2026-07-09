import { Data, Effect, Schema } from 'effect';

export const CountryZone = Schema.Literal('EU', 'NON_EU', 'UNKNOWN');
export type CountryZone = Schema.Schema.Type<typeof CountryZone>;

export const CountryClassification = Schema.Struct({
  input: Schema.String,
  normalizedCountry: Schema.String,
  zone: CountryZone,
});
export type CountryClassification = Schema.Schema.Type<typeof CountryClassification>;

export class CountryClassificationWarning extends Data.TaggedError('CountryClassificationWarning')<{
  readonly country: string;
}> {}

const euCountries = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

const aliases = new Map<string, string>([
  ['BELGIQUE', 'BE'],
  ['BELGIUM', 'BE'],
  ['BE', 'BE'],
  ['FRANCE', 'FR'],
  ['FR', 'FR'],
  ['ALLEMAGNE', 'DE'],
  ['GERMANY', 'DE'],
  ['DE', 'DE'],
  ['NETHERLANDS', 'NL'],
  ['PAYS-BAS', 'NL'],
  ['NL', 'NL'],
  ['ITALY', 'IT'],
  ['ITALIE', 'IT'],
  ['IT', 'IT'],
  ['SPAIN', 'ES'],
  ['ESPAGNE', 'ES'],
  ['ES', 'ES'],
  ['UNITED KINGDOM', 'GB'],
  ['ROYAUME-UNI', 'GB'],
  ['UK', 'GB'],
  ['GB', 'GB'],
  ['UNITED STATES', 'US'],
  ['ETATS-UNIS', 'US'],
  ['ÉTATS-UNIS', 'US'],
  ['USA', 'US'],
  ['US', 'US'],
]);

export const normalizeCountryCode = (value: string): string | undefined => {
  const normalized = value.trim().toUpperCase();
  const alias = aliases.get(normalized);
  if (alias) return alias;
  return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
};

export const classifyCountry = (country: string): Effect.Effect<CountryClassification, never> =>
  Effect.sync(() => {
    const code = normalizeCountryCode(country);
    if (!code) {
      return {
        input: country,
        normalizedCountry: country.trim(),
        zone: 'UNKNOWN' as const,
      };
    }
    return {
      input: country,
      normalizedCountry: code,
      zone: euCountries.has(code) ? ('EU' as const) : ('NON_EU' as const),
    };
  });

export const isEuCountry = (country: string): boolean => {
  const code = normalizeCountryCode(country);
  return Boolean(code && euCountries.has(code));
};
