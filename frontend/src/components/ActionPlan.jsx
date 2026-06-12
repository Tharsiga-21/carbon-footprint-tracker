import React, { useMemo, useCallback, useState } from "react";
import { getActionTips } from "../utils/getActionTips";

/**
 * Descriptive color system for action categories.
 * @constant
 */
const ACTION_COLORS = Object.freeze({
  low: "#2ecc71",
  medium: "#f39c12",
  high: "#e74c3c",
});

/**
 * Base UI styling tokens for ActionPlan components.
 * @constant
 */
const ACTION_STYLES = Object.freeze({
  cardBorderRadius: "12px",
  transition: "all 0.25s ease",
  collapsedMaxHeight: "0px",
  expandedMaxHeight: "500px",
});

/**
 * Converts a string into a safe DOM id slug.
 * @param {string} value
 * @returns {string}
 */
function slugify(value) {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

/**
 * Sums total potential emissions savings from tips.
 * @param {{savingTonnes:number}[]} tips
 * @returns {number}
 */
export function sumSavingsTonnes(tips) {
  return tips.reduce((acc, t) => acc + (t?.savingTonnes || 0), 0);
}

/**
 * Inline SVG icon renderer for action tips.
 * @param {{ name: string }} props
 */
export function TipIcon({ name }) {
  const ICON_PATHS = Object.freeze({
    transport:
      "M3 13h18v-2H3v2zm2 4h14v-2H5v2zm2-8h10V7H7v2z",
    food: "M11 2v20M6 6h10",
    energy: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  });

  const path = ICON_PATHS[name] || ICON_PATHS.energy;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="20"
      height="20"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

/**
 * Expandable tip card showing emission reduction suggestion.
 * @param {{ tip: object, index: number }} props
 */
export const TipCard = React.memo(function TipCard({ tip }) {
  const [expanded, setExpanded] = useState(false);

  const descId = useMemo(() => slugify(tip.title), [tip.title]);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: ACTION_STYLES.cardBorderRadius,
        marginBottom: "12px",
        padding: "12px",
        transition: ACTION_STYLES.transition,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <TipIcon name={tip.icon} />
          <strong>{tip.title}</strong>
        </div>

        <button
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={descId}
        >
          {expanded ? "Hide" : "Show"}
        </button>
      </div>

      <div
        id={descId}
        style={{
          maxHeight: expanded
            ? ACTION_STYLES.expandedMaxHeight
            : ACTION_STYLES.collapsedMaxHeight,
          overflow: "hidden",
          opacity: expanded ? 1 : 0,
          transition: ACTION_STYLES.transition,
        }}
      >
        <p>{tip.desc}</p>
        <p>
          <strong>~{tip.savingTonnes.toFixed(1)}t CO₂e/yr</strong>
        </p>
      </div>
    </div>
  );
});

/**
 * ActionPlan component renders emission reduction strategies.
 * @param {{ emissions: object, inputs: object }} props
 */
export default function ActionPlan({ emissions, inputs }) {
  const tips = useMemo(
    () => getActionTips(emissions, inputs),
    [emissions, inputs]
  );

  const totalSavings = useMemo(() => sumSavingsTonnes(tips), [tips]);

  return (
    <section>
      <header style={{ marginBottom: "12px" }}>
        <h2>Action Plan</h2>
        <p>
          {tips.length} tips • Potential savings:{" "}
          <strong>{totalSavings.toFixed(1)} t CO₂e/year</strong>
        </p>
      </header>

      {tips.map((tip) => (
        <TipCard key={tip.title} tip={tip} />
      ))}
    </section>
  );
}
