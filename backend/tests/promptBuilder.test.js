/**
 * @file tests/promptBuilder.test.js
 * @description Unit tests for the buildSystemPrompt pure utility function.
 *
 * Because buildSystemPrompt is a pure function with no side effects and
 * no HTTP dependencies, these tests import it directly and run without
 * any mocking or server setup — keeping them fast and deterministic.
 */

import { buildSystemPrompt } from '../src/utils/promptBuilder.js';

// ── Constants mirroring promptBuilder.js ──────────────────────────────────────

/** India average annual footprint — must match promptBuilder.js */
const INDIA_AVG_TONNES = 1.9;

/** Global average annual footprint — must match promptBuilder.js */
const GLOBAL_AVG_TONNES = 7.5;

/** Expected decimal places in all tonne values */
const DISPLAY_DECIMAL_PLACES = 2;

// ── Shared fixtures ───────────────────────────────────────────────────────────

/**
 * Baseline emissions object — all values above India avg, below global avg.
 *
 * @constant {object}
 */
const BASE_EMISSIONS = Object.freeze({
  total:       5.0,
  transport:   1.5,
  flights:     0.5,
  electricity: 1.0,
  heating:     0.8,
  diet:        0.9,
  shopping:    0.3,
});

/**
 * Baseline inputs object — covers all enum fields.
 *
 * @constant {object}
 */
const BASE_INPUTS = Object.freeze({
  driving:     60,
  carType:     'hybrid',
  flights:     2,
  electricity: 200,
  heating:     'heatpump',
  diet:        'flexitarian',
  shopping:    'minimal',
});

/**
 * Emissions object with a total well above global avg — used to test
 * the "above global avg" branch of the comparison logic.
 *
 * @constant {object}
 */
const HIGH_EMISSIONS = Object.freeze({
  ...BASE_EMISSIONS,
  total: 12.0,
});

/**
 * Emissions object with a total well below India avg — used to test
 * the "below India avg" branch.
 *
 * @constant {object}
 */
const LOW_EMISSIONS = Object.freeze({
  ...BASE_EMISSIONS,
  total: 0.8,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {

  // ── Return type ─────────────────────────────────────────────────────────────

  it('returns a non-empty string', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Total footprint ─────────────────────────────────────────────────────────

  it(`formats the total footprint to ${DISPLAY_DECIMAL_PLACES} decimal places`, () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(`${BASE_EMISSIONS.total.toFixed(DISPLAY_DECIMAL_PLACES)}t CO₂e`);
  });

  it('handles a total footprint of zero without throwing', () => {
    const zeroEmissions = { ...BASE_EMISSIONS, total: 0 };

    expect(() => buildSystemPrompt(zeroEmissions, BASE_INPUTS)).not.toThrow();
  });

  it('handles a very large total footprint without throwing', () => {
    const largeEmissions = { ...BASE_EMISSIONS, total: 999.99 };

    expect(() => buildSystemPrompt(largeEmissions, BASE_INPUTS)).not.toThrow();
  });

  // ── Benchmark comparisons ───────────────────────────────────────────────────

  it('includes "India avg" label in the output', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain('India avg');
  });

  it('includes "global avg" label in the output', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain('global avg');
  });

  it('says "above global avg" when total exceeds the global average', () => {
    const result = buildSystemPrompt(HIGH_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(`above global avg (${GLOBAL_AVG_TONNES}t)`);
  });

  it('says "below India avg" when total is under the India average', () => {
    const result = buildSystemPrompt(LOW_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(`below India avg (${INDIA_AVG_TONNES}t)`);
  });

  it('says "above India avg" when total exceeds the India average', () => {
    const aboveIndiaEmissions = { ...BASE_EMISSIONS, total: 3.5 };
    const result = buildSystemPrompt(aboveIndiaEmissions, BASE_INPUTS);

    expect(result).toContain(`above India avg (${INDIA_AVG_TONNES}t)`);
  });

  it('says "below global avg" when total is under the global average', () => {
    const belowGlobalEmissions = { ...BASE_EMISSIONS, total: 5.0 };
    const result = buildSystemPrompt(belowGlobalEmissions, BASE_INPUTS);

    expect(result).toContain(`below global avg (${GLOBAL_AVG_TONNES}t)`);
  });

  // ── Input values injected ───────────────────────────────────────────────────

  it('includes the driving distance with unit', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(`${BASE_INPUTS.driving} km/week`);
  });

  it('includes the carType value', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(BASE_INPUTS.carType);
  });

  it('includes the flights count', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(`${BASE_INPUTS.flights} flights/year`);
  });

  it('includes the electricity consumption', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(`${BASE_INPUTS.electricity} kWh/month`);
  });

  it('includes the heating type', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(BASE_INPUTS.heating);
  });

  it('includes the diet type', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(BASE_INPUTS.diet);
  });

  it('includes the shopping type', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(BASE_INPUTS.shopping);
  });

  // ── All 6 emission categories present ──────────────────────────────────────

  it('includes all 6 emission category names', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    const expectedCategories = [
      'transport', 'flights', 'electricity', 'heating', 'diet', 'shopping',
    ];
    expectedCategories.forEach((category) => {
      expect(result.toLowerCase()).toContain(category);
    });
  });

  it('includes the transport emission value formatted to 2dp', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain(BASE_EMISSIONS.transport.toFixed(DISPLAY_DECIMAL_PLACES));
  });

  // ── Purity ──────────────────────────────────────────────────────────────────

  it('is a pure function — returns identical output for identical inputs', () => {
    const resultA = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);
    const resultB = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(resultA).toBe(resultB);
  });

  it('does not mutate the emissions argument', () => {
    const emissionsCopy = { ...BASE_EMISSIONS };
    buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(BASE_EMISSIONS).toEqual(emissionsCopy);
  });

  it('does not mutate the inputs argument', () => {
    const inputsCopy = { ...BASE_INPUTS };
    buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(BASE_INPUTS).toEqual(inputsCopy);
  });

  it('produces different output when emissions change', () => {
    const resultA = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);
    const resultB = buildSystemPrompt(HIGH_EMISSIONS, BASE_INPUTS);

    expect(resultA).not.toBe(resultB);
  });

  it('produces different output when inputs change', () => {
    const resultA = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);
    const resultB = buildSystemPrompt(BASE_EMISSIONS, {
      ...BASE_INPUTS,
      carType: 'electric',
      driving: 150,
    });

    expect(resultA).not.toBe(resultB);
  });

  // ── Advisor rules ───────────────────────────────────────────────────────────

  it('includes advisor rules section', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result).toContain('ADVISOR RULES');
  });

  it('output is long enough to constitute a meaningful system prompt (>200 chars)', () => {
    const result = buildSystemPrompt(BASE_EMISSIONS, BASE_INPUTS);

    expect(result.length).toBeGreaterThan(200);
  });
});
