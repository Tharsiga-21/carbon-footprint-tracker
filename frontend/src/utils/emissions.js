// frontend/src/utils/emissions.js

import {
CAR_FACTORS,
HEATING_FACTORS,
DIET_FACTORS,
SHOPPING_FACTORS,
FLIGHT_KG_PER_RETURN,
MONTHS_PER_YEAR,
WEEKS_PER_YEAR,
KG_PER_TONNE,
DECIMAL_PLACES,
RATING_THRESHOLDS,
RATING_COLORS,
} from '../constants/emissions.js';

/**

* Category labels.
  */
  const CATEGORY_TRANSPORT = 'transport';
  const CATEGORY_FLIGHTS = 'flights';
  const CATEGORY_ELECTRICITY = 'electricity';
  const CATEGORY_HEATING = 'heating';
  const CATEGORY_DIET = 'diet';
  const CATEGORY_SHOPPING = 'shopping';

const ELECTRICITY_KG_PER_KWH = 0.233;

const LABEL_EXCELLENT = 'Excellent';
const LABEL_BELOW_AVG = 'Below Avg';
const LABEL_NEAR_AVG = 'Near Avg';
const LABEL_ABOVE_AVG = 'Above Avg';
const LABEL_HIGH_IMPACT = 'High Impact';

const LOW_LEVEL = 'low';
const MEDIUM_LEVEL = 'med';
const HIGH_LEVEL = 'high';

const ZERO = 0;
const ONE = 1;
const TWO = 2;

/**

* Round numeric value to configured decimal places.
*
* @param {number} value
* @returns {number}
  */
  function roundTonnes(value) {
  return Number(value.toFixed(DECIMAL_PLACES));
  }

/**

* Convert kilograms to tonnes.
*
* @param {number} kilograms
* @returns {number}
  */
  function kgToTonnes(kilograms) {
  return kilograms / KG_PER_TONNE;
  }

/**

* Calculate annual emissions.
*
* @param {object} inputs
* @returns {EmissionsResult}
  */
  export function calcEmissions(inputs) {
  const {
  driving,
  carType,
  flights,
  electricity,
  heating,
  diet,
  shopping,
  } = inputs;

const transportKg =
driving *
WEEKS_PER_YEAR *
(CAR_FACTORS[carType] ?? ZERO);

const flightsKg =
flights *
FLIGHT_KG_PER_RETURN;

const electricityKg =
electricity *
MONTHS_PER_YEAR *
ELECTRICITY_KG_PER_KWH;

const heatingKg =
(HEATING_FACTORS[heating] ?? ZERO) *
MONTHS_PER_YEAR;

const dietKg =
(DIET_FACTORS[diet] ?? ZERO) *
MONTHS_PER_YEAR;

const shoppingKg =
(SHOPPING_FACTORS[shopping] ?? ZERO) *
MONTHS_PER_YEAR;

const transport = roundTonnes(
kgToTonnes(transportKg),
);

const flightsTotal = roundTonnes(
kgToTonnes(flightsKg),
);

const electricityTotal = roundTonnes(
kgToTonnes(electricityKg),
);

const heatingTotal = roundTonnes(
kgToTonnes(heatingKg),
);

const dietTotal = roundTonnes(
kgToTonnes(dietKg),
);

const shoppingTotal = roundTonnes(
kgToTonnes(shoppingKg),
);

const total = roundTonnes(
transport +
flightsTotal +
electricityTotal +
heatingTotal +
dietTotal +
shoppingTotal,
);

return {
total,
transport,
flights: flightsTotal,
electricity: electricityTotal,
heating: heatingTotal,
diet: dietTotal,
shopping: shoppingTotal,
};
}

/**

* Get rating label and color.
*
* @param {number} totalTonnes
* @returns {{label:string,color:string}}
  */
  export function getRatingLabel(totalTonnes) {
  if (totalTonnes < RATING_THRESHOLDS.excellent) {
  return {
  label: LABEL_EXCELLENT,
  color: RATING_COLORS.excellent,
  };
  }

if (totalTonnes < RATING_THRESHOLDS.belowAverage) {
return {
label: LABEL_BELOW_AVG,
color: RATING_COLORS.belowAverage,
};
}

if (totalTonnes < RATING_THRESHOLDS.nearAverage) {
return {
label: LABEL_NEAR_AVG,
color: RATING_COLORS.nearAverage,
};
}

if (totalTonnes < RATING_THRESHOLDS.aboveAverage) {
return {
label: LABEL_ABOVE_AVG,
color: RATING_COLORS.aboveAverage,
};
}

return {
label: LABEL_HIGH_IMPACT,
color: RATING_COLORS.highImpact,
};
}

/**

* Capitalise string.
*
* @param {string} str
* @returns {string}
  */
  export function capitalise(str) {
  if (!str) {
  return '';
  }

return (
str.charAt(ZERO).toUpperCase() +
str.slice(ONE)
);
}

/**

* Find largest emissions category.
*
* @param {object} emissions
* @returns {string}
  */
  export function getBiggestCategory(emissions) {
  const categories = {
  [CATEGORY_TRANSPORT]:
  emissions.transport,
  [CATEGORY_FLIGHTS]:
  emissions.flights,
  [CATEGORY_ELECTRICITY]:
  emissions.electricity,
  [CATEGORY_HEATING]:
  emissions.heating,
  [CATEGORY_DIET]:
  emissions.diet,
  [CATEGORY_SHOPPING]:
  emissions.shopping,
  };

return Object.entries(categories).reduce(
(highest, current) =>
current[ONE] > highest[ONE]
? current
: highest,
)[ZERO];
}

/**

* Generate personalised insights.
*
* @param {object} emissions
* @param {object} inputs
* @returns {Array<{level:'low'|'med'|'high',message:string}>}
  */
  export function getInsights(
  emissions,
  inputs,
  ) {
  const insights = [];

if (inputs.driving > 100) {
insights.push({
level: HIGH_LEVEL,
message:
'Driving is a major contributor to your footprint.',
});
}

if (inputs.flights > TWO) {
insights.push({
level: HIGH_LEVEL,
message:
'Flights contribute significantly to annual emissions.',
});
}

if (inputs.electricity > 500) {
insights.push({
level: MEDIUM_LEVEL,
message:
'Electricity usage is above average.',
});
}

if (
inputs.heating === 'oil' ||
inputs.heating === 'gas'
) {
insights.push({
level: MEDIUM_LEVEL,
message:
'Heating fuel choice increases emissions.',
});
}

if (inputs.diet === 'highMeat') {
insights.push({
level: HIGH_LEVEL,
message:
'Dietary choices account for substantial emissions.',
});
}

if (
inputs.shopping === 'frequent' ||
inputs.shopping === 'heavy'
) {
insights.push({
level: MEDIUM_LEVEL,
message:
'Consumption habits increase your footprint.',
});
}

insights.push({
level: LOW_LEVEL,
message: `Largest impact area: ${capitalise(
      getBiggestCategory(emissions),
    )}.`,
});

return insights;
}

/**

* Generate personalised action tips.
*
* @param {object} emissions
* @param {object} inputs
* @returns {Array<{icon:string,title:string,desc:string,savingTonnes:number}>}
  */
  export function getActionTips(
  emissions,
  inputs,
  ) {
  const tips = [];

tips.push({
icon: '🚗',
title: 'Drive Less',
desc:
'Reduce weekly driving by 25%.',
savingTonnes: roundTonnes(
emissions.transport * 0.25,
),
});

tips.push({
icon: '✈️',
title: 'Fly Less',
desc:
'Avoid one return flight this year.',
savingTonnes: roundTonnes(
kgToTonnes(
FLIGHT_KG_PER_RETURN,
),
),
});

tips.push({
icon: '💡',
title: 'Reduce Electricity',
desc:
'Cut monthly electricity usage by 10%.',
savingTonnes: roundTonnes(
emissions.electricity * 0.1,
),
});

tips.push({
icon: '🔥',
title: 'Upgrade Heating',
desc:
'Switch to a lower-emission heating system.',
savingTonnes: roundTonnes(
emissions.heating * 0.3,
),
});

tips.push({
icon: '🥗',
title: 'Eat More Plant-Based Meals',
desc:
'Shift towards a lower-emission diet.',
savingTonnes: roundTonnes(
emissions.diet * 0.2,
),
});

tips.push({
icon: '🛍️',
title: 'Buy Less',
desc:
'Reduce discretionary purchases.',
savingTonnes: roundTonnes(
emissions.shopping * 0.25,
),
});

return tips;
}
