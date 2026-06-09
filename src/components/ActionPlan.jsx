// src/components/ActionPlan.jsx
import React, { useState } from "react";
import { getTips } from "../utils/emissions";

// ─── Design tokens (match Insights.jsx palette) ───────────────────────────────
const C = {
  surface:     "#0f172a",
  card:        "#1e293b",
  border:      "#334155",
  textPrimary: "#f1f5f9",
  textMuted:   "#94a3b8",
  accent:      "#34d399",
  accentDim:   "#34d39920",
  green:       "#22c55e",
  greenDim:    "#22c55e18",
  amber:       "#f59e0b",
  amberDim:    "#f59e0b18",
};

// Map tabler icon class names → inline SVG paths so we have no external dep
const ICON_PATHS = {
  "ti-bus":              "M5 17H3V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10h-2M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M13 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M3 11h16",
  "ti-plug":             "M7 7v4a5 5 0 0 0 10 0V7M10 4v3M14 4v3M5 20l3-3",
  "ti-salad":            "M3 11a9 9 0 1 0 18 0M3 11h18M12 3v8M7.5 7.5l4.5 3.5M16.5 7.5L12 11",
  "ti-plane-off":        "M3 3l18 18M10.5 6.5 12 3l3.5 3.5-2 1M5 14l1.5-4.5 5.5 2L14 14H5zM17 17l-2-2",
  "ti-temperature":      "M10 13.5a4 4 0 1 0 4 0V5a2 2 0 0 0-4 0v8.5zM10 17h4",
  "ti-bolt":             "M13 3L4 14h7l-1 7 9-11h-7l1-7z",
  "ti-rotate-clockwise": "M4.05 11a8 8 0 1 1 .5 4M4 20v-5h5",
  "ti-leaf":             "M5 21C5 21 5 13 12 8c3-2 7-3 10-3-1 4-2 8-5 11-2 2-5 3-7 3M5 21l7-7",
};

function TipIcon({ name }) {
  const d = ICON_PATHS[name] ?? ICON_PATHS["ti-leaf"];
  return (
    <svg
      width={22} height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.accent}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function TipCard({ tip, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      style={{
        ...S.card,
        ...(expanded ? S.cardOpen : {}),
      }}
    >
      {/* step number ribbon */}
      <div style={S.stepBadge}>{String(index + 1).padStart(2, "0")}</div>

      <div style={S.cardInner}>
        {/* icon + title row */}
        <div style={S.cardHeader}>
          <div style={S.iconWrap}>
            <TipIcon name={tip.icon} />
          </div>
          <div style={S.titleBlock}>
            <h3 style={S.tipTitle}>{tip.title}</h3>
            <span style={S.saveBadge}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                stroke={C.green} strokeWidth={2.5} strokeLinecap="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              {tip.save}
            </span>
          </div>
          <button
            style={S.expandBtn}
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse tip" : "Expand tip"}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke={C.textMuted} strokeWidth={2} strokeLinecap="round">
              <path d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
            </svg>
          </button>
        </div>

        {/* expandable description */}
        <div style={{
          ...S.descWrap,
          maxHeight: expanded ? 200 : 0,
          opacity: expanded ? 1 : 0,
        }}>
          <p style={S.desc}>{tip.desc}</p>
        </div>
      </div>
    </article>
  );
}

export default function ActionPlan({ emissions, inputs }) {
  const tips = getTips(emissions, inputs);
  const totalSavings = tips.reduce((sum, t) => {
    const n = parseFloat(t.save.match(/[\d.]+/)?.[0] ?? 0);
    return sum + n;
  }, 0);

  return (
    <div style={S.root}>
      {/* ── Header ── */}
      <header style={S.header}>
        <div style={S.headerAccent} />
        <div>
          <h2 style={S.heading}>Your Action Plan</h2>
          <p style={S.subheading}>
            {tips.length} personalised step{tips.length !== 1 ? "s" : ""} based on your footprint
          </p>
        </div>
        {/* potential savings callout */}
        <div style={S.savingsCallout}>
          <span style={S.savingsNum}>~{totalSavings.toFixed(1)}t</span>
          <span style={S.savingsLabel}>potential CO₂e savings</span>
        </div>
      </header>

      {/* ── Tips list ── */}
      <div style={S.list}>
        {tips.map((tip, i) => (
          <TipCard key={i} tip={tip} index={i} />
        ))}
      </div>

      {/* ── Footer nudge ── */}
      <p style={S.footerNote}>
        Tap any step to read the full detail. Small, consistent changes compound over time.
      </p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root: {
    background: C.surface,
    minHeight: "100vh",
    padding: "32px 24px 64px",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: C.textPrimary,
    maxWidth: 720,
    margin: "0 auto",
    boxSizing: "border-box",
  },

  // Header
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 36,
    flexWrap: "wrap",
  },
  headerAccent: {
    width: 5,
    height: 52,
    borderRadius: 99,
    background: `linear-gradient(180deg, ${C.accent}, ${C.green})`,
    flexShrink: 0,
  },
  heading: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },
  subheading: {
    margin: "4px 0 0",
    fontSize: 14,
    color: C.textMuted,
  },
  savingsCallout: {
    marginLeft: "auto",
    background: C.greenDim,
    border: `1px solid ${C.green}44`,
    borderRadius: 12,
    padding: "10px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  savingsNum: {
    fontSize: 24,
    fontWeight: 800,
    color: C.green,
    lineHeight: 1,
    letterSpacing: "-0.5px",
  },
  savingsLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },

  // List
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  // Card
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    display: "flex",
    overflow: "hidden",
    transition: "border-color 0.2s",
  },
  cardOpen: {
    borderColor: C.accent + "66",
  },
  stepBadge: {
    width: 44,
    flexShrink: 0,
    background: C.accentDim,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: C.accent,
    letterSpacing: "0.5px",
    fontVariantNumeric: "tabular-nums",
    borderRight: `1px solid ${C.border}`,
  },
  cardInner: {
    flex: 1,
    padding: "14px 16px",
    minWidth: 0,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: C.accentDim,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  tipTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: C.textPrimary,
    lineHeight: 1.3,
  },
  saveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: C.green,
  },
  expandBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 8,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
  },

  // Description
  descWrap: {
    overflow: "hidden",
    transition: "max-height 0.3s ease, opacity 0.25s ease",
  },
  desc: {
    margin: "12px 0 2px",
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 1.6,
    paddingLeft: 50, // align under title, past icon
  },

  // Footer
  footerNote: {
    marginTop: 28,
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
};
