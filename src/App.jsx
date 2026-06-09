import { useState } from "react";
import Calculator from "./components/Calculator";

// ── placeholder panels ──────────────────────────────────────────────────────
const Insights   = () => <PlaceholderPanel title="Insights"     icon="📊" desc="Visual breakdowns of your carbon footprint by category." />;
const ActionPlan = () => <PlaceholderPanel title="Action Plan"  icon="🌱" desc="Personalised steps to cut your emissions." />;
const AIAdvisor  = () => <PlaceholderPanel title="AI Advisor"   icon="🤖" desc="Chat with an AI coach about your carbon journey." />;

function PlaceholderPanel({ title, icon, desc }) {
  return (
    <div className="placeholder-panel">
      <span className="placeholder-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{desc}</p>
      <span className="placeholder-badge">Coming in next part</span>
    </div>
  );
}

// ── tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "calculator", label: "Calculator", icon: "⚡" },
  { id: "insights",   label: "Insights",   icon: "📊" },
  { id: "action",     label: "Action Plan",icon: "🌱" },
  { id: "advisor",    label: "AI Advisor", icon: "🤖" },
];

// ── default state ────────────────────────────────────────────────────────────
const DEFAULT_INPUTS = {
  driving:     80,          // km per week
  carType:     "petrol",    // petrol | diesel | hybrid | electric | none
  flights:     2,           // flights per year
  electricity: 300,         // kWh per month
  heating:     "gas",       // gas | oil | heatpump | electric | wood
  diet:        "omnivore",  // vegan | vegetarian | flexitarian | omnivore | highMeat
  shopping:    "average",   // minimal | average | frequent | heavy
};

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("calculator");

  // global inputs
  const [driving,     setDriving]     = useState(DEFAULT_INPUTS.driving);
  const [carType,     setCarType]     = useState(DEFAULT_INPUTS.carType);
  const [flights,     setFlights]     = useState(DEFAULT_INPUTS.flights);
  const [electricity, setElectricity] = useState(DEFAULT_INPUTS.electricity);
  const [heating,     setHeating]     = useState(DEFAULT_INPUTS.heating);
  const [diet,        setDiet]        = useState(DEFAULT_INPUTS.diet);
  const [shopping,    setShopping]    = useState(DEFAULT_INPUTS.shopping);

  const inputs   = { driving, carType, flights, electricity, heating, diet, shopping };
  const setters  = { setDriving, setCarType, setFlights, setElectricity, setHeating, setDiet, setShopping };

  function renderPanel() {
    switch (activeTab) {
      case "calculator": return <Calculator inputs={inputs} setters={setters} />;
      case "insights":   return <Insights />;
      case "action":     return <ActionPlan />;
      case "advisor":    return <AIAdvisor />;
      default:           return null;
    }
  }

  return (
    <>
      {/* ── inject styles ── */}
      <style>{CSS}</style>

      <div className="app-shell">
        {/* header */}
        <header className="app-header">
          <div className="header-inner">
            <div className="brand">
              <span className="brand-leaf">🌍</span>
              <div>
                <div className="brand-name">CarbonTrace</div>
                <div className="brand-sub">Personal Footprint Tracker</div>
              </div>
            </div>
          </div>
        </header>

        {/* tab bar */}
        <nav className="tab-bar">
          <div className="tab-inner">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? "tab-active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* panel */}
        <main className="panel-area">
          {renderPanel()}
        </main>

        <footer className="app-footer">
          Estimates based on average emission factors · Not financial or policy advice
        </footer>
      </div>
    </>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --forest:   #0D1F0F;
  --leaf:     #4CAF50;
  --leaf-dim: #2E7D32;
  --atmo:     #B8E0BB;
  --atmo-lt:  #E8F5E9;
  --amber:    #E8A020;
  --bg:       #F5F7F2;
  --surface:  #FFFFFF;
  --text:     #1A2B1C;
  --muted:    #6B7F6D;
  --border:   #D4E0D5;
  --radius:   14px;
  --ff-head:  'Space Grotesk', sans-serif;
  --ff-body:  'Inter', sans-serif;
}

body {
  font-family: var(--ff-body);
  background: var(--bg);
  color: var(--text);
  min-height: 100dvh;
}

/* shell */
.app-shell { display: flex; flex-direction: column; min-height: 100dvh; }

/* header */
.app-header {
  background: var(--forest);
  padding: 0 1.5rem;
  position: sticky; top: 0; z-index: 10;
}
.header-inner {
  max-width: 900px; margin: 0 auto;
  height: 64px; display: flex; align-items: center;
}
.brand { display: flex; align-items: center; gap: 12px; }
.brand-leaf { font-size: 1.75rem; }
.brand-name {
  font-family: var(--ff-head); font-size: 1.15rem;
  font-weight: 700; color: var(--atmo); letter-spacing: -0.01em;
}
.brand-sub { font-size: 0.7rem; color: #5A7A5C; margin-top: 1px; }

/* tab bar */
.tab-bar {
  background: var(--forest);
  border-bottom: 1px solid rgba(184,224,187,.15);
  padding: 0 1.5rem .75rem;
}
.tab-inner {
  max-width: 900px; margin: 0 auto;
  display: flex; gap: 6px;
  background: rgba(255,255,255,.07);
  border-radius: 50px; padding: 4px;
  width: fit-content;
}
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: none; cursor: pointer;
  padding: 7px 16px; border-radius: 50px;
  font-family: var(--ff-head); font-size: 0.82rem; font-weight: 500;
  color: #7A9E7C; transition: all .2s;
}
.tab-btn:hover { color: var(--atmo); background: rgba(255,255,255,.07); }
.tab-active {
  background: var(--leaf) !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(76,175,80,.4);
}
.tab-icon { font-size: 0.9rem; }

/* panel */
.panel-area {
  flex: 1; padding: 2rem 1.5rem;
  max-width: 900px; margin: 0 auto; width: 100%;
}

/* footer */
.app-footer {
  text-align: center; font-size: 0.7rem;
  color: var(--muted); padding: 1.25rem;
  border-top: 1px solid var(--border);
}

/* placeholder */
.placeholder-panel {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; padding: 5rem 2rem; text-align: center;
}
.placeholder-icon { font-size: 3rem; }
.placeholder-panel h2 {
  font-family: var(--ff-head); font-size: 1.5rem;
  font-weight: 700; color: var(--forest);
}
.placeholder-panel p { color: var(--muted); max-width: 320px; }
.placeholder-badge {
  font-family: var(--ff-head); font-size: 0.72rem; font-weight: 600;
  letter-spacing: .06em; text-transform: uppercase;
  background: var(--atmo-lt); color: var(--leaf-dim);
  padding: 5px 14px; border-radius: 50px;
  border: 1px solid var(--border);
}

@media (max-width: 600px) {
  .tab-label { display: none; }
  .tab-btn { padding: 8px 12px; }
  .panel-area { padding: 1.25rem 1rem; }
}
`;
