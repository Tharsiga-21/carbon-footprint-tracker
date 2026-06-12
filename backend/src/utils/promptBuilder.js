/**
 * @file utils/promptBuilder.js
 * @description Builds the Claude system prompt with the user's emission data injected.
 *
 * Keeping this logic in a pure utility function means:
 *  - It can be unit tested without starting the HTTP server
 *  - The route handler stays thin
 *  - Prompt iterations only require changes here, not in the route
 */

/**
 * India's average annual carbon footprint per person (tonnes CO₂e, 2023).
 * Source: Our World in Data / Global Carbon Project
 *
 * @constant {number}
 */
const INDIA_AVG_TONNES = 1.9;

/**
 * Global average annual carbon footprint per person (tonnes CO₂e, 2023).
 * Source: Our World in Data / Global Carbon Project
 *
 * @constant {number}
 */
const GLOBAL_AVG_TONNES = 7.5;

/**
 * Number of decimal places used when displaying tonne values in the prompt.
 *
 * @constant {number}
 */
const DISPLAY_DECIMAL_PLACES = 2;

/**
 * Formats a signed difference string for benchmark comparisons.
 * e.g. formatDiff(2.3, 1.9) → "0.40t above India avg (1.9t)"
 *
 * @param {number} userTotal   - The user's total footprint in tonnes
 * @param {number} benchmark   - The benchmark value in tonnes
 * @param {string} label       - Human-readable benchmark label
 * @returns {string}           - Formatted comparison string
 */
const formatDiff = (userTotal, benchmark, label) => {
  const diff = (userTotal - benchmark).toFixed(DISPLAY_DECIMAL_PLACES);
  const absDiff = Math.abs(userTotal - benchmark).toFixed(DISPLAY_DECIMAL_PLACES);
  const direction = diff > 0 ? 'above' : 'below';
  return `${absDiff}t ${direction} ${label} (${benchmark}t)`;
};

/**
 * Builds a richly-contextualised system prompt for the Claude API call.
 *
 * Injects the user's actual emission figures and raw lifestyle inputs so
 * Claude can give specific, numbers-driven advice rather than generic
 * sustainability platitudes. Every insight references a real figure from
 * the user's profile.
 *
 * This is a pure function — it has no side effects and returns the same
 * output for the same inputs, making it straightforward to unit test.
 *
 * @param {import('./validation.js').EmissionsPayload} emissions - Computed annual CO₂ tonnes by category
 * @param {import('./validation.js').InputsPayload}    inputs    - Raw user lifestyle inputs
 * @returns {string} System prompt string ready for the Anthropic messages API
 *
 * @example
 * const prompt = buildSystemPrompt(
 *   { total: 8.5, transport: 3.2, flights: 1.0, electricity: 1.5, heating: 1.2, diet: 1.1, shopping: 0.5 },
 *   { driving: 80, carType: 'petrol', flights: 4, electricity: 300, heating: 'gas', diet: 'omnivore', shopping: 'average' }
 * );
 */
export function buildSystemPrompt(emissions, inputs) {
  const vsIndia  = formatDiff(emissions.total, INDIA_AVG_TONNES,  'India avg');
  const vsGlobal = formatDiff(emissions.total, GLOBAL_AVG_TONNES, 'global avg');

  return `You are an expert carbon footprint advisor for EcoTrace, a personal sustainability app.

== USER'S CURRENT FOOTPRINT PROFILE ==
Total annual footprint: ${emissions.total.toFixed(DISPLAY_DECIMAL_PLACES)}t CO₂e
Benchmarks: ${vsIndia} | ${vsGlobal}

Category breakdown:
  • Transport (car):  ${emissions.transport.toFixed(DISPLAY_DECIMAL_PLACES)}t  — ${inputs.driving} km/week, ${inputs.carType} vehicle
  • Flights:          ${emissions.flights.toFixed(DISPLAY_DECIMAL_PLACES)}t    — ${inputs.flights} flights/year
  • Electricity:      ${emissions.electricity.toFixed(DISPLAY_DECIMAL_PLACES)}t — ${inputs.electricity} kWh/month
  • Heating:          ${emissions.heating.toFixed(DISPLAY_DECIMAL_PLACES)}t    — ${inputs.heating} heating system
  • Diet:             ${emissions.diet.toFixed(DISPLAY_DECIMAL_PLACES)}t       — ${inputs.diet} diet
  • Shopping:         ${emissions.shopping.toFixed(DISPLAY_DECIMAL_PLACES)}t   — ${inputs.shopping} consumer habits

== ADVISOR RULES ==
1. SPECIFIC: Reference the user's actual figures in every response — never give generic advice that ignores the data above.
2. PRIORITISED: Lead with the category that has the highest absolute emissions — that is their biggest lever.
3. ACTIONABLE: Give concrete next steps the user can take this week, this month, and this year.
4. ENCOURAGING: Acknowledge what they are already doing well. Never shame or lecture.
5. HONEST: Accurately describe the magnitude of each change (high / medium / low impact) and any real trade-offs (cost, convenience).

Format responses in Markdown (short paragraphs or a brief list — no walls of text).
When estimating savings, calculate from the user's actual input values shown above.`;
}
