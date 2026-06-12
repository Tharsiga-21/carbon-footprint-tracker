// src/components/ActionPlan.jsx
import React, { useState, useCallback, memo } from "react";
import { getActionTips } from "../utils/emissions";

// ── Numeric constants ─────────────────────────────────────────────────────────
/** Border radius for card elements in pixels. */
const CARD_BORDER_RADIUS = 14;
/** Border radius for icon wrapper in pixels. */
const ICON_WRAP_BORDER_RADIUS = 10;
/** Width of the step badge column in pixels. */
const STEP_BADGE_WIDTH = 44;
/** Width and height of the icon wrapper in pixels. */
const ICON_WRAP_SIZE = 38;
/** Maximum height of the expanded description panel in pixels. */
const DESC_MAX_HEIGHT = 200;
/** Left padding of the description to align it under the title, in pixels. */
const DESC_PADDING_LEFT = 50;
/** Size of the tip SVG icon in pixels. */
const TIP_ICON_SIZE = 22;
/** Size of the expand/collapse chevron SVG in pixels. */
const CHEVRON_SIZE = 16;
/** Size of the savings arrow SVG in pixels. */
const SAVINGS_ARROW_SIZE = 12;
/** Stroke width for tip category icons. */
const TIP_ICON_STROKE_WIDTH = 1.8;
/** Stroke width for UI chrome icons (chevrons, arrows). */
const CHROME_ICON_STROKE_WIDTH = 2;
/** Stroke width for savings arrow icon. */
const SAVINGS_ARROW_STROKE_WIDTH = 2.5;

// ── Design tokens ─────────────────────────────────────────────────────────────
/**
 * Immutable colour palette shared with Insights.jsx.
 * @type {Readonly<Record<string, string>>}
 */
const ACTION_COLORS = Object.freeze({
  surface:     "#0f172a",
  card:        "#1e293b",
  border:      "#334155",
  textPrimary: "#f1f5f9",
  textMuted:   "#94a3b8",
  accent:      "#34d399",
  accentDim:   "#34d39920",
  green:       "#22c55e",
  greenDim:    "#22c55e18",
});

// ── Icon path data ────────────────────────────────────────────────────────────
/**
 * Immutable map of Tabler-compatible icon names to their SVG path `d` values.
 * Falls back to `ti-leaf` for unknown icon names.
 * @type {Readonly<Record<string, string>>}
 */
const ICON_PATHS = Object.freeze({
  "ti-bus":              "M5 17H3V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10h-2M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M13 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M3 11h16",
  "ti-plug":             "M7 7v4a5 5 0 0 0 10 0V7M10 4v3M14 4v3M5 20l3-3",
  "ti-salad":            "M3 11a9 9 0 1 0 18 0M3 11h18M12 3v8M7.5 7.5l4.5 3.5M16.5 7.5L12 11",
  "ti-plane-off":        "M3 3l18 18M10.5 6.5 12 3l3.5 3.5-2 1M5 14l1.5-4.5 5.5 2L14 14H5zM17 17l-2-2",
  "ti-temperature":      "M10 13.5a4 4 0 1 0 4 0V5a2 2 0 0 0-4 0v8.5zM10 17h4",
  "ti-bolt":             "M13 3L4 14h7l-1 7 9-11h-7l1-7z",
  "ti-rotate-clockwise": "M4.05 11a8 8 0 1 1 .5 4M4 20v-5h5",
  "ti-leaf":             "M5 21C5 21 5 13 12 8c3-2 7-3 10-3-1 4-2 8-5 11-2 2-5 3-7 3M5 21l7-7",
});

/** SVG path for the upward arrow used in savings badges. */
const SAVINGS_ARROW_PATH = "M12 19V5M5 12l7-7 7 7";
/** SVG path for the collapse chevron (pointing up). */
const CHEVRON_UP_PATH = "M18 15l-6-6-6 6";
/** SVG path for the expand chevron (pointing down). */
const CHEVRON_DOWN_PATH = "M6 9l6 6 6-6";

// ── Pure utility functions ────────────────────────────────────────────────────

/**
 * @typedef {Object} ActionTip
 * @property {string} icon          - Icon name key into ICON_PATHS.
 * @property {string} title         - Short tip title (used as React key; must be unique).
 * @property {string} desc          - Full descriptive text shown when expanded.
 * @property {number} savingTonnes  - Estimated annual CO₂e saving in tonnes.
 */

/**
 * Sums the `savingTonnes` values across all action tips.
 *
 * @param {ActionTip[]} tips - Array of action tip objects.
 * @returns {number} Total potential saving in tonnes CO₂e.
 */
function sumSavingsTonnes(tips) {
  return tips.reduce((sum, tip) => sum + tip.savingTonnes, 0);
}

/**
 * Formats a zero-padded two-digit step number string.
 *
 * @param {number} index - Zero-based index of the tip.
 * @returns {string} Two-digit step label, e.g. "01".
 */
function formatStepNumber(index) {
  return String(index + 1).padStart(2, "0");
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TipIconProps
 * @property {string} name - Icon name key into ICON_PATHS.
 */

/**
 * Renders an inline SVG icon for a tip category.
 * Falls back to the leaf icon for unknown names.
 *
 * @param {TipIconProps} props
 * @returns {JSX.Element}
 */
function TipIcon({ name }) {
  const pathData = ICON_PATHS[name] ?? ICON_PATHS["ti-leaf"];
  return (
    <svg
      width={TIP_ICON_SIZE}
      height={TIP_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={ACTION_COLORS.accent}
      strokeWidth={TIP_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={pathData} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TipCardProps
 * @property {ActionTip} tip   - The action tip data to display.
 * @property {number}    index - Zero-based position in the tips list.
 */

/**
 * Expandable card displaying a single action tip.
 * Wrapped in React.memo to prevent re-renders when sibling tip state changes.
 *
 * @param {TipCardProps} props
 * @returns {JSX.Element}
 */
const TipCard = memo(function TipCard({ tip, index }) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const descId      = `tip-desc-${tip.title.replace(/\s+/g, "-").toLowerCase()}`;
  const cardStyle   = expanded
    ? { ...ACTION_STYLES.card, ...ACTION_STYLES.cardOpen }
    : ACTION_STYLES.card;
  const descStyle   = {
    ...ACTION_STYLES.descWrap,
    maxHeight: expanded ? DESC_MAX_HEIGHT : 0,
    opacity:   expanded ? 1 : 0,
  };
  const chevronPath = expanded ? CHEVRON_UP_PATH : CHEVRON_DOWN_PATH;

  return (
    <article style={cardStyle}>
      <div style={ACTION_STYLES.stepBadge} aria-hidden="true">
        {formatStepNumber(index)}
      </div>

      <div style={ACTION_STYLES.cardInner}>
        <div style={ACTION_STYLES.cardHeader}>
          <div style={ACTION_STYLES.iconWrap}>
            <TipIcon name={tip.icon} />
          </div>

          <div style={ACTION_STYLES.titleBlock}>
            <h3 style={ACTION_STYLES.tipTitle}>{tip.title}</h3>
            <span style={ACTION_STYLES.saveBadge}>
              <svg
                width={SAVINGS_ARROW_SIZE}
                height={SAVINGS_ARROW_SIZE}
                viewBox="0 0 24 24"
                fill="none"
                stroke={ACTION_COLORS.green}
                strokeWidth={SAVINGS_ARROW_STROKE_WIDTH}
                strokeLinecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d={SAVINGS_ARROW_PATH} />
              </svg>
              ~{tip.savingTonnes.toFixed(1)}t CO₂e saved/yr
            </span>
          </div>

          <button
            style={ACTION_STYLES.expandBtn}
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls={descId}
            aria-label={expanded ? "Collapse tip" : "Expand tip"}
          >
            <svg
              width={CHEVRON_SIZE}
              height={CHEVRON_SIZE}
              viewBox="0 0 24 24"
              fill="none"
              stroke={ACTION_COLORS.textMuted}
              strokeWidth={CHROME_ICON_STROKE_WIDTH}
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d={chevronPath} />
            </svg>
          </button>
        </div>

        <div id={descId} style={descStyle}>
          <p style={ACTION_STYLES.desc}>{tip.desc}</p>
        </div>
      </div>
    </article>
  );
});

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ActionPlanProps
 * @property {import("../utils/emissions").EmissionsData} emissions - Per-category emission values.
 * @property {object} inputs - Raw lifestyle inputs forwarded to getActionTips.
 */

/**
 * Renders a personalised action plan as a list of expandable tip cards,
 * with a header callout showing total potential CO₂e savings.
 *
 * @param {ActionPlanProps} props
 * @returns {JSX.Element}
 */
export default function ActionPlan({ emissions, inputs }) {
  const tips          = getActionTips(emissions, inputs);
  const totalSavings  = sumSavingsTonnes(tips);
  const stepLabel     = tips.length !== 1 ? "steps" : "step";

  return (
    <div style={ACTION_STYLES.root}>
      <header style={ACTION_STYLES.header}>
        <div style={ACTION_STYLES.headerAccent} aria-hidden="true" />
        <div>
          <h2 style={ACTION_STYLES.heading}>Your Action Plan</h2>
          <p style={ACTION_STYLES.subheading}>
            {tips.length} personalised {stepLabel} based on your footprint
          </p>
        </div>
        <div style={ACTION_STYLES.savingsCallout} aria-label={`Potential saving: ${totalSavings.toFixed(1)} tonnes CO₂e`}>
          <span style={ACTION_STYLES.savingsNum}>~{totalSavings.toFixed(1)}t</span>
          <span style={ACTION_STYLES.savingsLabel}>potential CO₂e savings</span>
        </div>
      </header>

      <div style={ACTION_STYLES.list}>
        {tips.map((tip, index) => (
          <TipCard key={tip.title} tip={tip} index={index} />
        ))}
      </div>

      <p style={ACTION_STYLES.footerNote}>
        Tap any step to read the full detail. Small, consistent changes compound over time.
      </p>
    </div>
  );
}

// ── Static styles ─────────────────────────────────────────────────────────────
/**
 * Immutable static style map for ActionPlan and its sub-components.
 * Only truly dynamic styles (those depending on runtime state or props)
 * are computed inline at render time.
 * @type {Readonly<Record<string, React.CSSProperties>>}
 */
const ACTION_STYLES = Object.freeze({
  root: {
    background: ACTION_COLORS.surface,
    minHeight:  "100vh",
    padding:    "32px 24px 64px",
    fontFamily: "'Inter', system-ui, sans-serif",
    color:      ACTION_COLORS.textPrimary,
    maxWidth:   720,
    margin:     "0 auto",
    boxSizing:  "border-box",
  },

  header: {
    display:      "flex",
    alignItems:   "center",
    gap:          16,
    marginBottom: 36,
    flexWrap:     "wrap",
  },
  headerAccent: {
    width:       5,
    height:      52,
    borderRadius: 99,
    background:  `linear-gradient(180deg, ${ACTION_COLORS.accent}, ${ACTION_COLORS.green})`,
    flexShrink:  0,
  },
  heading: {
    margin:        0,
    fontSize:      28,
    fontWeight:    700,
    letterSpacing: "-0.5px",
  },
  subheading: {
    margin:   "4px 0 0",
    fontSize: 14,
    color:    ACTION_COLORS.textMuted,
  },
  savingsCallout: {
    marginLeft:     "auto",
    background:     ACTION_COLORS.greenDim,
    border:         `1px solid ${ACTION_COLORS.green}44`,
    borderRadius:   12,
    padding:        "10px 18px",
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
  },
  savingsNum: {
    fontSize:      24,
    fontWeight:    800,
    color:         ACTION_COLORS.green,
    lineHeight:    1,
    letterSpacing: "-0.5px",
  },
  savingsLabel: {
    fontSize:      11,
    color:         ACTION_COLORS.textMuted,
    marginTop:     2,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },

  list: {
    display:       "flex",
    flexDirection: "column",
    gap:           10,
  },

  card: {
    background:   ACTION_COLORS.card,
    border:       `1px solid ${ACTION_COLORS.border}`,
    borderRadius: CARD_BORDER_RADIUS,
    display:      "flex",
    overflow:     "hidden",
    transition:   "border-color 0.2s",
  },
  cardOpen: {
    borderColor: `${ACTION_COLORS.accent}66`,
  },
  stepBadge: {
    width:              STEP_BADGE_WIDTH,
    flexShrink:         0,
    background:         ACTION_COLORS.accentDim,
    display:            "flex",
    alignItems:         "center",
    justifyContent:     "center",
    fontSize:           11,
    fontWeight:         700,
    color:              ACTION_COLORS.accent,
    letterSpacing:      "0.5px",
    fontVariantNumeric: "tabular-nums",
    borderRight:        `1px solid ${ACTION_COLORS.border}`,
  },
  cardInner: {
    flex:    1,
    padding: "14px 16px",
    minWidth: 0,
  },
  cardHeader: {
    display:    "flex",
    alignItems: "center",
    gap:        12,
  },
  iconWrap: {
    width:          ICON_WRAP_SIZE,
    height:         ICON_WRAP_SIZE,
    borderRadius:   ICON_WRAP_BORDER_RADIUS,
    background:     ACTION_COLORS.accentDim,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  titleBlock: {
    flex:          1,
    minWidth:      0,
    display:       "flex",
    flexDirection: "column",
    gap:           4,
  },
  tipTitle: {
    margin:     0,
    fontSize:   14,
    fontWeight: 600,
    color:      ACTION_COLORS.textPrimary,
    lineHeight: 1.3,
  },
  saveBadge: {
    display:    "inline-flex",
    alignItems: "center",
    gap:        4,
    fontSize:   12,
    fontWeight: 600,
    color:      ACTION_COLORS.green,
  },
  expandBtn: {
    background:     "none",
    border:         "none",
    cursor:         "pointer",
    padding:        6,
    borderRadius:   8,
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    transition:     "background 0.15s",
  },

  descWrap: {
    overflow:   "hidden",
    transition: "max-height 0.3s ease, opacity 0.25s ease",
  },
  desc: {
    margin:      "12px 0 2px",
    fontSize:    13,
    color:       ACTION_COLORS.textMuted,
    lineHeight:  1.6,
    paddingLeft: DESC_PADDING_LEFT,
  },

  footerNote: {
    marginTop:  28,
    fontSize:   13,
    color:      ACTION_COLORS.textMuted,
    textAlign:  "center",
    fontStyle:  "italic",
  },
});
