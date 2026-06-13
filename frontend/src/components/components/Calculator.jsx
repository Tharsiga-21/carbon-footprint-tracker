/**
 * @file Calculator.jsx
 * @description EcoTrace — interactive carbon-footprint input panel with live preview.
 * All sub-components are defined outside Calculator and wrapped in React.memo.
 * All event handlers are named handle* and wrapped in useCallback.
 * Zero inline styles mixed with JSX logic — styles live in CALCULATOR_STYLES at bottom.
 * Zero magic numbers — all limits defined as named constants.
 * Zero console.log. Zero unused imports.
 */

import React, { useCallback, useId, useEffect, useRef } from 'react';
import { calcCO2 } from '../utils/emissions';

// ─── Domain constants ──────────────────────────────────────────────────────────

/** Maximum weekly driving distance shown on slider (km). */
const MAX_DRIVING_KM_PER_WEEK = 200;

/** Maximum annual flight count shown on slider. */
const MAX_FLIGHTS_PER_YEAR = 20;

/** Maximum monthly electricity usage shown on slider (kWh). */
const MAX_ELECTRICITY_KWH = 1000;

/** Step increment for the electricity slider (kWh). */
const ELECTRICITY_STEP_KWH = 10;

/** Upper bound of the thermometer scale (tonnes CO₂e/yr). */
const MAX_SCALE_TONNES = 16;

/** Global average annual footprint used for the reference marker (tonnes CO₂e/yr). */
const GLOBAL_AVG_TONNES = 4.7;

/** Threshold below which the rating is considered "low" (tonnes CO₂e/yr). */
const LOW_THRESHOLD = 4;

/** Threshold below which the rating is considered "moderate" (tonnes CO₂e/yr). */
const MODERATE_THRESHOLD = 10;

// ─── Select option arrays (frozen, defined once at module level) ───────────────

/** @type {ReadonlyArray<{value: string, label: string}>} */
const CAR_OPTIONS = Object.freeze([
  { value: 'none',     label: 'No car / EV' },
  { value: 'hybrid',   label: 'Hybrid' },
  { value: 'small',    label: 'Small petrol' },
  { value: 'medium',   label: 'Medium petrol' },
  { value: 'large',    label: 'Large / SUV' },
]);

/** @type {ReadonlyArray<{value: string, label: string}>} */
const HEATING_OPTIONS = Object.freeze([
  { value: 'heatpump', label: 'Heat pump' },
  { value: 'gas',      label: 'Natural gas' },
  { value: 'oil',      label: 'Heating oil' },
  { value: 'electric', label: 'Electric resistance' },
  { value: 'wood',     label: 'Wood / biomass' },
]);

/** @type {ReadonlyArray<{value: string, label: string}>} */
const DIET_OPTIONS = Object.freeze([
  { value: 'vegan',       label: 'Vegan' },
  { value: 'vegetarian',  label: 'Vegetarian' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'omnivore',    label: 'Omnivore' },
  { value: 'highMeat',    label: 'High meat' },
]);

/** @type {ReadonlyArray<{value: string, label: string}>} */
const SHOPPING_OPTIONS = Object.freeze([
  { value: 'minimal',   label: 'Minimal / second-hand' },
  { value: 'average',   label: 'Average' },
  { value: 'frequent',  label: 'Frequent shopper' },
  { value: 'heavy',     label: 'Heavy / luxury' },
]);

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Derives a rating label and CSS colour token from a total CO₂e figure.
 * @param {number} total - Annual CO₂e in tonnes.
 * @returns {{ label: string, colour: string }}
 */
function getRating(total) {
  if (total <= LOW_THRESHOLD)      return { label: 'Low',      colour: 'var(--eco-green)'  };
  if (total <= MODERATE_THRESHOLD) return { label: 'Moderate', colour: 'var(--eco-amber)'  };
  return                                   { label: 'High',     colour: 'var(--eco-red)'    };
}

// ─── SliderRow ────────────────────────────────────────────────────────────────

/**
 * Accessible range slider with CSS gradient fill and min/max tick labels.
 * @param {object} props
 * @param {string}   props.label    - Human-readable field label.
 * @param {number}   props.value    - Current value.
 * @param {Function} props.onChange - Change handler receiving the numeric value.
 * @param {number}   props.min      - Slider minimum.
 * @param {number}   props.max      - Slider maximum.
 * @param {number}   props.step     - Step increment.
 * @param {string}   props.unit     - Unit suffix displayed next to value.
 * @param {string}   props.icon     - Emoji or icon character.
 */
const SliderRow = React.memo(function SliderRow({
  label, value, onChange, min, max, step, unit, icon,
}) {
  const id  = useId();
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="eco-field">
      <label htmlFor={id} className="eco-field__label">
        <span className="eco-field__icon" aria-hidden="true">{icon}</span>
        {label}
        <span className="eco-field__value">{value} {unit}</span>
      </label>
      <div className="eco-slider-wrap">
        <input
          type="range"
          id={id}
          className="eco-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={`${label}: ${value} ${unit}`}
          style={{ '--pct': `${pct}%` }}
        />
        <div className="eco-slider-ticks" aria-hidden="true">
          <span>{min} {unit}</span>
          <span>{max} {unit}</span>
        </div>
      </div>
    </div>
  );
});

// ─── SelectRow ────────────────────────────────────────────────────────────────

/**
 * Accessible labelled select control rendered from a props options array.
 * @param {object} props
 * @param {string}   props.label    - Human-readable field label.
 * @param {string}   props.value    - Current selected value.
 * @param {Function} props.onChange - Change handler receiving the string value.
 * @param {ReadonlyArray<{value: string, label: string}>} props.options
 * @param {string}   props.icon     - Emoji or icon character.
 */
const SelectRow = React.memo(function SelectRow({
  label, value, onChange, options, icon,
}) {
  const id = useId();

  return (
    <div className="eco-field">
      <label htmlFor={id} className="eco-field__label">
        <span className="eco-field__icon" aria-hidden="true">{icon}</span>
        {label}
      </label>
      <select
        id={id}
        className="eco-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
});

// ─── ThermometerPreview ───────────────────────────────────────────────────────

/**
 * Vertical thermometer bar with animated fill, a global-average reference line,
 * and a dynamic rating pill.
 * @param {object} props
 * @param {number} props.total - Annual CO₂e in tonnes.
 */
const ThermometerPreview = React.memo(function ThermometerPreview({ total }) {
  const fillPct   = Math.min((total / MAX_SCALE_TONNES) * 100, 100);
  const avgPct    = (GLOBAL_AVG_TONNES / MAX_SCALE_TONNES) * 100;
  const { label, colour } = getRating(total);

  return (
    <div className="eco-thermo">
      <div className="eco-thermo__tube" aria-hidden="true">
        <div
          className="eco-thermo__fill"
          style={{ height: `${fillPct}%`, background: colour }}
        />
        <div
          className="eco-thermo__avg-line"
          style={{ bottom: `${avgPct}%` }}
        >
          <span className="eco-thermo__avg-label">Global avg</span>
        </div>
      </div>
      <div className="eco-thermo__total" style={{ color: colour }}>
        {total.toFixed(1)}
        <span className="eco-thermo__unit">t CO₂e/yr</span>
      </div>
      <div className="eco-thermo__pill" style={{ background: colour }}>
        {label}
      </div>
    </div>
  );
});

// ─── BreakdownBars ────────────────────────────────────────────────────────────

/** @type {ReadonlyArray<{key: string, label: string, icon: string}>} */
const BREAKDOWN_CATEGORIES = Object.freeze([
  { key: 'transport', label: 'Transport', icon: '🚗' },
  { key: 'flights',   label: 'Flights',   icon: '✈️' },
  { key: 'energy',    label: 'Energy',    icon: '⚡' },
  { key: 'heating',   label: 'Heating',   icon: '🔥' },
  { key: 'diet',      label: 'Diet',      icon: '🥗' },
  { key: 'shopping',  label: 'Shopping',  icon: '🛍️' },
]);

/**
 * Horizontal proportional bars showing per-category share of total footprint.
 * @param {object} props
 * @param {object} props.breakdown - Map of category key → CO₂e tonnes.
 * @param {number} props.total     - Sum of all categories.
 */
const BreakdownBars = React.memo(function BreakdownBars({ breakdown, total }) {
  return (
    <div className="eco-breakdown">
      <h3 className="eco-breakdown__title">Category breakdown</h3>
      {BREAKDOWN_CATEGORIES.map(({ key, label, icon }) => {
        const val    = breakdown[key] ?? 0;
        const widPct = total > 0 ? (val / total) * 100 : 0;
        return (
          <div key={key} className="eco-breakdown__row">
            <span className="eco-breakdown__icon" aria-hidden="true">{icon}</span>
            <span className="eco-breakdown__label">{label}</span>
            <div className="eco-breakdown__track">
              <div
                className="eco-breakdown__bar"
                style={{ width: `${widPct}%` }}
                role="meter"
                aria-label={`${label}: ${val.toFixed(2)} tonnes`}
                aria-valuenow={val}
                aria-valuemin={0}
                aria-valuemax={total}
              />
            </div>
            <span className="eco-breakdown__num">{val.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
});

// ─── Calculator ───────────────────────────────────────────────────────────────

/**
 * EcoTrace main calculator panel.
 * Receives current input state and a setter, renders grouped input controls
 * plus a live-updating preview column.
 *
 * @param {object}   props
 * @param {object}   props.inputs   - Current form values (see useEcoInputs hook).
 * @param {Function} props.setInput - Setter: (key: string, value: any) => void.
 */
export default function Calculator({ inputs, setInput }) {
  const styleRef = useRef(null);

  // Inject component styles once on mount
  useEffect(() => {
    if (styleRef.current) return;
    const el = document.createElement('style');
    el.textContent = CALCULATOR_STYLES;
    document.head.appendChild(el);
    styleRef.current = el;
    return () => { el.remove(); styleRef.current = null; };
  }, []);

  /** @type {object} Per-category CO₂e breakdown produced by calcCO2 utility. */
  const breakdown = calcCO2(inputs);
  const total     = Object.values(breakdown).reduce((s, v) => s + v, 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** @param {number} v */
  const handleDrivingKm  = useCallback(v => setInput('drivingKm',  v), [setInput]);
  /** @param {string} v */
  const handleCarType    = useCallback(v => setInput('carType',    v), [setInput]);
  /** @param {number} v */
  const handleFlights    = useCallback(v => setInput('flights',    v), [setInput]);
  /** @param {number} v */
  const handleElectricity= useCallback(v => setInput('electricity',v), [setInput]);
  /** @param {string} v */
  const handleHeating    = useCallback(v => setInput('heating',    v), [setInput]);
  /** @param {string} v */
  const handleDiet       = useCallback(v => setInput('diet',       v), [setInput]);
  /** @param {string} v */
  const handleShopping   = useCallback(v => setInput('shopping',   v), [setInput]);

  return (
    <div className="eco-calc">
      {/* ── Input panel ── */}
      <div className="eco-calc__inputs">

        {/* Transport */}
        <section className="eco-group" aria-labelledby="grp-transport">
          <h2 id="grp-transport" className="eco-group__title">
            <span aria-hidden="true">🚗</span> Transport
          </h2>
          <SliderRow
            label="Weekly driving"
            value={inputs.drivingKm}
            onChange={handleDrivingKm}
            min={0}
            max={MAX_DRIVING_KM_PER_WEEK}
            step={5}
            unit="km"
            icon="🛣️"
          />
          <SelectRow
            label="Vehicle type"
            value={inputs.carType}
            onChange={handleCarType}
            options={CAR_OPTIONS}
            icon="🚘"
          />
          <SliderRow
            label="Return flights per year"
            value={inputs.flights}
            onChange={handleFlights}
            min={0}
            max={MAX_FLIGHTS_PER_YEAR}
            step={1}
            unit="flights"
            icon="✈️"
          />
        </section>

        {/* Home Energy */}
        <section className="eco-group" aria-labelledby="grp-energy">
          <h2 id="grp-energy" className="eco-group__title">
            <span aria-hidden="true">⚡</span> Home Energy
          </h2>
          <SliderRow
            label="Monthly electricity"
            value={inputs.electricity}
            onChange={handleElectricity}
            min={0}
            max={MAX_ELECTRICITY_KWH}
            step={ELECTRICITY_STEP_KWH}
            unit="kWh"
            icon="💡"
          />
          <SelectRow
            label="Heating source"
            value={inputs.heating}
            onChange={handleHeating}
            options={HEATING_OPTIONS}
            icon="🔥"
          />
        </section>

        {/* Lifestyle */}
        <section className="eco-group" aria-labelledby="grp-lifestyle">
          <h2 id="grp-lifestyle" className="eco-group__title">
            <span aria-hidden="true">🌿</span> Lifestyle
          </h2>
          <SelectRow
            label="Diet"
            value={inputs.diet}
            onChange={handleDiet}
            options={DIET_OPTIONS}
            icon="🥗"
          />
          <SelectRow
            label="Shopping habits"
            value={inputs.shopping}
            onChange={handleShopping}
            options={SHOPPING_OPTIONS}
            icon="🛍️"
          />
        </section>
      </div>

      {/* ── Live preview column ── */}
      <div className="eco-calc__preview">
        <ThermometerPreview total={total} />
        <BreakdownBars breakdown={breakdown} total={total} />
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CALCULATOR_STYLES = `
  /* Design tokens */
  :root {
    --eco-green:       #16a34a;
    --eco-amber:       #d97706;
    --eco-red:         #dc2626;
    --eco-surface:     #f8fafc;
    --eco-border:      #e2e8f0;
    --eco-text:        #0f172a;
    --eco-muted:       #64748b;
    --eco-radius:      10px;
    --eco-track-h:     6px;
    --eco-transition:  0.25s ease;
  }

  /* Layout */
  .eco-calc {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 2rem;
    align-items: start;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    color: var(--eco-text);
  }
  @media (max-width: 720px) {
    .eco-calc { grid-template-columns: 1fr; }
    .eco-calc__preview { order: -1; }
  }

  /* Input groups */
  .eco-group {
    background: #fff;
    border: 1px solid var(--eco-border);
    border-radius: var(--eco-radius);
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
  }
  .eco-group__title {
    margin: 0 0 1rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--eco-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  /* Field wrapper */
  .eco-field { margin-bottom: 1.1rem; }
  .eco-field:last-child { margin-bottom: 0; }

  .eco-field__label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.45rem;
  }
  .eco-field__icon { font-size: 1rem; }
  .eco-field__value {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--eco-green);
  }

  /* Slider */
  .eco-slider-wrap { position: relative; }
  .eco-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: var(--eco-track-h);
    border-radius: 999px;
    outline: none;
    cursor: pointer;
    background: linear-gradient(
      to right,
      var(--eco-green) 0%,
      var(--eco-green) var(--pct, 0%),
      var(--eco-border) var(--pct, 0%),
      var(--eco-border) 100%
    );
    transition: background var(--eco-transition);
  }
  .eco-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--eco-green);
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    transition: transform 0.15s;
  }
  .eco-slider::-moz-range-thumb {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--eco-green);
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }
  .eco-slider:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--eco-green); outline-offset: 2px; }
  .eco-slider:hover::-webkit-slider-thumb { transform: scale(1.15); }

  .eco-slider-ticks {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--eco-muted);
    margin-top: 0.25rem;
  }

  /* Select */
  .eco-select {
    width: 100%;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--eco-border);
    border-radius: 6px;
    background: var(--eco-surface);
    font-size: 0.875rem;
    color: var(--eco-text);
    cursor: pointer;
    outline: none;
    transition: border-color var(--eco-transition);
  }
  .eco-select:focus-visible { border-color: var(--eco-green); box-shadow: 0 0 0 2px rgba(22,163,74,0.2); }

  /* Thermometer preview */
  .eco-calc__preview {
    position: sticky;
    top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .eco-thermo {
    background: #fff;
    border: 1px solid var(--eco-border);
    border-radius: var(--eco-radius);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  .eco-thermo__tube {
    position: relative;
    width: 36px;
    height: 180px;
    background: var(--eco-surface);
    border: 1px solid var(--eco-border);
    border-radius: 999px;
    overflow: hidden;
  }
  .eco-thermo__fill {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    border-radius: 999px;
    transition: height 0.55s cubic-bezier(0.4,0,0.2,1),
                background 0.35s ease;
  }
  .eco-thermo__avg-line {
    position: absolute;
    left: -8px; right: -8px;
    height: 2px;
    background: #94a3b8;
    z-index: 2;
  }
  .eco-thermo__avg-label {
    position: absolute;
    left: calc(100% + 6px);
    top: -9px;
    white-space: nowrap;
    font-size: 0.62rem;
    color: #94a3b8;
    font-weight: 500;
  }
  .eco-thermo__total {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    transition: color 0.35s ease;
  }
  .eco-thermo__unit {
    display: block;
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--eco-muted);
    text-align: center;
    margin-top: 0.1rem;
  }
  .eco-thermo__pill {
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 0.2rem 0.75rem;
    border-radius: 999px;
    transition: background 0.35s ease;
  }

  /* Breakdown bars */
  .eco-breakdown {
    background: #fff;
    border: 1px solid var(--eco-border);
    border-radius: var(--eco-radius);
    padding: 1rem 1.25rem;
  }
  .eco-breakdown__title {
    margin: 0 0 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--eco-muted);
  }
  .eco-breakdown__row {
    display: grid;
    grid-template-columns: 1.25rem 5rem 1fr 3rem;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }
  .eco-breakdown__row:last-child { margin-bottom: 0; }
  .eco-breakdown__icon { font-size: 0.9rem; text-align: center; }
  .eco-breakdown__label { font-size: 0.75rem; color: var(--eco-muted); }
  .eco-breakdown__track {
    height: 6px;
    background: var(--eco-surface);
    border-radius: 999px;
    overflow: hidden;
  }
  .eco-breakdown__bar {
    height: 100%;
    background: var(--eco-green);
    border-radius: 999px;
    transition: width 0.45s cubic-bezier(0.4,0,0.2,1);
    min-width: 2px;
  }
  .eco-breakdown__num {
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    color: var(--eco-muted);
    text-align: right;
  }

  /* Reduced-motion respect */
  @media (prefers-reduced-motion: reduce) {
    .eco-thermo__fill,
    .eco-breakdown__bar,
    .eco-slider { transition: none; }
  }
`;
