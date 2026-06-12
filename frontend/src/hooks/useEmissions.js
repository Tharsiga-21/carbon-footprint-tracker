// frontend/src/hooks/useEmissions.js

import { useMemo } from 'react';

import {
calcEmissions,
getRatingLabel,
getInsights,
getActionTips,
} from '../utils/emissions.js';

/**

* EcoTrace emissions hook.
*
* Provides memoised emissions calculations,
* rating metadata, insights and personalised
* action recommendations.
*
* @param {object} inputs
* @param {number} inputs.driving
* @param {string} inputs.carType
* @param {number} inputs.flights
* @param {number} inputs.electricity
* @param {string} inputs.heating
* @param {string} inputs.diet
* @param {string} inputs.shopping
*
* @returns {{
* emissions: {
* ```
  total:number,
  ```
* ```
  transport:number,
  ```
* ```
  flights:number,
  ```
* ```
  electricity:number,
  ```
* ```
  heating:number,
  ```
* ```
  diet:number,
  ```
* ```
  shopping:number
  ```
* },
* rating:{
* ```
  label:string,
  ```
* ```
  color:string
  ```
* },
* insights:Array<{
* ```
  level:'low'|'med'|'high',
  ```
* ```
  message:string
  ```
* }>,
* tips:Array<{
* ```
  icon:string,
  ```
* ```
  title:string,
  ```
* ```
  desc:string,
  ```
* ```
  savingTonnes:number
  ```
* }>
* }}
  */
  export function useEmissions(inputs) {
  const {
  driving,
  carType,
  flights,
  electricity,
  heating,
  diet,
  shopping,
  } = inputs;

/**

* Memoised because emissions calculations
* only need to rerun when user inputs change.
  */
  const emissions = useMemo(
  () =>
  calcEmissions({
  driving,
  carType,
  flights,
  electricity,
  heating,
  diet,
  shopping,
  }),
  [
  driving,
  carType,
  flights,
  electricity,
  heating,
  diet,
  shopping,
  ],
  );

/**

* Memoised because rating depends only
* on the total emissions value.
  */
  const rating = useMemo(
  () =>
  getRatingLabel(
  emissions.total,
  ),
  [emissions.total],
  );

/**

* Memoised because insights depend on
* emissions results and user inputs.
  */
  const insights = useMemo(
  () =>
  getInsights(
  emissions,
  inputs,
  ),
  [
  emissions,
  driving,
  carType,
  flights,
  electricity,
  heating,
  diet,
  shopping,
  ],
  );

/**

* Memoised because action tips depend on
* emissions results and user inputs.
  */
  const tips = useMemo(
  () =>
  getActionTips(
  emissions,
  inputs,
  ),
  [
  emissions,
  driving,
  carType,
  flights,
  electricity,
  heating,
  diet,
  shopping,
  ],
  );

return {
emissions,
rating,
insights,
tips,
};
}

export default useEmissions;
