import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { classifyCountry, countryNameFr, isEuCountry } from './eu';

describe('EU country classification', () => {
  it('classifies Belgium as EU', () => {
    expect(isEuCountry('Belgique')).toBe(true);
    expect(isEuCountry('BE')).toBe(true);
  });

  it('classifies non EU countries', () => {
    expect(isEuCountry('United Kingdom')).toBe(false);
    expect(isEuCountry('United States')).toBe(false);
  });

  it('formats ISO country codes as French country names', () => {
    expect(countryNameFr('BE')).toBe('Belgique');
    expect(countryNameFr('US')).toBe('États-Unis');
    expect(countryNameFr('CH')).toBe('Suisse');
  });

  it('classifies eBay ISO country codes across EU and non EU zones', async () => {
    await expect(Effect.runPromise(classifyCountry('RO'))).resolves.toMatchObject({
      normalizedCountry: 'RO',
      zone: 'EU',
    });
    await expect(Effect.runPromise(classifyCountry('CH'))).resolves.toMatchObject({
      normalizedCountry: 'CH',
      zone: 'NON_EU',
    });
  });
});
