/**
 * EcoTrace App Shell — Carbon footprint tracker UI
 */

import React, { useCallback, useMemo, useState } from 'react';
import Calculator from './components/Calculator';
import Insights from './components/Insights';
import ActionPlan from './components/ActionPlan';
import AiAdvisor from './components/AiAdvisor';
import { useEmissions } from './hooks/useEmissions';

const DEFAULT_INPUTS = Object.freeze({
  carType: 'petrol',
  distanceKm: 0,
  flights: 0,
  heatingType: 'gas',
  diet: 'omnivore',
  shopping: 'average',
  electricityMonthlyKwh: 0,
});

const TABS = Object.freeze([
  { id: 'calculator', label: 'Calculator' },
  { id: 'insights', label: 'Insights' },
  { id: 'action', label: 'Action Plan' },
  { id: 'ai', label: 'AI Advisor' },
]);

export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [activeTab, setActiveTab] = useState('calculator');

  const setInput = useCallback((key, value) => {
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const emissions = useMemo(() => {
    return inputs;
  }, [inputs]);

  const { emissions: results, rating, insights, tips } = useEmissions(inputs);

  const TAB_PANELS = {
    calculator: <Calculator inputs={inputs} setInput={setInput} />,
    insights: <Insights emissions={results} inputs={inputs} />,
    action: <ActionPlan emissions={results} inputs={inputs} />,
    ai: <AiAdvisor emissions={results} inputs={inputs} />,
  };

  return (
    <>
      <header style={styles.header}>
        <h1>EcoTrace</h1>
        <p>Track your carbon footprint</p>
      </header>

      <nav aria-label="Main navigation" style={styles.nav}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main role="tabpanel" style={styles.main}>
        {TAB_PANELS[activeTab]}
      </main>

      <footer style={styles.footer}>
        <small>EcoTrace • Sustainable living tracker</small>
      </footer>
    </>
  );
}

const styles = {
  header: {
    background: '#0D1F0F',
    color: 'white',
    padding: '1rem',
  },
  nav: {
    display: 'flex',
    gap: '1rem',
    padding: '0.5rem',
    background: '#1B3A1B',
  },
  tab: {
    background: 'transparent',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
  main: {
    background: '#F5F7F2',
    minHeight: '70vh',
    padding: '1rem',
  },
  footer: {
    background: '#0D1F0F',
    color: 'white',
    padding: '1rem',
    textAlign: 'center',
  },
};
