import { useMemo, memo } from "react";
import PropTypes from "prop-types";

// ── Temporal / unit constants ─────────────────────────────────────────────────
/** Number of months in a year. */
const MONTHS_PER_YEAR = 12;
/** Number of weeks in a year. */
const WEEKS_PER_YEAR = 52;
/** Conversion factor from kilograms to metric tonnes. */
const KG_TO_TONNES = 1000;
/** Decimal places used when rounding tonne values. */
const DECIMAL_PRECISION = 2;

// ── Slider range constants ────────────────────────────────────────────────────
/** Minimum value for all sliders that start at zero. */
const SLIDER_MIN = 0;
/** Maximum weekly driving distance in km. */
const SLIDER_MAX_DRIVING_KM = 200;
/** Maximum number of flights per year. */
const SLIDER_MAX_FLIGHTS = 20;
/** Minimum monthly electricity usage in kWh. */
const SLIDER_MIN_ELECTRICITY = 0;
/** Maximum monthly electricity usage in kWh. */
const SLIDER_MAX_ELECTRICITY = 1000;
/** Step increment for the electricity slider. */
const SLIDER_STEP_ELECTRICITY = 10;

// ── Emission factor constants ─────────────────────────────────────────────────
/** kg CO₂ emitted per kWh of electricity (global average grid intensity). */
const ELECTRICITY_KG_PER_KWH = 0.233;
/** kg CO₂ per return-equivalent flight. */
const FLIGHT_KG_PER_FLIGHT = 255;

// ── Scale / rating constants ──────────────────────────────────────────────────
/** Global average annual carbon footprint in tonnes CO₂e. */
const GLOBAL_AVG = 7.5;
/** Upper bound of the meter scale in tonnes CO₂e. */
const MAX_SCALE = 16;
/** Threshold below which a footprint is rated "Excellent". */
const RATING_EXCELLENT_MAX = 3;
/** Threshold below which a footprint is rated "Below Avg". */
const RATING_BELOW_AVG_MAX = 6;
/** Threshold below which a footprint is rated "Near Avg". */
const RATING_NEAR_AVG_MAX = 8.5;
/** Threshold below which a footprint is rated "Above Avg". */
const RATING_ABOVE_AVG_MAX = 12;

// ── Emission factor lookup tables ─────────────────────────────────────────────
/**
 * kg CO₂ emitted per kilometre driven, keyed by fuel/powertrain type.
 * @type {Readonly<Record<string, number>>}
 */
const CAR_FACTORS = Object.freeze({
  petrol:   0.192,
  diesel:   0.171,
  hybrid:   0.105,
  electric: 0.047,
  none:     0,
});

/**
 * kg CO₂ per month for an average household, keyed by heating type.
 * @type {Readonly<Record<string, number>>}
 */
const HEATING_FACTORS = Object.freeze({
  gas:       150,
  oil:       190,
  heatpump:   55,
  electric:   80,
  wood:       30,
});

/**
 * kg CO₂ per month, keyed by diet category.
 * @type {Readonly<Record<string, number>>}
 */
const DIET_FACTORS = Object.freeze({
  vegan:        50,
  vegetarian:   80,
  flexitarian: 120,
  omnivore:    160,
  highMeat:    230,
});

/**
 * kg CO₂ per month, keyed by shopping intensity.
 * @type {Readonly<Record<string, number>>}
 */
const SHOPPING_FACTORS = Object.freeze({
  minimal:   20,
  average:   60,
  frequent: 110,
  heavy:    180,
});

// ── Select option arrays ──────────────────────────────────────────────────────
/** @type {ReadonlyArray<{value: string, label: string}>} */
const CAR_OPTIONS = Object.freeze([
  { value: "petrol",   label: "Petrol / Gasoline" },
  { value: "diesel",   label: "Diesel" },
  { value: "hybrid",   label: "Hybrid" },
  { value: "electric", label: "Electric (EV)" },
  { value: "none",     label: "No car" },
]);

/** @type {ReadonlyArray<{value: string, label: string}>} */
const HEATING_OPTIONS = Object.freeze([
  { value: "gas",      label: "Natural gas" },
  { value: "oil",      label: "Heating oil" },
  { value: "heatpump", label: "Heat pump" },
  { value: "electric", label: "Electric heater" },
  { value: "wood",     label: "Wood / biomass" },
]);

/** @type {ReadonlyArray<{value: string, label: string}>} */
const DIET_OPTIONS = Object.freeze([
  { value: "vegan",       label: "Vegan" },
  { value: "vegetarian",  label: "Vegetarian" },
  { value: "flexitarian", label: "Flexitarian" },
  { value: "omnivore",    label: "Omnivore" },
  { value: "highMeat",    label: "High meat" },
]);

/** @type {ReadonlyArray<{value: string, label: string}>} */
const SHOPPING_OPTIONS = Object.freeze([
  { value: "minimal",  label: "Minimal (secondhand, repairs)" },
  { value: "average",  label: "Average consumer" },
  { value: "frequent", label: "Frequent buyer" },
  { value: "heavy",    label: "Heavy consumer / fast fashion" },
]);

// ── Pure calculation helpers ──────────────────────────────────────────────────

/**
 * Converts a kilogram value to metric tonnes, rounded to DECIMAL_PRECISION.
 * @param {number} kg - Mass in kilograms.
 * @returns {number} Mass in tonnes, rounded.
 */
function kgToTonnes(kg) {
  return +(kg / KG_TO_TONNES).toFixed(DECIMAL_PRECISION);
}

/**
 * @typedef {Object} CO2Inputs
 * @property {number} driving     - Weekly driving distance in km.
 * @property {string} carType     - Key into CAR_FACTORS.
 * @property {number} flights     - Number of return-equivalent flights per year.
 * @property {number} electricity - Monthly electricity consumption in kWh.
 * @property {string} heating     - Key into HEATING_FACTORS.
 * @property {string} diet        - Key into DIET_FACTORS.
 * @property {string} shopping    - Key into SHOPPING_FACTORS.
 */

/**
 * @typedef {Object} CO2Breakdown
 * @property {number} Transport   - Annual transport emissions in tonnes.
 * @property {number} Flights     - Annual flight emissions in tonnes.
 * @property {number} Electricity - Annual electricity emissions in tonnes.
 * @property {number} Heating     - Annual heating emissions in tonnes.
 * @property {number} Diet        - Annual diet emissions in tonnes.
 * @property {number} Shopping    - Annual shopping emissions in tonnes.
 */

/**
 * @typedef {Object} CO2Result
 * @property {number}       total     - Total annual footprint in tonnes CO₂e.
 * @property {CO2Breakdown} breakdown - Per-category annual footprint in tonnes.
 */

/**
 * Calculates the annual carbon footprint from lifestyle inputs.
 * Pure function — no side effects, deterministic output.
 *
 * @param {CO2Inputs} inputs - Lifestyle data from the user.
 * @returns {CO2Result} Total and per-category annual emissions in tonnes CO₂e.
 */
export function calcCO2({ driving, carType, flights, electricity, heating, diet, shopping }) {
  const carKgPerYear         = driving     * WEEKS_PER_YEAR  * (CAR_FACTORS[carType]      ?? 0);
  const flightKgPerYear      = flights     * FLIGHT_KG_PER_FLIGHT;
  const electricityKgPerYear = electricity * MONTHS_PER_YEAR * ELECTRICITY_KG_PER_KWH;
  const heatingKgPerYear     = (HEATING_FACTORS[heating]  ?? 0) * MONTHS_PER_YEAR;
  const dietKgPerYear        = (DIET_FACTORS[diet]        ?? 0) * MONTHS_PER_YEAR;
  const shoppingKgPerYear    = (SHOPPING_FACTORS[shopping] ?? 0) * MONTHS_PER_YEAR;

  const totalKgPerYear =
    carKgPerYear +
    flightKgPerYear +
    electricityKgPerYear +
    heatingKgPerYear +
    dietKgPerYear +
    shoppingKgPerYear;

  return {
    total: kgToTonnes(totalKgPerYear),
    breakdown: {
      Transport:   kgToTonnes(carKgPerYear),
      Flights:     kgToTonnes(flightKgPerYear),
      Electricity: kgToTonnes(electricityKgPerYear),
      Heating:     kgToTonnes(heatingKgPerYear),
      Diet:        kgToTonnes(dietKgPerYear),
      Shopping:    kgToTonnes(shoppingKgPerYear),
    },
  };
}

// ── Rating helper ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} RatingInfo
 * @property {string} label - Human-readable rating label.
 * @property {string} color - Hex colour string for the rating.
 */

/**
 * Returns a display label and colour for a given annual footprint.
 *
 * @param {number} tonnes - Annual CO₂e in tonnes.
 * @returns {RatingInfo} Label and colour for the rating band.
 */
function getRatingInfo(tonnes) {
  if (tonnes < RATING_EXCELLENT_MAX) return { label: "Excellent",   color: "#2E7D32" };
  if (tonnes < RATING_BELOW_AVG_MAX) return { label: "Below Avg",   color: "#558B2F" };
  if (tonnes < RATING_NEAR_AVG_MAX)  return { label: "Near Avg",    color: "#E8A020" };
  if (tonnes < RATING_ABOVE_AVG_MAX) return { label: "Above Avg",   color: "#E65100" };
  return                                    { label: "High Impact", color: "#B71C1C" };
}

/**
 * Calculates what percentage of the meter scale a tonne value fills, clamped to 100.
 *
 * @param {number} tonnes - Value in tonnes CO₂e.
 * @returns {number} Fill percentage (0–100).
 */
function getMeterFillPercent(tonnes) {
  return Math.min((tonnes / MAX_SCALE) * 100, 100);
}

/**
 * Calculates the percentage of the total that a single category represents.
 *
 * @param {number} categoryTonnes - Category value in tonnes.
 * @param {number} totalTonnes    - Total footprint in tonnes.
 * @returns {number} Percentage (0–100).
 */
function getCategoryBarPercent(categoryTonnes, totalTonnes) {
  return totalTonnes > 0 ? (categoryTonnes / totalTonnes) * 100 : 0;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SliderRowProps
 * @property {string}   label  - Visible label for the control.
 * @property {number}   value  - Current numeric value.
 * @property {Function} setter - State setter called with the new numeric value.
 * @property {number}   min    - Minimum slider value.
 * @property {number}   max    - Maximum slider value.
 * @property {number}   [step] - Step increment (default 1).
 * @property {string}   unit   - Unit label displayed alongside the value.
 * @property {string}   icon   - Emoji icon displayed before the label.
 */

/**
 * A labelled range slider with an inline value display.
 * Wrapped in React.memo to prevent re-renders when unrelated state changes,
 * which also makes the stable setter prop meaningful for referential equality.
 *
 * @param {SliderRowProps} props
 * @returns {JSX.Element}
 */
const SliderRow = memo(function SliderRow({ label, value, setter, min, max, step = 1, unit, icon }) {
  const fillPercent = ((value - min) / (max - min)) * 100;

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  function handleChange(e) {
    setter(Number(e.target.value));
  }

  return (
    <div className="input-row">
      <div className="input-row-head">
        <span className="input-icon" aria-hidden="true">{icon}</span>
        <span className="input-label">{label}</span>
        <span className="input-value">
          {value} <span className="input-unit">{unit}</span>
        </span>
      </div>
      <div className="slider-wrap">
        <input
          type="range"
          role="slider"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="slider"
          style={{ "--pct": `${fillPercent}%` }}
        />
        <div className="slider-ticks" aria-hidden="true">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
});

SliderRow.propTypes = {
  label:  PropTypes.string.isRequired,
  value:  PropTypes.number.isRequired,
  setter: PropTypes.func.isRequired,
  min:    PropTypes.number.isRequired,
  max:    PropTypes.number.isRequired,
  step:   PropTypes.number,
  unit:   PropTypes.string.isRequired,
  icon:   PropTypes.string.isRequired,
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SelectOption
 * @property {string} value - Option value submitted to state.
 * @property {string} label - Human-readable option label.
 */

/**
 * @typedef {Object} SelectRowProps
 * @property {string}                      label   - Visible label for the control.
 * @property {string}                      value   - Currently selected option value.
 * @property {Function}                    setter  - State setter called with the new string value.
 * @property {ReadonlyArray<SelectOption>} options - Array of options to render.
 * @property {string}                      icon    - Emoji icon displayed before the label.
 */

/**
 * A labelled native select element.
 * Wrapped in React.memo to prevent re-renders when unrelated state changes,
 * which also makes the stable setter prop meaningful for referential equality.
 *
 * @param {SelectRowProps} props
 * @returns {JSX.Element}
 */
const SelectRow = memo(function SelectRow({ label, value, setter, options, icon }) {
  /** @param {React.ChangeEvent<HTMLSelectElement>} e */
  function handleChange(e) {
    setter(e.target.value);
  }

  return (
    <div className="input-row">
      <div className="input-row-head">
        <span className="input-icon" aria-hidden="true">{icon}</span>
        <span className="input-label">{label}</span>
      </div>
      <select
        className="select-field"
        aria-label={label}
        value={value}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

SelectRow.propTypes = {
  label:   PropTypes.string.isRequired,
  value:   PropTypes.string.isRequired,
  setter:  PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  icon: PropTypes.string.isRequired,
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} MeterCardProps
 * @property {number}     total        - Total annual footprint in tonnes CO₂e.
 * @property {number}     fillPercent  - Meter fill height as a percentage (0–100).
 * @property {RatingInfo} rating       - Label and colour for the current rating band.
 * @property {number}     avgDiffValue - Raw numeric difference vs. global average (positive = above).
 * @property {boolean}    belowAvg     - True when the footprint is below the global average.
 */

/**
 * Vertical meter showing the total carbon footprint and a rating.
 *
 * @param {MeterCardProps} props
 * @returns {JSX.Element}
 */
function MeterCard({ total, fillPercent, rating, avgDiffValue, belowAvg }) {
  const avgLineBottom = `${(GLOBAL_AVG / MAX_SCALE) * 100}%`;
  const fillStyle     = { height: `${fillPercent}%`, background: rating.color };
  const avgLineStyle  = { bottom: avgLineBottom };
  const pillStyle     = { background: `${rating.color}22`, color: rating.color };
  const absDiff       = Math.abs(avgDiffValue).toFixed(DECIMAL_PRECISION);

  return (
    <div className="meter-card card">
      <div className="meter-title">Annual Carbon Footprint</div>

      <div className="meter-wrap">
        <div className="meter-tube" role="img" aria-label={`Carbon footprint meter: ${total} tonnes CO₂e`}>
          <div className="meter-fill" style={fillStyle} />
          <div className="meter-avg-line" style={avgLineStyle} aria-hidden="true">
            <span className="avg-tag">Global avg</span>
          </div>
        </div>
        <div className="meter-labels" aria-hidden="true">
          <span>16t</span>
          <span>8t</span>
          <span>0t</span>
        </div>
      </div>

      <div className="meter-readout">
        <div className="total-num" style={{ color: rating.color }}>
          {total}<span className="total-unit">t CO₂e</span>
        </div>
        <div className="rating-pill" style={pillStyle}>
          {rating.label}
        </div>
        <p className="avg-diff">
          {belowAvg
            ? `${absDiff}t below global average`
            : `${absDiff}t above global average`}
        </p>
      </div>
    </div>
  );
}

MeterCard.propTypes = {
  total:        PropTypes.number.isRequired,
  fillPercent:  PropTypes.number.isRequired,
  rating:       PropTypes.shape({
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  }).isRequired,
  avgDiffValue: PropTypes.number.isRequired,
  belowAvg:     PropTypes.bool.isRequired,
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BreakdownCardProps
 * @property {CO2Breakdown} breakdown - Per-category annual footprint in tonnes.
 * @property {number}       total     - Total annual footprint in tonnes CO₂e.
 */

/**
 * Horizontal bar chart breaking down emissions by category.
 *
 * @param {BreakdownCardProps} props
 * @returns {JSX.Element}
 */
function BreakdownCard({ breakdown, total }) {
  return (
    <div className="breakdown-card card">
      <div className="breakdown-title">Breakdown</div>
      {Object.entries(breakdown).map(([category, value]) => {
        const barWidth = getCategoryBarPercent(value, total);
        return (
          <div key={category} className="bar-row">
            <div className="bar-meta">
              <span className="bar-cat">{category}</span>
              <span className="bar-val">{value}t</span>
            </div>
            <div
              className="bar-track"
              role="meter"
              aria-label={`${category}: ${value} tonnes`}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={total}
            >
              <div className="bar-fill" style={{ width: `${barWidth}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

BreakdownCard.propTypes = {
  breakdown: PropTypes.objectOf(PropTypes.number).isRequired,
  total:     PropTypes.number.isRequired,
};

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CalculatorInputs
 * @property {number} driving     - Weekly driving distance in km.
 * @property {string} carType     - Key into CAR_FACTORS.
 * @property {number} flights     - Number of return-equivalent flights per year.
 * @property {number} electricity - Monthly electricity consumption in kWh.
 * @property {string} heating     - Key into HEATING_FACTORS.
 * @property {string} diet        - Key into DIET_FACTORS.
 * @property {string} shopping    - Key into SHOPPING_FACTORS.
 */

/**
 * @typedef {Object} CalculatorSetters
 * @property {Function} setDriving     - Sets weekly driving distance.
 * @property {Function} setCarType     - Sets car/powertrain type.
 * @property {Function} setFlights     - Sets number of flights per year.
 * @property {Function} setElectricity - Sets monthly electricity usage.
 * @property {Function} setHeating     - Sets heating type.
 * @property {Function} setDiet        - Sets diet category.
 * @property {Function} setShopping    - Sets shopping intensity.
 */

/**
 * @typedef {Object} CalculatorProps
 * @property {CalculatorInputs}  inputs  - Current values for all lifestyle inputs.
 * @property {CalculatorSetters} setters - State setters for each lifestyle input.
 */

/**
 * Carbon footprint calculator.
 * Renders a lifestyle-input form on the left and a live emissions preview on the right.
 *
 * @param {CalculatorProps} props
 * @returns {JSX.Element}
 */
export default function Calculator({ inputs, setters }) {
  const { driving, carType, flights, electricity, heating, diet, shopping } = inputs;
  const { setDriving, setCarType, setFlights, setElectricity, setHeating, setDiet, setShopping } = setters;

  const { total, breakdown } = useMemo(
    () => calcCO2({ driving, carType, flights, electricity, heating, diet, shopping }),
    [driving, carType, flights, electricity, heating, diet, shopping],
  );

  const fillPercent  = getMeterFillPercent(total);
  const rating       = getRatingInfo(total);
  const avgDiffValue = total - GLOBAL_AVG;
  const belowAvg     = avgDiffValue < 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="calc-layout">

        <section className="inputs-card card" aria-label="Lifestyle inputs">
          <div className="section-head">
            <h2 className="section-title">Your Lifestyle</h2>
            <p className="section-sub">Adjust each category to match your habits</p>
          </div>

          <div className="input-group">
            <div className="group-label" aria-hidden="true">🚗 Transport</div>
            <SliderRow
              label="Weekly driving"
              icon="🛣️"
              value={driving}
              setter={setDriving}
              min={SLIDER_MIN}
              max={SLIDER_MAX_DRIVING_KM}
              unit="km/wk"
            />
            <SelectRow
              label="Car type"
              icon="⛽"
              value={carType}
              setter={setCarType}
              options={CAR_OPTIONS}
            />
            <SliderRow
              label="Flights per year"
              icon="✈️"
              value={flights}
              setter={setFlights}
              min={SLIDER_MIN}
              max={SLIDER_MAX_FLIGHTS}
              unit="flights"
            />
          </div>

          <div className="input-group">
            <div className="group-label" aria-hidden="true">🏠 Home Energy</div>
            <SliderRow
              label="Monthly electricity"
              icon="💡"
              value={electricity}
              setter={setElectricity}
              min={SLIDER_MIN_ELECTRICITY}
              max={SLIDER_MAX_ELECTRICITY}
              step={SLIDER_STEP_ELECTRICITY}
              unit="kWh/mo"
            />
            <SelectRow
              label="Heating type"
              icon="🔥"
              value={heating}
              setter={setHeating}
              options={HEATING_OPTIONS}
            />
          </div>

          <div className="input-group">
            <div className="group-label" aria-hidden="true">🍽️ Lifestyle</div>
            <SelectRow
              label="Diet"
              icon="🥗"
              value={diet}
              setter={setDiet}
              options={DIET_OPTIONS}
            />
            <SelectRow
              label="Shopping habits"
              icon="🛍️"
              value={shopping}
              setter={setShopping}
              options={SHOPPING_OPTIONS}
            />
          </div>
        </section>

        <aside className="preview-col" aria-label="Emissions preview">
          <MeterCard
            total={total}
            fillPercent={fillPercent}
            rating={rating}
            avgDiffValue={avgDiffValue}
            belowAvg={belowAvg}
          />
          <BreakdownCard breakdown={breakdown} total={total} />
        </aside>

      </div>
    </>
  );
}

Calculator.propTypes = {
  inputs: PropTypes.shape({
    driving:     PropTypes.number.isRequired,
    carType:     PropTypes.string.isRequired,
    flights:     PropTypes.number.isRequired,
    electricity: PropTypes.number.isRequired,
    heating:     PropTypes.string.isRequired,
    diet:        PropTypes.string.isRequired,
    shopping:    PropTypes.string.isRequired,
  }).isRequired,
  setters: PropTypes.shape({
    setDriving:     PropTypes.func.isRequired,
    setCarType:     PropTypes.func.isRequired,
    setFlights:     PropTypes.func.isRequired,
    setElectricity: PropTypes.func.isRequired,
    setHeating:     PropTypes.func.isRequired,
    setDiet:        PropTypes.func.isRequired,
    setShopping:    PropTypes.func.isRequired,
  }).isRequired,
};

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
/* layout */
.calc-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.5rem;
  align-items: start;
}
@media (max-width: 750px) {
  .calc-layout { grid-template-columns: 1fr; }
  .preview-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
}
@media (max-width: 500px) {
  .preview-col { grid-template-columns: 1fr; }
}

/* card */
.card {
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}

/* section header */
.section-head { margin-bottom: 1.5rem; }
.section-title {
  font-family: var(--ff-head); font-size: 1.1rem;
  font-weight: 700; color: var(--forest);
}
.section-sub { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }

/* input groups */
.input-group { margin-bottom: 1.5rem; }
.input-group:last-child { margin-bottom: 0; }
.group-label {
  font-family: var(--ff-head); font-size: 0.72rem;
  font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
  color: var(--muted); margin-bottom: .75rem;
  padding-bottom: .4rem; border-bottom: 1px solid var(--border);
}

/* input row */
.input-row { margin-bottom: 1rem; }
.input-row:last-child { margin-bottom: 0; }
.input-row-head {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 6px;
}
.input-icon { font-size: .9rem; }
.input-label {
  flex: 1; font-size: 0.83rem; font-weight: 500; color: var(--text);
}
.input-value {
  font-family: var(--ff-head); font-size: 0.83rem;
  font-weight: 600; color: var(--leaf-dim);
}
.input-unit { font-weight: 400; color: var(--muted); font-size: 0.75rem; }

/* slider */
.slider-wrap { position: relative; }
.slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 5px; border-radius: 50px;
  background: linear-gradient(to right, var(--leaf) var(--pct), var(--border) var(--pct));
  outline: none; cursor: pointer;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--leaf); border: 2px solid #fff;
  box-shadow: 0 1px 6px rgba(76,175,80,.4);
  cursor: pointer; transition: transform .15s;
}
.slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.slider-ticks {
  display: flex; justify-content: space-between;
  font-size: 0.65rem; color: var(--muted); margin-top: 2px;
}

/* select */
.select-field {
  width: 100%; padding: 8px 12px;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg); color: var(--text);
  font-family: var(--ff-body); font-size: 0.83rem;
  cursor: pointer; outline: none;
  transition: border-color .2s;
}
.select-field:focus { border-color: var(--leaf); }

/* preview col */
.preview-col { display: flex; flex-direction: column; gap: 1rem; }

/* meter card */
.meter-card { text-align: center; }
.meter-title {
  font-family: var(--ff-head); font-size: 0.8rem;
  font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: .06em;
  margin-bottom: 1rem;
}
.meter-wrap {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 8px; height: 180px; margin-bottom: 1rem;
}
.meter-tube {
  position: relative; width: 36px; height: 100%;
  background: var(--atmo-lt); border-radius: 50px;
  overflow: hidden; border: 1px solid var(--border);
}
.meter-fill {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-radius: 50px;
  transition: height .5s cubic-bezier(.34,1.4,.64,1), background .5s;
}
.meter-avg-line {
  position: absolute; left: -1px; right: -1px; height: 2px;
  background: var(--amber); z-index: 2;
}
.avg-tag {
  position: absolute; left: calc(100% + 6px); top: -8px;
  font-size: 0.6rem; color: var(--amber); white-space: nowrap;
  font-family: var(--ff-head); font-weight: 600;
}
.meter-labels {
  display: flex; flex-direction: column;
  justify-content: space-between; height: 100%;
  font-size: 0.65rem; color: var(--muted);
  font-family: var(--ff-head);
}
.meter-readout { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.total-num {
  font-family: var(--ff-head); font-size: 2.25rem; font-weight: 700;
  line-height: 1; transition: color .4s;
}
.total-unit { font-size: 1rem; font-weight: 500; margin-left: 3px; }
.rating-pill {
  font-family: var(--ff-head); font-size: 0.72rem; font-weight: 600;
  padding: 4px 12px; border-radius: 50px;
  letter-spacing: .04em;
}
.avg-diff { font-size: 0.75rem; color: var(--muted); }

/* breakdown */
.breakdown-title {
  font-family: var(--ff-head); font-size: 0.8rem;
  font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: .06em;
  margin-bottom: .85rem;
}
.bar-row { margin-bottom: .6rem; }
.bar-row:last-child { margin-bottom: 0; }
.bar-meta {
  display: flex; justify-content: space-between;
  font-size: 0.75rem; margin-bottom: 3px;
}
.bar-cat { color: var(--text); font-weight: 500; }
.bar-val { color: var(--muted); font-family: var(--ff-head); }
.bar-track {
  height: 6px; background: var(--atmo-lt);
  border-radius: 50px; overflow: hidden;
}
.bar-fill {
  height: 100%; background: var(--leaf);
  border-radius: 50px;
  transition: width .4s cubic-bezier(.34,1.2,.64,1);
}
`;
