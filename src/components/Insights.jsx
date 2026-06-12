// src/components/Insights.jsx
import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { calcEmissions, getInsights } from "../utils/emissions";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Numeric constants ─────────────────────────────────────────────────────────
/** Diameter of the score ring SVG in pixels. */
const SCORE_RING_SIZE = 200;
/** Stroke width of the score ring arc in pixels. */
const SCORE_RING_STROKE = 14;
/** Tonnes CO₂e ceiling used to scale the score ring to 100 %. */
const FOOTPRINT_DANGER_CEILING_TONNES = 12;
/** Tonnes CO₂e upper bound for a "low" rating. */
const SCORE_LOW_MAX_TONNES = 3;
/** Tonnes CO₂e upper bound for a "medium" rating. */
const SCORE_MED_MAX_TONNES = 7;
/** Width of the left-accent stripe on metric and insight cards, in pixels. */
const CARD_STRIPE_WIDTH = 3;
/** Border-left width of the insight card accent, in pixels. */
const INSIGHT_BORDER_LEFT_WIDTH = 4;
/** Opacity hex suffix applied to bar background colours (80 % opacity). */
const BAR_BG_OPACITY_HEX = "cc";
/** Chart.js border width for bar datasets. */
const BAR_BORDER_WIDTH = 2;
/** Chart.js border radius for bar datasets. */
const BAR_BORDER_RADIUS = 6;
/** Height of the chart wrapper in pixels. */
const CHART_HEIGHT_PX = 260;

// ── Design tokens ─────────────────────────────────────────────────────────────
/**
 * Immutable palette and surface colours used throughout the component.
 * @type {Readonly<Record<string, string>>}
 */
const COLOR = Object.freeze({
  green:       "#22c55e",
  greenMuted:  "#dcfce7",
  amber:       "#f59e0b",
  amberMuted:  "#fef3c7",
  red:         "#ef4444",
  redMuted:    "#fee2e2",
  surface:     "#0f172a",
  card:        "#1e293b",
  border:      "#334155",
  textPrimary: "#f1f5f9",
  textMuted:   "#94a3b8",
  accent:      "#34d399",
});

/**
 * Immutable display metadata for each emission category.
 * @type {Readonly<Record<string, {label: string, icon: string, unit: string}>>}
 */
const CATEGORY_META = Object.freeze({
  transport: { label: "Transport", icon: "🚗", unit: "t CO₂e" },
  energy:    { label: "Energy",    icon: "⚡", unit: "t CO₂e" },
  diet:      { label: "Diet",      icon: "🌿", unit: "t CO₂e" },
  shopping:  { label: "Shopping",  icon: "🛍", unit: "t CO₂e" },
});

/** Ordered list of emission category keys. */
const EMISSION_CATEGORIES = Object.freeze(["transport", "energy", "diet", "shopping"]);

// ── Bar chart options (static — no render-time dependencies) ──────────────────
/**
 * Chart.js options object for the emissions bar chart.
 * Extracted to file scope so the object reference is stable across renders.
 * @type {import("chart.js").ChartOptions<"bar">}
 */
const BAR_CHART_OPTIONS = Object.freeze({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: COLOR.card,
      titleColor:      COLOR.textPrimary,
      bodyColor:       COLOR.textMuted,
      borderColor:     COLOR.border,
      borderWidth:     1,
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y} t CO₂e`,
      },
    },
  },
  scales: {
    x: {
      ticks:  { color: COLOR.textMuted, font: { size: 13 } },
      grid:   { display: false },
      border: { color: COLOR.border },
    },
    y: {
      ticks:  { color: COLOR.textMuted, font: { size: 12 } },
      grid:   { color: `${COLOR.border}55` },
      border: { color: COLOR.border },
      title:  {
        display: true,
        text:    "Tonnes CO₂e",
        color:   COLOR.textMuted,
        font:    { size: 12 },
      },
    },
  },
});

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ScoreColorResult
 * @property {string} stroke - Hex colour for the active arc / value text.
 * @property {string} label  - Human-readable rating label.
 * @property {string} bg     - Muted background colour for the rating badge.
 * @property {string} text   - Dark text colour for use on the muted background.
 */

/**
 * Returns display colours and a label for a given total footprint.
 *
 * @param {number} total - Annual CO₂e in tonnes.
 * @returns {ScoreColorResult} Stroke, label, background, and text colours.
 */
function scoreColor(total) {
  if (total <= SCORE_LOW_MAX_TONNES) {
    return { stroke: COLOR.green, label: "Low",    bg: COLOR.greenMuted, text: "#166534" };
  }
  if (total <= SCORE_MED_MAX_TONNES) {
    return { stroke: COLOR.amber, label: "Medium", bg: COLOR.amberMuted, text: "#92400e" };
  }
  return               { stroke: COLOR.red,   label: "High",   bg: COLOR.redMuted,   text: "#991b1b" };
}

/**
 * Returns the left-border accent colour for an insight card.
 *
 * @param {"low" | "med" | "high"} level - Severity level of the insight.
 * @returns {string} Hex colour string.
 */
function insightBorderColor(level) {
  if (level === "low") return COLOR.green;
  if (level === "med") return COLOR.amber;
  return COLOR.red;
}

/**
 * Splits an HTML string containing `<strong>` tags into an array of
 * React elements, rendering bold segments safely without innerHTML.
 *
 * @param {string} html - Message string that may contain `<strong>…</strong>`.
 * @returns {React.ReactNode[]} Array of text and `<strong>` React nodes.
 */
function parseStrongTags(html) {
  const STRONG_PATTERN = /(<strong>.*?<\/strong>)/g;
  const parts = html.split(STRONG_PATTERN);

  return parts.map((part, index) => {
    const match = part.match(/^<strong>(.*?)<\/strong>$/);
    if (match) {
      return <strong key={index}>{match[1]}</strong>;
    }
    return part;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Renders insight message text, safely converting `<strong>` tags to React
 * elements. Replaces `dangerouslySetInnerHTML`.
 *
 * @param {{ message: string }} props
 * @returns {JSX.Element}
 */
function InsightMessage({ message }) {
  return <p style={styles.insightBody}>{parseStrongTags(message)}</p>;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ScoreRingProps
 * @property {number} total - Total annual footprint in tonnes CO₂e.
 */

/**
 * Animated SVG ring that visualises the total carbon footprint against a
 * fixed danger ceiling, with a centred numeric readout and rating badge.
 *
 * @param {ScoreRingProps} props
 * @returns {JSX.Element}
 */
function ScoreRing({ total }) {
  const radius          = (SCORE_RING_SIZE - SCORE_RING_STROKE) / 2;
  const circumference   = 2 * Math.PI * radius;
  const fillFraction    = Math.min(total / FOOTPRINT_DANGER_CEILING_TONNES, 1);
  const dashLength      = fillFraction * circumference;
  const { stroke, label } = scoreColor(total);
  const centre          = SCORE_RING_SIZE / 2;

  const progressStyle = {
    transition:       "stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)",
  };

  return (
    <div
      style={styles.ringWrap}
      role="img"
      aria-label={`Carbon footprint score: ${total.toFixed(2)} tonnes CO₂e per year — ${label} impact`}
    >
      <svg
        width={SCORE_RING_SIZE}
        height={SCORE_RING_SIZE}
        style={styles.ringSvg}
        aria-hidden="true"
      >
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke={COLOR.border}
          strokeWidth={SCORE_RING_STROKE}
        />
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={SCORE_RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${circumference}`}
          style={progressStyle}
        />
      </svg>

      <div style={styles.ringCenter}>
        <span style={{ ...styles.ringTotal, color: stroke }}>
          {total.toFixed(2)}
        </span>
        <span style={styles.ringUnit}>t CO₂e / yr</span>
        <span style={{ ...styles.ringLabel, background: `${stroke}22`, color: stroke }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} MetricCardProps
 * @property {string} category - Emission category key (e.g. "transport").
 * @property {number} value    - Category emission value in tonnes CO₂e.
 */

/**
 * Displays a single emission category's value with an icon, label, and
 * a colour-coded left-accent stripe.
 *
 * @param {MetricCardProps} props
 * @returns {JSX.Element}
 */
function MetricCard({ category, value }) {
  const meta           = CATEGORY_META[category];
  const { stroke }     = scoreColor(value);
  const stripeStyle    = { ...styles.metricStripe, background: stroke };
  const valueStyle     = { ...styles.metricValue, color: stroke };

  return (
    <div style={styles.metricCard}>
      <span style={styles.metricIcon} aria-hidden="true">{meta.icon}</span>
      <div style={styles.metricBody}>
        <span style={styles.metricLabel}>{meta.label}</span>
        <span style={valueStyle}>
          {value.toFixed(2)}
          <span style={styles.metricUnit}> {meta.unit}</span>
        </span>
      </div>
      <div style={stripeStyle} aria-hidden="true" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Insight
 * @property {string}              message - Insight text; may contain `<strong>` tags.
 * @property {"low" | "med" | "high"} level - Severity level driving border colour.
 */

/**
 * @typedef {Object} InsightCardProps
 * @property {Insight} insight - Insight data to display.
 */

/**
 * Renders a single personalised insight with a coloured left border and
 * dot indicator. Uses `InsightMessage` for safe rich-text rendering.
 *
 * @param {InsightCardProps} props
 * @returns {JSX.Element}
 */
function InsightCard({ insight }) {
  const accent         = insightBorderColor(insight.level);
  const cardStyle      = { ...styles.insightCard, borderLeftColor: accent };
  const dotStyle       = { ...styles.insightDot, background: accent };

  return (
    <div style={cardStyle}>
      <div style={dotStyle} aria-hidden="true" />
      <InsightMessage message={insight.message} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} EmissionsData
 * @property {number} transport - Transport emissions in tonnes CO₂e.
 * @property {number} energy    - Energy emissions in tonnes CO₂e.
 * @property {number} diet      - Diet emissions in tonnes CO₂e.
 * @property {number} shopping  - Shopping emissions in tonnes CO₂e.
 * @property {number} total     - Total emissions in tonnes CO₂e.
 */

/**
 * @typedef {Object} EmissionsChartProps
 * @property {EmissionsData} emissions - Per-category and total emission values.
 */

/**
 * Horizontal bar chart breaking down emissions by category.
 * Chart options are static and defined at file scope (`BAR_CHART_OPTIONS`)
 * to prevent unnecessary object recreation on each render.
 *
 * @param {EmissionsChartProps} props
 * @returns {JSX.Element}
 */
function EmissionsChart({ emissions }) {
  const categoryColors = EMISSION_CATEGORIES.map((c) => scoreColor(emissions[c]).stroke);

  const data = {
    labels: EMISSION_CATEGORIES.map((c) => CATEGORY_META[c].label),
    datasets: [
      {
        label:           "t CO₂e",
        data:            EMISSION_CATEGORIES.map((c) => +emissions[c].toFixed(3)),
        backgroundColor: categoryColors.map((c) => `${c}${BAR_BG_OPACITY_HEX}`),
        borderColor:     categoryColors,
        borderWidth:     BAR_BORDER_WIDTH,
        borderRadius:    BAR_BORDER_RADIUS,
        borderSkipped:   false,
      },
    ],
  };

  return (
    <div
      style={styles.chartWrap}
      role="img"
      aria-label="Bar chart showing carbon emissions by category"
    >
      <Bar data={data} options={BAR_CHART_OPTIONS} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} InsightsProps
 * @property {EmissionsData} [emissions] - Pre-computed emission values; derived
 *   from `inputs` if omitted.
 * @property {object}        inputs      - Raw lifestyle inputs passed to
 *   `calcEmissions` when `emissions` is not provided.
 */

/**
 * Full carbon-footprint insights panel.
 * Renders a score ring, per-category metric cards, an emissions bar chart,
 * and a list of personalised insights derived from the user's lifestyle data.
 *
 * @param {InsightsProps} props
 * @returns {JSX.Element}
 */
export default function Insights({ emissions, inputs }) {
  const em       = useMemo(() => emissions ?? calcEmissions(inputs), [emissions, inputs]);
  const insights = useMemo(() => getInsights(em, inputs), [em, inputs]);

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerAccent} aria-hidden="true" />
        <div>
          <h2 style={styles.heading}>Your Carbon Footprint</h2>
          <p style={styles.subheading}>Annual estimate based on your lifestyle inputs</p>
        </div>
      </header>

      <section style={styles.scoreRow} aria-label="Score overview">
        <ScoreRing total={em.total} />
        <div style={styles.metricsGrid}>
          {EMISSION_CATEGORIES.map((c) => (
            <MetricCard key={c} category={c} value={em[c]} />
          ))}
        </div>
      </section>

      <section style={styles.section} aria-label="Breakdown by category">
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionDot} aria-hidden="true" />
          Breakdown by Category
        </h3>
        <EmissionsChart emissions={em} />
      </section>

      <section style={styles.section} aria-label="Personalised insights">
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionDot} aria-hidden="true" />
          Personalised Insights
        </h3>
        {insights.length === 0 ? (
          <p style={styles.emptyInsights}>
            No specific insights — your footprint looks balanced!
          </p>
        ) : (
          <div style={styles.insightsList}>
            {insights.map((ins, i) => (
              <InsightCard key={i} insight={ins} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Static styles ─────────────────────────────────────────────────────────────
const styles = Object.freeze({
  root: {
    background: COLOR.surface,
    minHeight:  "100vh",
    padding:    "32px 24px 64px",
    fontFamily: "'Inter', system-ui, sans-serif",
    color:      COLOR.textPrimary,
    maxWidth:   900,
    margin:     "0 auto",
    boxSizing:  "border-box",
  },

  header: {
    display:      "flex",
    alignItems:   "center",
    gap:          16,
    marginBottom: 40,
  },
  headerAccent: {
    width:       5,
    height:      52,
    borderRadius: 99,
    background:  `linear-gradient(180deg, ${COLOR.accent}, ${COLOR.green})`,
    flexShrink:  0,
  },
  heading: {
    margin:        0,
    fontSize:      28,
    fontWeight:    700,
    letterSpacing: "-0.5px",
    color:         COLOR.textPrimary,
  },
  subheading: {
    margin:   "4px 0 0",
    fontSize: 14,
    color:    COLOR.textMuted,
  },

  scoreRow: {
    display:      "flex",
    gap:          32,
    alignItems:   "center",
    flexWrap:     "wrap",
    marginBottom: 40,
  },

  ringWrap: {
    position:  "relative",
    flexShrink: 0,
  },
  ringSvg: {
    transform: "rotate(-90deg)",
  },
  ringCenter: {
    position:       "absolute",
    inset:          0,
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    gap:            2,
  },
  ringTotal: {
    fontSize:      30,
    fontWeight:    800,
    lineHeight:    1,
    letterSpacing: "-1px",
  },
  ringUnit: {
    fontSize:      11,
    color:         COLOR.textMuted,
    letterSpacing: "0.3px",
  },
  ringLabel: {
    marginTop:     4,
    fontSize:      11,
    fontWeight:    600,
    padding:       "2px 10px",
    borderRadius:  99,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },

  metricsGrid: {
    flex:                1,
    display:             "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap:                 12,
    minWidth:            260,
  },
  metricCard: {
    background:    COLOR.card,
    border:        `1px solid ${COLOR.border}`,
    borderRadius:  12,
    padding:       "14px 16px",
    display:       "flex",
    alignItems:    "center",
    gap:           12,
    position:      "relative",
    overflow:      "hidden",
  },
  metricStripe: {
    position:     "absolute",
    left:         0,
    top:          0,
    bottom:       0,
    width:        CARD_STRIPE_WIDTH,
    borderRadius: "12px 0 0 12px",
  },
  metricIcon: {
    fontSize:  22,
    lineHeight: 1,
    flexShrink: 0,
  },
  metricBody: {
    display:       "flex",
    flexDirection: "column",
    gap:           1,
  },
  metricLabel: {
    fontSize:      12,
    color:         COLOR.textMuted,
    fontWeight:    500,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  metricValue: {
    fontSize:   20,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  metricUnit: {
    fontSize:   12,
    fontWeight: 400,
    color:      COLOR.textMuted,
  },

  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    display:       "flex",
    alignItems:    "center",
    gap:           8,
    margin:        "0 0 16px",
    fontSize:      16,
    fontWeight:    600,
    color:         COLOR.textPrimary,
    letterSpacing: "-0.2px",
  },
  sectionDot: {
    display:      "inline-block",
    width:        8,
    height:       8,
    borderRadius: "50%",
    background:   COLOR.accent,
    flexShrink:   0,
  },
  chartWrap: {
    background:   COLOR.card,
    border:       `1px solid ${COLOR.border}`,
    borderRadius: 16,
    padding:      "24px 20px",
    height:       CHART_HEIGHT_PX,
  },

  insightsList: {
    display:       "flex",
    flexDirection: "column",
    gap:           10,
  },
  insightCard: {
    background:   COLOR.card,
    border:       `1px solid ${COLOR.border}`,
    borderLeft:   `${INSIGHT_BORDER_LEFT_WIDTH}px solid transparent`,
    borderRadius: 10,
    padding:      "14px 16px",
    display:      "flex",
    alignItems:   "flex-start",
    gap:          12,
  },
  insightDot: {
    width:        8,
    height:       8,
    borderRadius: "50%",
    flexShrink:   0,
    marginTop:    5,
  },
  insightBody: {
    margin:     0,
    fontSize:   13,
    color:      COLOR.textMuted,
    lineHeight: 1.6,
  },
  emptyInsights: {
    color:      COLOR.textMuted,
    fontSize:   14,
    fontStyle:  "italic",
    margin:     0,
  },
});
