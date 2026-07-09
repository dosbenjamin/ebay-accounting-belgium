import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { parseMoneyAmount, round2, toEur } from './money';

describe('money', () => {
  it('parses european decimal amounts', async () => {
    await expect(Effect.runPromise(parseMoneyAmount('123,45'))).resolves.toBe(123.45);
  });

  it('rounds and converts to EUR', () => {
    expect(round2(10.235)).toBe(10.24);
    expect(toEur(100, 0.92)).toBe(92);
  });
});
