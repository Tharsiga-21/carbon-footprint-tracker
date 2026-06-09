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

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLOR = {
  green:       "#22c55e",
  greenMuted:  "#dcfce7",
  amber:       "#f59e0b",
  amberMuted:  "#fef3c7",
  red:         "#ef4444",
  redMuted:    "#fee2e2",
  surface:     "#0f172a",   // deep slate — the "earth at night" base
  card:        "#1e293b",
  cardHover:   "#263248",
  border:      "#334155",
  textPrimary: "#f1f5f9",
  textMuted:   "#94a3b8",
  accent:      "#34d399",   // signature: bioluminescent teal — life persisting
};

const CATEGORY_META = {
  transport: { label: "Transport",  icon: "🚗", unit: "t CO₂e" },
  energy:    { label: "Energy",     icon: "⚡", unit: "t CO₂e" },
  diet:      { label: "Diet",       icon: "🌿", unit: "t CO₂e" },
  shopping:  { label: "Shopping",   icon: "🛍", unit: "t CO₂e" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(total) {
  if (total <= 3)  return { stroke: COLOR.green, label: "Low",    bg: COLOR.greenMuted, text: "#166534" };
  if (total <= 7)  return { stroke: COLOR.amber, label: "Medium", bg: COLOR.amberMuted, text: "#92400e" };
  return             { stroke: COLOR.red,   label: "High",   bg: COLOR.redMuted,   text: "#991b1b" };
}

function insightBorderColor(level) {
  if (level === "low")  return COLOR.green;
  if (level === "med")  return COLOR.amber;
  return COLOR.red; // "high"
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ total }) {
  const SIZE = 200;
  const STROKE = 14;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const MAX_T = 12; // "danger" ceiling for visual scale
  const pct = Math.min(total / MAX_T, 1);
  const dash = pct * CIRC;
  const { stroke, label } = scoreColor(total);

  return (
    <div style={styles.ringWrap}>
      <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
        {/* track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={COLOR.border}
          strokeWidth={STROKE}
        />
        {/* progress */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      {/* centre text — counter-rotate so it stays upright */}
      <div style={styles.ringCenter}>
        <span style={{ ...styles.ringTotal, color: stroke }}>
          {total.toFixed(2)}
        </span>
        <span style={styles.ringUnit}>t CO₂e / yr</span>
        <span style={{ ...styles.ringLabel, background: stroke + "22", color: stroke }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ category, value }) {
  const meta = CATEGORY_META[category];
  const { stroke } = scoreColor(value);
  return (
    <div style={styles.metricCard}>
      <span style={styles.metricIcon}>{meta.icon}</span>
      <div style={styles.metricBody}>
        <span style={styles.metricLabel}>{meta.label}</span>
        <span style={{ ...styles.metricValue, color: stroke }}>
          {value.toFixed(2)}
          <span style={styles.metricUnit}> {meta.unit}</span>
        </span>
      </div>
      {/* subtle left-accent stripe */}
      <div style={{ ...styles.metricStripe, background: stroke }} />
    </div>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────
function InsightCard({ insight }) {
  const borderColor = insightBorderColor(insight.level);
  return (
    <div style={{ ...styles.insightCard, borderLeftColor: borderColor }}>
      <div style={{ ...styles.insightDot, background: borderColor }} />
      <div>
        <p
          className="insight-body"
          style={styles.insightBody}
          dangerouslySetInnerHTML={{ __html: insight.message }}
        />
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function EmissionsChart({ emissions }) {
  const cats = ["transport", "energy", "diet", "shopping"];
  const colors = cats.map((c) => scoreColor(emissions[c]).stroke);

  const data = {
    labels: cats.map((c) => CATEGORY_META[c].label),
    datasets: [
      {
        label: "t CO₂e",
        data: cats.map((c) => +emissions[c].toFixed(3)),
        backgroundColor: colors.map((c) => c + "cc"),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: COLOR.card,
        titleColor: COLOR.textPrimary,
        bodyColor: COLOR.textMuted,
        borderColor: COLOR.border,
        borderWidth: 1,
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y} t CO₂e`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: COLOR.textMuted, font: { size: 13 } },
        grid: { display: false },
        border: { color: COLOR.border },
      },
      y: {
        ticks: { color: COLOR.textMuted, font: { size: 12 } },
        grid: { color: COLOR.border + "55" },
        border: { color: COLOR.border },
        title: {
          display: true,
          text: "Tonnes CO₂e",
          color: COLOR.textMuted,
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div style={styles.chartWrap}>
      <Bar data={data} options={options} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const INSIGHT_STRONG_STYLE = `
  .insight-body strong {
    color: #f1f5f9;
    font-weight: 600;
  }
`;

export default function Insights({ emissions, inputs }) {
  // Re-derive if emissions not passed (defensive)
  const em = useMemo(
    () => emissions ?? calcEmissions(inputs),
    [emissions, inputs]
  );
  const insights = useMemo(() => getInsights(em, inputs), [em, inputs]);
  const cats = ["transport", "energy", "diet", "shopping"];

  return (
    <div style={styles.root}>
      <style>{INSIGHT_STRONG_STYLE}</style>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerAccent} />
        <div>
          <h2 style={styles.heading}>Your Carbon Footprint</h2>
          <p style={styles.subheading}>
            Annual estimate based on your lifestyle inputs
          </p>
        </div>
      </header>

      {/* ── Score + Metrics row ── */}
      <section style={styles.scoreRow}>
        <ScoreRing total={em.total} />
        <div style={styles.metricsGrid}>
          {cats.map((c) => (
            <MetricCard key={c} category={c} value={em[c]} />
          ))}
        </div>
      </section>

      {/* ── Bar chart ── */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionDot} />
          Breakdown by Category
        </h3>
        <EmissionsChart emissions={em} />
      </section>

      {/* ── Insights ── */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionDot} />
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    background: COLOR.surface,
    minHeight: "100vh",
    padding: "32px 24px 64px",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: COLOR.textPrimary,
    maxWidth: 900,
    margin: "0 auto",
    boxSizing: "border-box",
  },

  // Header
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 40,
  },
  headerAccent: {
    width: 5,
    height: 52,
    borderRadius: 99,
    background: `linear-gradient(180deg, ${COLOR.accent}, ${COLOR.green})`,
    flexShrink: 0,
  },
  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: COLOR.textPrimary,
  },
  subheading: {
    margin: "4px 0 0",
    fontSize: 14,
    color: COLOR.textMuted,
  },

  // Score row
  scoreRow: {
    display: "flex",
    gap: 32,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 40,
  },

  // Ring
  ringWrap: {
    position: "relative",
    flexShrink: 0,
  },
  ringCenter: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  ringTotal: {
    fontSize: 30,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-1px",
  },
  ringUnit: {
    fontSize: 11,
    color: COLOR.textMuted,
    letterSpacing: "0.3px",
  },
  ringLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 10px",
    borderRadius: 99,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },

  // Metrics
  metricsGrid: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
    minWidth: 260,
  },
  metricCard: {
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  metricStripe: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: 3,
    borderRadius: "12px 0 0 12px",
  },
  metricIcon: {
    fontSize: 22,
    lineHeight: 1,
    flexShrink: 0,
  },
  metricBody: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: COLOR.textMuted,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 400,
    color: COLOR.textMuted,
  },

  // Chart
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 16px",
    fontSize: 16,
    fontWeight: 600,
    color: COLOR.textPrimary,
    letterSpacing: "-0.2px",
  },
  sectionDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: COLOR.accent,
    flexShrink: 0,
  },
  chartWrap: {
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 16,
    padding: "24px 20px",
    height: 260,
  },

  // Insights
  insightsList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  insightCard: {
    background: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderLeft: `4px solid transparent`,
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 5,
  },
  insightBody: {
    margin: 0,
    fontSize: 13,
    color: COLOR.textMuted,
    lineHeight: 1.6,
    // <strong> inside message acts as the title — make it pop
  },
  // injected via dangerouslySetInnerHTML — target strong tags globally in the card
  insightTitle: {
    // kept for reference; no longer rendered as a separate element
  },
  emptyInsights: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    margin: 0,
  },
};
