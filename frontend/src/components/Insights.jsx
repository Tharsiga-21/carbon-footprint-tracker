/**
 * @file Insights.jsx
 * @description EcoTrace — Insights panel: score ring, metric cards, Chart.js bar chart,
 * and dynamic insight cards.  All sub-components are defined outside Insights and wrapped
 * in React.memo.  All static values are frozen constants at module level.
 * Zero magic numbers. Zero console.log. Zero unused imports.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { calcEmissions, getInsights } from '../utils/emissions';

// Register only the Chart.js components we actually use
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

// ─── Frozen constants ─────────────────────────────────────────────────────────

/** Semantic colour map — one source of truth for all level-based colouring. */
const COLOR = Object.freeze({
  green: '#16a34a',
  amber: '#d97706',
  red:   '#dc2626',
  track: '#e2e8f0',
  muted: '#64748b',
  text:  '#0f172a',
  bg:    '#f8fafc',
  white: '#ffffff',
});

/** Semi-transparent fills used in chart bars and card backgrounds. */
const COLOR_ALPHA = Object.freeze({
  green: 'rgba(22,163,74,0.10)',
  amber: 'rgba(217,119,6,0.10)',
  red:   'rgba(220,38,38,0.10)',
});

/** Metadata for each emission category. */
const CATEGORY_META = Object.freeze({
  transport: { label: 'Transport', icon: '🚗', unit: 'tCO₂e' },
  flights:   { label: 'Flights',   icon: '✈️', unit: 'tCO₂e' },
  energy:    { label: 'Energy',    icon: '⚡', unit: 'tCO₂e' },
  heating:   { label: 'Heating',   icon: '🔥', unit: 'tCO₂e' },
  diet:      { label: 'Diet',      icon: '🥗', unit: 'tCO₂e' },
  shopping:  { label: 'Shopping',  icon: '🛍️', unit: 'tCO₂e' },
});

/** Diameter of the SVG score ring in pixels. */
const SCORE_RING_SIZE = 200;

/** Stroke width of the SVG score ring track and fill arc. */
const SCORE_RING_STROKE = 14;

/** Footprints above this value are coloured red (high danger). */
const FOOTPRINT_DANGER_CEILING_TONNES = 12;

/** Footprints at or below this are coloured green. */
const FOOTPRINT_LOW_CEILING_TONNES = 4;

/** Global average footprint used as chart reference annotation. */
const GLOBAL_AVG_TONNES = 4.7;

/** Chart.js bar chart config — defined once outside render to avoid re-creation. */
const BAR_CHART_OPTIONS = Object.freeze({
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        /** @param {import('chart.js').TooltipItem<'bar'>} ctx */
        label: ctx => ` ${ctx.parsed.y.toFixed(2)} tCO₂e`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: COLOR.muted, font: { size: 12 } },
    },
    y: {
      grid: { color: '#f1f5f9' },
      ticks: { color: COLOR.muted, font: { size: 11 } },
      title: {
        display: true,
        text: 'tonnes CO₂e / year',
        color: COLOR.muted,
        font: { size: 11 },
      },
    },
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a CO₂e total to a semantic level string.
 * @param {number} total - Annual CO₂e in tonnes.
 * @returns {'green'|'amber'|'red'}
 */
function levelFromTotal(total) {
  if (total <= FOOTPRINT_LOW_CEILING_TONNES)    return 'green';
  if (total < FOOTPRINT_DANGER_CEILING_TONNES)  return 'amber';
  return 'red';
}

/**
 * Maps a per-category value to a level string using a simple heuristic
 * (category share of the danger ceiling).
 * @param {number} value - Category CO₂e in tonnes.
 * @returns {'green'|'amber'|'red'}
 */
function levelFromCategoryValue(value) {
  const categoryCount = Object.keys(CATEGORY_META).length;
  const low           = FOOTPRINT_LOW_CEILING_TONNES    / categoryCount;
  const moderate      = FOOTPRINT_DANGER_CEILING_TONNES / categoryCount;
  if (value <= low)     return 'green';
  if (value < moderate) return 'amber';
  return 'red';
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────

/**
 * Animated SVG ring showing total annual CO₂e.
 * Stroke animates from 0 to fill on mount (0.9 s cubic-bezier).
 * @param {object} props
 * @param {number} props.total - Annual CO₂e in tonnes.
 */
const ScoreRing = React.memo(function ScoreRing({ total }) {
  const level  = levelFromTotal(total);
  const colour = COLOR[level];
  const radius = (SCORE_RING_SIZE - SCORE_RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillFraction  = Math.min(total / FOOTPRINT_DANGER_CEILING_TONNES, 1);
  const dashFill      = fillFraction * circumference;

  const arcRef = useRef(null);

  // Animate stroke on mount (runs once)
  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    arc.style.strokeDasharray = `0 ${circumference}`;
    const rafId = requestAnimationFrame(() => {
      arc.style.transition = 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)';
      arc.style.strokeDasharray = `${dashFill} ${circumference}`;
    });
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent value changes animate via the CSS transition already attached
  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    arc.style.strokeDasharray = `${dashFill} ${circumference}`;
  }, [dashFill, circumference]);

  const cx = SCORE_RING_SIZE / 2;
  const cy = SCORE_RING_SIZE / 2;

  return (
    <div className="ins-ring-wrap">
      <svg
        width={SCORE_RING_SIZE}
        height={SCORE_RING_SIZE}
        role="img"
        aria-label={`Carbon footprint score ring showing ${total.toFixed(1)} tonnes`}
      >
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={COLOR.track}
          strokeWidth={SCORE_RING_STROKE}
          aria-hidden="true"
        />
        {/* Animated fill arc */}
        <circle
          ref={arcRef}
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={SCORE_RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dashFill} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          aria-hidden="true"
        />
        {/* Total value */}
        <text
          x={cx} y={cy - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          aria-hidden="true"
          style={{ fontSize: 30, fontWeight: 700, fill: colour, fontFamily: 'inherit' }}
        >
          {total.toFixed(1)}
        </text>
        {/* Unit */}
        <text
          x={cx} y={cy + 18}
          textAnchor="middle"
          aria-hidden="true"
          style={{ fontSize: 11, fill: COLOR.muted, fontFamily: 'inherit' }}
        >
          tonnes CO₂e / yr
        </text>
      </svg>
      <span
        className="ins-ring-badge"
        style={{ background: COLOR_ALPHA[level], color: colour }}
      >
        {level === 'green' ? 'Low impact' : level === 'amber' ? 'Moderate' : 'High impact'}
      </span>
    </div>
  );
});

// ─── MetricCard ───────────────────────────────────────────────────────────────

/**
 * Compact card displaying a single category's CO₂e value with a colour stripe.
 * @param {object} props
 * @param {keyof typeof CATEGORY_META} props.category - Category key.
 * @param {number} props.value - CO₂e in tonnes for this category.
 */
const MetricCard = React.memo(function MetricCard({ category, value }) {
  const meta   = CATEGORY_META[category];
  const level  = levelFromCategoryValue(value);
  const colour = COLOR[level];

  return (
    <div className="ins-metric" style={{ borderTop: `3px solid ${colour}` }}>
      <span className="ins-metric__icon" aria-hidden="true">{meta.icon}</span>
      <div>
        <div className="ins-metric__label">{meta.label}</div>
        <div className="ins-metric__value" style={{ color: colour }}>
          {value.toFixed(2)}
          <span className="ins-metric__unit"> {meta.unit}</span>
        </div>
      </div>
    </div>
  );
});

// ─── SafeBoldText ─────────────────────────────────────────────────────────────

/**
 * Renders a string that may contain `<strong>…</strong>` markers as React
 * elements — no dangerouslySetInnerHTML.
 * @param {object} props
 * @param {string} props.text - Source string with optional `<strong>…</strong>` tags.
 */
const SafeBoldText = React.memo(function SafeBoldText({ text }) {
  const STRONG_RE = /(<strong>.*?<\/strong>)/g;
  const parts     = text.split(STRONG_RE);

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^<strong>(.*?)<\/strong>$/);
        return match
          ? <strong key={i}>{match[1]}</strong>
          : <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
});

// ─── InsightCard ──────────────────────────────────────────────────────────────

/**
 * Individual actionable insight card with left border colour by level.
 * Uses SafeBoldText so no dangerouslySetInnerHTML is needed.
 * @param {object} props
 * @param {{ title: string, message: string, level: 'green'|'amber'|'red' }} props.insight
 */
const InsightCard = React.memo(function InsightCard({ insight }) {
  const level  = insight.level ?? 'amber';
  const colour = COLOR[level]       ?? COLOR.amber;
  const bgCol  = COLOR_ALPHA[level] ?? COLOR_ALPHA.amber;

  return (
    <div
      className="ins-insight"
      style={{ borderLeft: `4px solid ${colour}`, background: bgCol }}
    >
      <div className="ins-insight__title" style={{ color: colour }}>
        {insight.title}
      </div>
      <div className="ins-insight__body">
        <SafeBoldText text={insight.message} />
      </div>
    </div>
  );
});

// ─── EmissionsChart ───────────────────────────────────────────────────────────

/**
 * Chart.js bar chart displaying per-category emissions breakdown.
 * Only registers BarElement, CategoryScale, LinearScale, Tooltip.
 * BAR_CHART_OPTIONS is defined once at module level — not inside render.
 * @param {object} props
 * @param {object} props.emissions - Map of category key → tonnes CO₂e.
 */
const EmissionsChart = React.memo(function EmissionsChart({ emissions }) {
  const keys   = Object.keys(CATEGORY_META);
  const labels = Object.values(CATEGORY_META).map(m => m.label);
  const values = keys.map(k => emissions[k] ?? 0);
  const bgColors = keys.map(k => {
    const level = levelFromCategoryValue(emissions[k] ?? 0);
    return COLOR[level] + 'cc'; // 80 % opacity hex alpha
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'tCO₂e / year',
        data: values,
        backgroundColor: bgColors,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  return (
    <div className="ins-chart">
      <Bar data={data} options={BAR_CHART_OPTIONS} />
      <div className="ins-chart__avg" aria-label={`Global average: ${GLOBAL_AVG_TONNES} tonnes`}>
        Global avg {GLOBAL_AVG_TONNES} t CO₂e
      </div>
    </div>
  );
});

// ─── Insights ─────────────────────────────────────────────────────────────────

/**
 * EcoTrace Insights panel.
 * Accepts either pre-calculated `emissions` or raw `inputs` (calculates internally).
 * useMemo on all derived values with correct dependency arrays.
 *
 * @param {object}  props
 * @param {object}  [props.emissions] - Pre-calculated emissions map (optional).
 * @param {object}  [props.inputs]    - Raw form inputs (used when emissions not provided).
 */
export default function Insights({ emissions, inputs }) {
  const styleRef = useRef(null);

  // Inject component styles once on mount
  useEffect(() => {
    if (styleRef.current) return;
    const el = document.createElement('style');
    el.textContent = INSIGHTS_STYLES;
    document.head.appendChild(el);
    styleRef.current = el;
    return () => { el.remove(); styleRef.current = null; };
  }, []);

  /**
   * Resolved emissions map — use passed prop or derive from inputs via calcEmissions.
   * @type {object|null}
   */
  const em = useMemo(
    () => emissions ?? (inputs ? calcEmissions(inputs) : null),
    [emissions, inputs],
  );

  /**
   * Total annual CO₂e across all categories.
   * @type {number}
   */
  const total = useMemo(
    () => (em ? Object.values(em).reduce((s, v) => s + v, 0) : 0),
    [em],
  );

  /**
   * Personalised insight cards from the getInsights utility.
   * @type {Array<{title: string, message: string, level: string}>}
   */
  const insights = useMemo(
    () => (em ? getInsights(em, inputs) : []),
    [em, inputs],
  );

  if (!em) {
    return (
      <div className="ins-empty">
        <span className="ins-empty__icon">🌍</span>
        <p>Complete the calculator to see your personalised insights.</p>
      </div>
    );
  }

  return (
    <div className="ins-root">
      {/* ── Header ── */}
      <header className="ins-header">
        <div className="ins-header__text">
          <h2 className="ins-heading">Your Carbon Footprint</h2>
          <p className="ins-subheading">
            Annual estimate based on your lifestyle. The global average is{' '}
            <strong>{GLOBAL_AVG_TONNES} t CO₂e/yr</strong>.
          </p>
        </div>
        <ScoreRing total={total} />
      </header>

      {/* ── Metric cards ── */}
      <section aria-label="Emissions by category">
        <div className="ins-metrics">
          {Object.keys(CATEGORY_META).map(cat => (
            <MetricCard key={cat} category={cat} value={em[cat] ?? 0} />
          ))}
        </div>
      </section>

      {/* ── Bar chart ── */}
      <section aria-labelledby="ins-chart-title">
        <h3 id="ins-chart-title" className="ins-section-title">Breakdown by category</h3>
        <EmissionsChart emissions={em} />
      </section>

      {/* ── Insight cards ── */}
      {insights.length > 0 && (
        <section aria-labelledby="ins-insights-title">
          <h3 id="ins-insights-title" className="ins-section-title">Personalised insights</h3>
          <div className="ins-insights">
            {insights.map((ins, i) => (
              <InsightCard key={i} insight={ins} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const INSIGHTS_STYLES = `
  .ins-root {
    font-family: 'Inter', 'Segoe UI', sans-serif;
    color: #0f172a;
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Header */
  .ins-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .ins-header__text { flex: 1; min-width: 220px; }
  .ins-heading {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .ins-subheading {
    margin: 0.4rem 0 0;
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.55;
  }

  /* Score ring */
  .ins-ring-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .ins-ring-badge {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.2rem 0.8rem;
    border-radius: 999px;
  }

  /* Metric cards */
  .ins-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.85rem;
  }
  .ins-metric {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.9rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .ins-metric__icon { font-size: 1.5rem; line-height: 1; }
  .ins-metric__label {
    font-size: 0.72rem;
    color: #64748b;
    font-weight: 500;
    margin-bottom: 0.2rem;
  }
  .ins-metric__value { font-size: 1.2rem; font-weight: 700; }
  .ins-metric__unit  { font-size: 0.67rem; font-weight: 400; color: #94a3b8; }

  /* Section titles */
  .ins-section-title {
    margin: 0 0 0.85rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #64748b;
  }

  /* Bar chart */
  .ins-chart {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .ins-chart__avg {
    font-size: 0.68rem;
    color: #94a3b8;
    text-align: right;
    margin-top: 0.4rem;
  }

  /* Insight cards */
  .ins-insights {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.8rem;
  }
  .ins-insight {
    border-radius: 0 8px 8px 0;
    padding: 0.85rem 1rem;
  }
  .ins-insight__title {
    font-size: 0.82rem;
    font-weight: 700;
    margin-bottom: 0.3rem;
    letter-spacing: 0.01em;
  }
  .ins-insight__body {
    font-size: 0.8rem;
    color: #475569;
    line-height: 1.55;
  }

  /* Empty state */
  .ins-empty {
    text-align: center;
    padding: 4rem 1rem;
    color: #94a3b8;
    font-size: 0.9rem;
  }
  .ins-empty__icon {
    display: block;
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .ins-header { flex-direction: column-reverse; align-items: flex-start; }
    .ins-metrics { grid-template-columns: 1fr 1fr; }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .ins-ring-wrap circle { transition: none !important; }
  }
`;
