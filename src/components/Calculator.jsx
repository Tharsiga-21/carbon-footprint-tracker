import { useMemo } from "react";

// ── emission factors ─────────────────────────────────────────────────────────
const CAR_FACTORS = {        // kg CO2 per km
  petrol:   0.192,
  diesel:   0.171,
  hybrid:   0.105,
  electric: 0.047,
  none:     0,
};
const HEATING_FACTORS = {    // kg CO2 per month (average household baseline)
  gas:       150,
  oil:       190,
  heatpump:   55,
  electric:   80,
  wood:       30,
};
const DIET_FACTORS = {       // kg CO2 per month
  vegan:        50,
  vegetarian:   80,
  flexitarian: 120,
  omnivore:    160,
  highMeat:    230,
};
const SHOPPING_FACTORS = {   // kg CO2 per month
  minimal:   20,
  average:   60,
  frequent: 110,
  heavy:    180,
};
const FLIGHT_KG = 255;       // kg CO2 per return-equivalent flight

// ── calculator fn (annual tonnes) ────────────────────────────────────────────
function calcCO2({ driving, carType, flights, electricity, heating, diet, shopping }) {
  const car    = driving * 52 * (CAR_FACTORS[carType] ?? 0);       // kg/yr
  const air    = flights * FLIGHT_KG;                               // kg/yr
  const elec   = electricity * 12 * 0.233;                         // kg/yr (0.233 kg/kWh global avg)
  const heat   = HEATING_FACTORS[heating] * 12;                    // kg/yr
  const food   = DIET_FACTORS[diet] * 12;                          // kg/yr
  const shop   = SHOPPING_FACTORS[shopping] * 12;                  // kg/yr
  const total  = car + air + elec + heat + food + shop;
  return {
    total: +(total / 1000).toFixed(2),                             // tonnes
    breakdown: {
      Transport:   +((car  / 1000).toFixed(2)),
      Flights:     +((air  / 1000).toFixed(2)),
      Electricity: +((elec / 1000).toFixed(2)),
      Heating:     +((heat / 1000).toFixed(2)),
      Diet:        +((food / 1000).toFixed(2)),
      Shopping:    +((shop / 1000).toFixed(2)),
    },
  };
}

// ── scale: 0 t = great, 8 t = global avg, 16 t = very high ─────────────────
const GLOBAL_AVG = 7.5;
const MAX_SCALE  = 16;

function ratingLabel(t) {
  if (t < 3)   return { label: "Excellent",   color: "#2E7D32" };
  if (t < 6)   return { label: "Below Avg",   color: "#558B2F" };
  if (t < 8.5) return { label: "Near Avg",    color: "#E8A020" };
  if (t < 12)  return { label: "Above Avg",   color: "#E65100" };
  return              { label: "High Impact", color: "#B71C1C" };
}

// ── helpers ──────────────────────────────────────────────────────────────────
function SliderRow({ label, value, setter, min, max, step = 1, unit, icon }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="input-row">
      <div className="input-row-head">
        <span className="input-icon">{icon}</span>
        <span className="input-label">{label}</span>
        <span className="input-value">{value} <span className="input-unit">{unit}</span></span>
      </div>
      <div className="slider-wrap">
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={e => setter(Number(e.target.value))}
          className="slider"
          style={{ "--pct": `${pct}%` }}
        />
        <div className="slider-ticks">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

function SelectRow({ label, value, setter, options, icon }) {
  return (
    <div className="input-row">
      <div className="input-row-head">
        <span className="input-icon">{icon}</span>
        <span className="input-label">{label}</span>
      </div>
      <select
        className="select-field"
        value={value}
        onChange={e => setter(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────
export default function Calculator({ inputs, setters }) {
  const { driving, carType, flights, electricity, heating, diet, shopping } = inputs;
  const { setDriving, setCarType, setFlights, setElectricity, setHeating, setDiet, setShopping } = setters;

  const { total, breakdown } = useMemo(() => calcCO2(inputs), [inputs]);

  const fillPct = Math.min((total / MAX_SCALE) * 100, 100);
  const { label: ratingText, color: ratingColor } = ratingLabel(total);
  const avgDiff = (total - GLOBAL_AVG).toFixed(1);
  const betterThanAvg = total < GLOBAL_AVG;

  return (
    <>
      <style>{CSS}</style>
      <div className="calc-layout">

        {/* ── inputs column ── */}
        <section className="inputs-card card">
          <div className="section-head">
            <h2 className="section-title">Your Lifestyle</h2>
            <p className="section-sub">Adjust each category to match your habits</p>
          </div>

          <div className="input-group">
            <div className="group-label">🚗 Transport</div>
            <SliderRow
              label="Weekly driving" icon="🛣️"
              value={driving} setter={setDriving}
              min={0} max={200} unit="km/wk"
            />
            <SelectRow
              label="Car type" icon="⛽" value={carType} setter={setCarType}
              options={[
                { value: "petrol",   label: "Petrol / Gasoline" },
                { value: "diesel",   label: "Diesel" },
                { value: "hybrid",   label: "Hybrid" },
                { value: "electric", label: "Electric (EV)" },
                { value: "none",     label: "No car" },
              ]}
            />
            <SliderRow
              label="Flights per year" icon="✈️"
              value={flights} setter={setFlights}
              min={0} max={20} unit="flights"
            />
          </div>

          <div className="input-group">
            <div className="group-label">🏠 Home Energy</div>
            <SliderRow
              label="Monthly electricity" icon="💡"
              value={electricity} setter={setElectricity}
              min={0} max={1000} step={10} unit="kWh/mo"
            />
            <SelectRow
              label="Heating type" icon="🔥" value={heating} setter={setHeating}
              options={[
                { value: "gas",      label: "Natural gas" },
                { value: "oil",      label: "Heating oil" },
                { value: "heatpump", label: "Heat pump" },
                { value: "electric", label: "Electric heater" },
                { value: "wood",     label: "Wood / biomass" },
              ]}
            />
          </div>

          <div className="input-group">
            <div className="group-label">🍽️ Lifestyle</div>
            <SelectRow
              label="Diet" icon="🥗" value={diet} setter={setDiet}
              options={[
                { value: "vegan",        label: "Vegan" },
                { value: "vegetarian",   label: "Vegetarian" },
                { value: "flexitarian",  label: "Flexitarian" },
                { value: "omnivore",     label: "Omnivore" },
                { value: "highMeat",     label: "High meat" },
              ]}
            />
            <SelectRow
              label="Shopping habits" icon="🛍️" value={shopping} setter={setShopping}
              options={[
                { value: "minimal",  label: "Minimal (secondhand, repairs)" },
                { value: "average",  label: "Average consumer" },
                { value: "frequent", label: "Frequent buyer" },
                { value: "heavy",    label: "Heavy consumer / fast fashion" },
              ]}
            />
          </div>
        </section>

        {/* ── live preview column ── */}
        <aside className="preview-col">

          {/* emission meter */}
          <div className="meter-card card">
            <div className="meter-title">Annual Carbon Footprint</div>

            <div className="meter-wrap">
              <div className="meter-tube">
                <div
                  className="meter-fill"
                  style={{
                    height: `${fillPct}%`,
                    background: ratingColor,
                  }}
                />
                <div className="meter-avg-line" style={{ bottom: `${(GLOBAL_AVG / MAX_SCALE) * 100}%` }}>
                  <span className="avg-tag">Global avg</span>
                </div>
              </div>
              <div className="meter-labels">
                <span>16t</span>
                <span>8t</span>
                <span>0t</span>
              </div>
            </div>

            <div className="meter-readout">
              <div className="total-num" style={{ color: ratingColor }}>
                {total}<span className="total-unit">t CO₂e</span>
              </div>
              <div className="rating-pill" style={{ background: ratingColor + "22", color: ratingColor }}>
                {ratingText}
              </div>
              <p className="avg-diff">
                {betterThanAvg
                  ? `${Math.abs(avgDiff)}t below global average`
                  : `${avgDiff}t above global average`}
              </p>
            </div>
          </div>

          {/* breakdown bars */}
          <div className="breakdown-card card">
            <div className="breakdown-title">Breakdown</div>
            {Object.entries(breakdown).map(([cat, val]) => {
              const barPct = total > 0 ? (val / total) * 100 : 0;
              return (
                <div key={cat} className="bar-row">
                  <div className="bar-meta">
                    <span className="bar-cat">{cat}</span>
                    <span className="bar-val">{val}t</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

        </aside>
      </div>
    </>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
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
.breakdown-card {}
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
