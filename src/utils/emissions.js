export const FACTORS = {
  cartype: { petrol: 0.21, hybrid: 0.11, ev: 0.05, none: 0 },
  heating: { gas: 0.9, oil: 1.3, heat_pump: 0.3, solar: 0.05 },
  diet: {
    meat_heavy: 2.5,
    meat_moderate: 1.8,
    pescatarian: 1.4,
    vegetarian: 1.0,
    vegan: 0.7
  },
  shopping: { high: 1.2, moderate: 0.7, low: 0.3 }
}

export function calcEmissions(inputs) {
  const { driving, cartype, flights, electricity, heating, diet, shopping } = inputs
  const transport = parseFloat(
    (driving * FACTORS.cartype[cartype] * 365 / 1000 + flights * 0.25).toFixed(2)
  )
  const energy = parseFloat(
    (electricity * 0.00082 * 12 + FACTORS.heating[heating]).toFixed(2)
  )
  const dietVal = FACTORS.diet[diet]
  const shoppingVal = FACTORS.shopping[shopping]
  const total = parseFloat((transport + energy + dietVal + shoppingVal).toFixed(2))
  return { transport, energy, diet: dietVal, shopping: shoppingVal, total }
}

export function getBiggest(emissions) {
  const cats = [
    { k: 'transport', v: emissions.transport },
    { k: 'energy', v: emissions.energy },
    { k: 'diet', v: emissions.diet },
    { k: 'shopping', v: emissions.shopping }
  ]
  return cats.sort((a, b) => b.v - a.v)[0].k
}

export function getInsights(emissions, inputs) {
  const insights = []
  const biggest = getBiggest(emissions)
  const pct = Math.round((emissions[biggest] / emissions.total) * 100)

  if (emissions[biggest] / emissions.total > 0.35) {
    insights.push({
      level: 'high',
      message: `<strong>${cap(biggest)} is your #1 source</strong> — it makes up ${pct}% of your total footprint (${emissions[biggest].toFixed(1)}t CO₂/yr). Reducing this has the biggest impact.`
    })
  }

  if (inputs.diet === 'meat_heavy' && inputs.flights > 3) {
    const combined = parseFloat((emissions.diet + emissions.transport * 0.6).toFixed(1))
    const combinedPct = Math.round((combined / emissions.total) * 100)
    insights.push({
      level: 'high',
      message: `<strong>Double impact alert:</strong> Your diet + frequent flying contribute ${combined}t — about ${combinedPct}% of your footprint. Tackling both together is your most powerful move.`
    })
  }

  if (inputs.cartype === 'petrol' && inputs.driving > 50) {
    const saved = parseFloat(((inputs.driving * 0.21 - inputs.driving * 0.05) * 365 / 1000).toFixed(1))
    insights.push({
      level: 'med',
      message: `<strong>High-mileage petrol car:</strong> Switching to an EV for your ${inputs.driving}km/day commute would save ~${saved}t CO₂/yr — that's ${Math.round(saved / emissions.total * 100)}% of your total.`
    })
  }

  if (inputs.heating === 'gas' || inputs.heating === 'oil') {
    insights.push({
      level: 'med',
      message: `<strong>Fossil fuel heating</strong> adds ${emissions.energy.toFixed(1)}t/yr. Switching to a heat pump could cut this category by up to 70%.`
    })
  }

  if (emissions.total < 2.5) {
    insights.push({
      level: 'low',
      message: `<strong>Excellent footprint!</strong> At ${emissions.total.toFixed(1)}t/yr, you're well below India's average (1.9t) and the global average (4.8t). You're a climate champion!`
    })
  } else if (emissions.total < 4) {
    insights.push({
      level: 'low',
      message: `<strong>Good progress!</strong> You're near or below the global average of 4.8t. A few targeted changes can push you well below average.`
    })
  }

  if (insights.length === 0) {
    insights.push({
      level: 'low',
      message: `Your emissions are balanced across categories. Fine-tuning diet and transport habits could still bring meaningful reductions.`
    })
  }

  return insights
}

export function getTips(emissions, inputs) {
  const tips = []

  if (inputs.cartype === 'petrol' && inputs.driving > 20) {
    const save = parseFloat((inputs.driving * 0.21 * 0.4 * 365 / 1000).toFixed(1))
    tips.push({
      icon: 'ti-bus',
      title: 'Use public transport 3 days/week',
      desc: `Your ${inputs.driving}km daily petrol commute is a major source. Three days on public transport cuts transport emissions by ~40%.`,
      save: `Saves ~${save}t CO₂/yr`
    })
  }

  if (inputs.cartype === 'petrol' && inputs.driving > 30) {
    tips.push({
      icon: 'ti-plug',
      title: 'Consider switching to an EV or hybrid',
      desc: `At ${inputs.driving}km/day, an EV would cut your transport emissions by over 75% compared to your current petrol car.`,
      save: `Saves ~${parseFloat((inputs.driving * (0.21 - 0.05) * 365 / 1000).toFixed(1))}t CO₂/yr`
    })
  }

  if (inputs.diet === 'meat_heavy' || inputs.diet === 'meat_moderate') {
    const save = parseFloat((FACTORS.diet[inputs.diet] - FACTORS.diet['vegetarian']).toFixed(1))
    tips.push({
      icon: 'ti-salad',
      title: 'Try 3 meat-free days per week',
      desc: `Reducing meat consumption is one of the highest-impact personal changes. Even partial reduction makes a real difference.`,
      save: `Saves ~${parseFloat((save * 0.4).toFixed(1))}t CO₂/yr`
    })
  }

  if (inputs.flights > 2) {
    const save = parseFloat(((inputs.flights - 1) * 0.25).toFixed(1))
    tips.push({
      icon: 'ti-plane-off',
      title: 'Replace one flight with train or video call',
      desc: `You take ${inputs.flights} flights/year. Each avoided flight saves significant emissions — trains emit ~90% less per journey.`,
      save: `Saves ~${save}t CO₂/yr`
    })
  }

  if (inputs.heating === 'gas' || inputs.heating === 'oil') {
    tips.push({
      icon: 'ti-temperature',
      title: 'Lower thermostat by 2°C + use a smart thermostat',
      desc: `Each degree lower reduces heating energy by ~6%. A smart thermostat avoids heating empty rooms and can save 10-15% annually.`,
      save: `Saves ~0.15t CO₂/yr`
    })
  }

  if (inputs.electricity > 400) {
    tips.push({
      icon: 'ti-bolt',
      title: 'Switch to LED bulbs and energy-efficient appliances',
      desc: `Your electricity usage of ${inputs.electricity}kWh/month is high. LED bulbs use 75% less energy than incandescent bulbs.`,
      save: `Saves ~0.1t CO₂/yr`
    })
  }

  if (inputs.shopping === 'high') {
    tips.push({
      icon: 'ti-rotate-clockwise',
      title: 'Buy secondhand or repair before replacing',
      desc: `Your frequent new purchases add 1.2t/yr. Thrifting, swapping, and repairing items reduces manufacturing emissions significantly.`,
      save: `Saves ~0.5t CO₂/yr`
    })
  }

  if (tips.length === 0) {
    tips.push({
      icon: 'ti-leaf',
      title: 'Explore renewable energy tariffs',
      desc: `You already have a low footprint. Consider switching to a green energy supplier or installing solar panels to go even further.`,
      save: `Potential ~0.3t CO₂/yr savings`
    })
  }

  return tips
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
