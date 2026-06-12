/**

* EcoTrace emission factors and shared constants.
* All values are immutable and exported individually for testability.
  */

/**

* Vehicle emission factors in kilograms of CO₂ per kilometre travelled.
* Values are based on commonly cited lifecycle/usage averages.
  */
  export const CAR_FACTORS = Object.freeze({
  petrol: 0.192,
  diesel: 0.171,
  hybrid: 0.105,
  electric: 0.047,
  none: 0,
  });

/**

* Home heating emission factors in kilograms of CO₂ per month.
* Represents approximate monthly household baseline emissions.
  */
  export const HEATING_FACTORS = Object.freeze({
  gas: 150,
  oil: 190,
  heatpump: 55,
  electric: 80,
  wood: 30,
  });

/**

* Diet-related emissions in kilograms of CO₂ per month.
* Represents average emissions associated with food consumption patterns.
  */
  export const DIET_FACTORS = Object.freeze({
  vegan: 50,
  vegetarian: 80,
  flexitarian: 120,
  omnivore: 160,
  highMeat: 230,
  });

/**

* Shopping-related emissions in kilograms of CO₂ per month.
* Represents estimated consumption footprint by purchasing behaviour.
  */
  export const SHOPPING_FACTORS = Object.freeze({
  minimal: 20,
  average: 60,
  frequent: 110,
  heavy: 180,
  });

/**

* Average kilograms of CO₂ emitted per return-equivalent flight.
  */
  export const FLIGHT_KG_PER_RETURN = 255;

/**

* Approximate average annual carbon footprint in India (tonnes CO₂e).
  */
  export const INDIA_AVG_TONNES = 1.9;

/**

* Approximate global average annual carbon footprint (tonnes CO₂e).
  */
  export const GLOBAL_AVG_TONNES = 7.5;

/**

* Number of months in a year.
  */
  export const MONTHS_PER_YEAR = 12;

/**

* Number of weeks in a year.
  */
  export const WEEKS_PER_YEAR = 52;

/**

* Number of kilograms in one metric tonne.
  */
  export const KG_PER_TONNE = 1000;

/**

* Decimal precision used for emissions output.
  */
  export const DECIMAL_PLACES = 2;

/**

* Emissions rating thresholds in annual tonnes CO₂e.
  */
  export const RATING_THRESHOLDS = Object.freeze({
  excellent: 3,
  belowAverage: 6,
  nearAverage: 8.5,
  aboveAverage: 12,
  });

/**

* Rating colors used throughout the application.
  */
  export const RATING_COLORS = Object.freeze({
  excellent: '#2E7D32',
  belowAverage: '#558B2F',
  nearAverage: '#E8A020',
  aboveAverage: '#E65100',
  highImpact: '#B71C1C',
  });

/**

* UI scale maximum for meter visualisation.
  */
  export const MAX_SCALE_TONNES = 16;

/**

* Reusable percentage conversion constant.
  */
  export const PERCENT_MULTIPLIER = 100;
