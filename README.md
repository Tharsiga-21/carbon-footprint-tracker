# 🌱 EcoTrace — Carbon Footprint Awareness Platform

> A smart, AI-powered web app that helps individuals understand, track, and reduce their personal carbon footprint through personalized insights and an intelligent eco-advisor.

---

## 🎯 Chosen Vertical

**Environmental Awareness** — helping individuals make informed decisions about their daily habits to reduce their carbon impact.

---

## 🚀 Live Demo

[Add your deployed link here after hosting]

---

## 🧠 Approach & Logic

### Rule-Based Intelligence
The app uses contextual rule-based logic to generate insights that feel personalized:

- **Threshold detection** — emissions are categorized as low / moderate / high based on India average (1.9t) and global average (4.8t)
- **Cross-input pattern matching** — detects combinations like "meat-heavy diet + frequent flying" and surfaces compound insights
- **Dynamic savings calculations** — every tip shows savings calculated from the user's actual input values, not generic numbers
- **Priority ranking** — automatically identifies the user's biggest emission source and surfaces it first

### AI Advisor (Anthropic Claude)
The AI chat panel sends the user's full emission data as context to Claude:
Transport: 1.2t (drives 30km/day, petrol, 2 flights/yr)
Energy: 0.9t (250kWh/month, gas heating)
Diet: 1.8t (meat moderate)
Shopping: 0.7t (moderate consumption)
Total: 4.6t CO₂/yr — India avg: 1.9t, Global avg: 4.8t

This means Claude gives advice specific to **your numbers**, not generic responses.

---

## ⚙️ How the Solution Works

The app has 4 tabs:

### 1. 🧮 Calculator
- Input sliders for daily driving distance, monthly electricity usage, and flights per year
- Dropdowns for car type, heating source, diet type, and shopping habits
- Live CO₂ preview updates as you adjust inputs

### 2. 📊 Insights
- Animated score ring showing total tonnes CO₂/yr with green/amber/red color coding
- 4 metric cards breaking down emissions by category
- Bar chart visualization (Chart.js) comparing categories
- Dynamic insight cards generated from rule-based logic

### 3. 📋 Action Plan
- Personalized tips ranked by impact
- Each tip includes a calculated savings figure based on your actual inputs
- Covers transport, diet, energy, and shopping habits

### 4. 🤖 AI Advisor
- Chat interface powered by Anthropic Claude API
- Quick-chip buttons for common questions
- Claude receives your emission data as system context
- Gives specific, data-driven advice tailored to your footprint

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool |
| Chart.js + react-chartjs-2 | Data visualization |
| Anthropic Claude API | AI advisor chat |
| CSS Variables | Theming + dark mode |
| localStorage | Saving user inputs |

---

## 📦 How to Run Locally

### Prerequisites
- Node.js 18+
- npm
- Anthropic API key

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/Tharsiga-21/carbon-footprint-tracker.git
cd carbon-footprint-tracker

# 2. Install dependencies
npm install

# 3. Add your API key
cp .env.example .env
# Open .env and add your Anthropic API key:
# VITE_ANTHROPIC_API_KEY=your_key_here

# 4. Start development server
npm run dev

# 5. Open in browser
# http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🌍 Emission Factors Used

| Category | Source / Basis |
|---|---|
| Petrol car | 0.21 kg CO₂/km (UK govt average) |
| Hybrid car | 0.11 kg CO₂/km |
| Electric car | 0.05 kg CO₂/km (India grid mix) |
| Electricity | 0.82 kg CO₂/kWh (India grid factor) |
| Flight | 0.25t CO₂ per return flight (short-haul avg) |
| Meat-heavy diet | 2.5t CO₂/yr |
| Vegan diet | 0.7t CO₂/yr |

---

## 📋 Assumptions Made

- Flights assumed to be short-to-medium haul return trips (~0.25t each)
- Electricity grid emission factor based on India's average coal-heavy grid
- Diet emissions represent annual average including food production and transport
- Shopping emissions estimated based on consumption level (high/moderate/low)
- India average footprint: 1.9t CO₂/yr per person
- Global average footprint: 4.8t CO₂/yr per person

---

## ♿ Accessibility

- Semantic HTML with ARIA labels on all charts and interactive elements
- Keyboard navigable tabs and inputs
- Color is never the sole indicator — labels accompany all color-coded elements
- Responsive design works on mobile and desktop
- Dark mode support via CSS `prefers-color-scheme`

---

## 🔒 Security

- API key stored in `.env` file, never committed to the repo
- `.env` listed in `.gitignore`
- No user data sent to external servers except the Anthropic API for chat
- No authentication required — fully client-side

---

## 📁 Project Structure
carbon-footprint-tracker/
├── index.html
├── vite.config.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── src/
├── main.jsx
├── App.jsx
├── styles/
│   └── global.css
├── utils/
│   └── emissions.js
└── components/
├── Calculator.jsx
├── Insights.jsx
├── ActionPlan.jsx
└── AiAdvisor.jsx

---

## 👩‍💻 Built By

**Tharsiga Manivathanan**
CS Engineering Student | LICET Chennai
GSSoC 2026 Power Contributor

[![GitHub](https://img.shields.io/badge/GitHub-Tharsiga--21-181717?style=flat&logo=github)](https://github.com/Tharsiga-21)

---

## 📄 License

MIT License — free to use and modify.
