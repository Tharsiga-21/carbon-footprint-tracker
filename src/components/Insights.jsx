// src/components/Insights.jsx
import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { calcEmissions, getInsights } from "../utils/emissions";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ─── Design tokens ────────────────────────────────────────────────
const TOKEN = {
  green:  { ring: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "#22c55e", label: "Low impact" },
  amber:  { ring: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "#f59e0b", label: "Moderate"   },
  red:    { ring: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "#ef4444", label: "High impact" },
};

const CATEGORY_META = {
  transport: { label: "Transport",  icon: "✈️",  unit: "tCO₂e" },
  energy:    { label: "Energy",     icon: "⚡",  unit: "tCO₂e" },
  diet:      { label: "Diet",       icon: "🥗",  unit: "tCO₂e" },
  shopping:  { label: "Shopping",   icon: "🛍️", unit: "tCO₂e" },
};

// ─── Helpers ───────────────────────────────────────────────────────
function scoreLevel(total) {
  if (total <= 4)  return "green";
  if (total <= 10) return "amber";
  return "red";
}

// ─── Score Ring ────────────────────────────────────────────────────
function ScoreRing({ total }) {
  const level   = scoreLevel(total);
  const color   = TOKEN[level].ring;
  const caption = TOKEN[level].label;

  const SIZE   = 180;
  const STROKE = 14;
  const R      = (SIZE - STROKE) / 2;
  const CIRC   = 2 * Math.PI * R;

  // cap at 20 t for visual fill
  const fillPct = Math.min(total / 20, 1);
  const dash    = fillPct * CIRC;

  return (
    <div style={styles.ringWrap}>
      <svg width={SIZE} height={SIZE} style={{ display: "block" }}>
        {/* track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none" stroke="#e5e7eb" strokeWidth={STROKE}
        />
        {/* fill */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)" }}
        />
        {/* total */}
        <text
          x={SIZE / 2} y={SIZE / 2 - 10}
          textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 28, fontWeight: 700, fill: color, fontFamily: "inherit" }}
        >
          {total.toFixed(1)}
        </text>
        <text
          x={SIZE / 2} y={SIZE / 2 + 16}
          textAnchor="middle"
          style={{ fontSize: 12, fill: "#6b7280", fontFamily: "inherit" }}
        >
          tonnes CO₂e/yr
        </text>
      </svg>
      <span style={{ ...styles.ringBadge, background: TOKEN[level].bg, color }}>
        {caption}
      </span>
    </div>
  );
}

// ─── Metric Card ───────────────────────────────────────────────────
function MetricCard({ category, value }) {
  const meta  = CATEGORY_META[category];
  const level = scoreLevel(value * 4); // per-category rough heuristic
  const col   = TOKEN[level];

  return (
    <div style={{ ...styles.metricCard, borderTop: `3px solid ${col.ring}` }}>
      <span style={styles.metricIcon}>{meta.icon}</span>
      <div>
        <div style={styles.metricLabel}>{meta.label}</div>
        <div style={{ ...styles.metricValue, color: col.ring }}>
          {value.toFixed(2)}
          <span style={styles.metricUnit}> {meta.unit}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Insight Card ──────────────────────────────────────────────────
function InsightCard({ insight }) {
  const level = insight.level ?? "amber";
  const col   = TOKEN[level] ?? TOKEN.amber;

  return (
    <div style={{ ...styles.insightCard, borderLeft: `4px solid ${col.border}`, background: col.bg }}>
      <div style={{ ...styles.insightTitle, color: col.border }}>{insight.title}</div>
      <div style={styles.insightBody}>{insight.message}</div>
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────
function EmissionsChart({ emissions }) {
  const labels = ["Transport", "Energy", "Diet", "Shopping"];
  const values = [
    emissions.transport,
    emissions.energy,
    emissions.diet,
    emissions.shopping,
  ];

  const backgroundColors = values.map(v => {
    const l = scoreLevel(v * 4);
    return TOKEN[l].ring + "cc"; // slight transparency
  });

  const data = {
    labels,
    datasets: [
      {
        label: "tCO₂e / year",
        data: values,
        backgroundColor: backgroundColors,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.parsed.y.toFixed(2)} tCO₂e`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6b7280", font: { size: 13 } },
      },
      y: {
        grid: { color: "#f3f4f6" },
        ticks: { color: "#6b7280", font: { size: 12 } },
        title: {
          display: true,
          text: "tonnes CO₂e / year",
          color: "#9ca3af",
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

// ─── Main component ────────────────────────────────────────────────
export default function Insights({ emissions, inputs }) {
  // Allow parent to pass pre-calculated emissions, or recalc from inputs
  const em = useMemo(
    () => emissions ?? (inputs ? calcEmissions(inputs) : null),
    [emissions, inputs]
  );

  const insights = useMemo(
    () => (em ? getInsights(em, inputs) : []),
    [em, inputs]
  );

  if (!em) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>🌍</span>
        <p>Fill in your details to see your footprint insights.</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* ── Header row ── */}
      <div style={styles.headerRow}>
        <div style={styles.headerText}>
          <h2 style={styles.heading}>Your Carbon Footprint</h2>
          <p style={styles.subheading}>
            Annual estimate based on your lifestyle choices.
            Global average is ~4.7 tCO₂e/year.
          </p>
        </div>
        <ScoreRing total={em.total} />
      </div>

      {/* ── Metric cards ── */}
      <div style={styles.metricsGrid}>
        {["transport", "energy", "diet", "shopping"].map(cat => (
          <MetricCard key={cat} category={cat} value={em[cat]} />
        ))}
      </div>

      {/* ── Bar chart ── */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Breakdown by Category</h3>
        <EmissionsChart emissions={em} />
      </section>

      {/* ── Insight cards ── */}
      {insights.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Personalised Insights</h3>
          <div style={styles.insightsGrid}>
            {insights.map((ins, i) => (
              <InsightCard key={i} insight={ins} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = {
  root: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#111827",
    maxWidth: 860,
    margin: "0 auto",
    padding: "2rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },

  // Header
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1.5rem",
    flexWrap: "wrap",
  },
  headerText: { flex: 1, minWidth: 220 },
  heading: {
    margin: 0,
    fontSize: "1.75rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  subheading: {
    margin: "0.4rem 0 0",
    fontSize: "0.9rem",
    color: "#6b7280",
    lineHeight: 1.5,
  },

  // Ring
  ringWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  ringBadge: {
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.2rem 0.75rem",
    borderRadius: 999,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },

  // Metric cards
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "1rem",
  },
  metricCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "1rem 1.25rem",
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  metricIcon: { fontSize: "1.6rem", lineHeight: 1 },
  metricLabel: { fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.2rem", fontWeight: 500 },
  metricValue: { fontSize: "1.25rem", fontWeight: 700 },
  metricUnit: { fontSize: "0.7rem", fontWeight: 400, color: "#9ca3af" },

  // Sections
  section: {},
  sectionTitle: {
    margin: "0 0 0.9rem",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#374151",
    letterSpacing: "-0.01em",
  },

  // Chart
  chartWrap: {
    background: "#fff",
    borderRadius: 12,
    padding: "1.25rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },

  // Insight cards
  insightsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "0.85rem",
  },
  insightCard: {
    borderRadius: "0 8px 8px 0",
    padding: "0.85rem 1rem",
  },
  insightTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    marginBottom: "0.3rem",
    letterSpacing: "0.01em",
  },
  insightBody: {
    fontSize: "0.82rem",
    color: "#4b5563",
    lineHeight: 1.5,
  },

  // Empty state
  empty: {
    textAlign: "center",
    padding: "3rem 1rem",
    color: "#9ca3af",
  },
  emptyIcon: { fontSize: "2.5rem", display: "block", marginBottom: "0.75rem" },
};
