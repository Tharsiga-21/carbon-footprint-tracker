/**
 * @file utils/validation.js
 * @description Zod validation schemas for all API request bodies.
 *
 * Centralising schemas here means:
 *  - Route handlers stay thin (validate → process → respond)
 *  - Schema shapes are independently testable
 *  - A single source of truth for what the API accepts
 */

import { z } from 'zod';

/** @constant {number} Maximum character length for a single chat message */
const MAX_MESSAGE_LENGTH = 4000;

/** @constant {number} Maximum number of messages allowed in one request */
const MAX_MESSAGE_COUNT = 50;

/** @constant {number} Minimum number of messages required (at least one user turn) */
const MIN_MESSAGE_COUNT = 1;

/**
 * Valid car types that map to emission factors in the frontend constants.
 * Kept in sync with CAR_FACTORS keys in frontend/src/constants/emissions.js.
 *
 * @constant {readonly string[]}
 */
const CAR_TYPE_VALUES = /** @type {const} */ ([
  'petrol',
  'diesel',
  'hybrid',
  'electric',
  'none',
]);

/**
 * Valid heating types that map to emission factors in the frontend constants.
 *
 * @constant {readonly string[]}
 */
const HEATING_TYPE_VALUES = /** @type {const} */ ([
  'gas',
  'oil',
  'heatpump',
  'electric',
  'wood',
]);

/**
 * Valid diet types that map to emission factors in the frontend constants.
 *
 * @constant {readonly string[]}
 */
const DIET_TYPE_VALUES = /** @type {const} */ ([
  'vegan',
  'vegetarian',
  'flexitarian',
  'omnivore',
  'highMeat',
]);

/**
 * Valid shopping habit levels that map to emission factors in the frontend constants.
 *
 * @constant {readonly string[]}
 */
const SHOPPING_TYPE_VALUES = /** @type {const} */ ([
  'minimal',
  'average',
  'frequent',
  'heavy',
]);

/**
 * Schema for a single message in the conversation history.
 *
 * Only 'user' and 'assistant' roles are accepted — 'system' is handled
 * server-side via the system prompt parameter and must never come from
 * the client (prompt injection prevention).
 *
 * @typedef {{ role: 'user' | 'assistant', content: string }} ChatMessage
 */
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant'], {
    errorMap: () => ({
      message: "Message role must be 'user' or 'assistant'",
    }),
  }),
  content: z
    .string()
    .min(1,                  'Message content cannot be empty')
    .max(MAX_MESSAGE_LENGTH, `Message content must not exceed ${MAX_MESSAGE_LENGTH} characters`),
});

/**
 * Schema for the user's computed annual emissions (all values in tonnes CO₂e).
 *
 * The frontend calculates these from raw inputs before sending, so the
 * backend has pre-computed values available for the system prompt without
 * having to re-implement the emission factor logic.
 *
 * @typedef {{
 *   total:       number,
 *   transport:   number,
 *   flights:     number,
 *   electricity: number,
 *   heating:     number,
 *   diet:        number,
 *   shopping:    number,
 * }} EmissionsPayload
 */
const EmissionsSchema = z.object({
  total:       z.number().nonnegative('total emissions cannot be negative'),
  transport:   z.number().nonnegative('transport emissions cannot be negative'),
  flights:     z.number().nonnegative('flights emissions cannot be negative'),
  electricity: z.number().nonnegative('electricity emissions cannot be negative'),
  heating:     z.number().nonnegative('heating emissions cannot be negative'),
  diet:        z.number().nonnegative('diet emissions cannot be negative'),
  shopping:    z.number().nonnegative('shopping emissions cannot be negative'),
});

/**
 * Schema for the user's raw lifestyle inputs.
 *
 * Sent alongside pre-computed emissions so the system prompt can reference
 * the specific input values (e.g. "your 80 km/week petrol commute") rather
 * than just the resulting tonnes figure.
 *
 * @typedef {{
 *   driving:     number,
 *   carType:     'petrol'|'diesel'|'hybrid'|'electric'|'none',
 *   flights:     number,
 *   electricity: number,
 *   heating:     'gas'|'oil'|'heatpump'|'electric'|'wood',
 *   diet:        'vegan'|'vegetarian'|'flexitarian'|'omnivore'|'highMeat',
 *   shopping:    'minimal'|'average'|'frequent'|'heavy',
 * }} InputsPayload
 */
const InputsSchema = z.object({
  driving:     z.number().nonnegative(),
  carType:     z.enum(CAR_TYPE_VALUES),
  flights:     z.number().nonnegative(),
  electricity: z.number().nonnegative(),
  heating:     z.enum(HEATING_TYPE_VALUES),
  diet:        z.enum(DIET_TYPE_VALUES),
  shopping:    z.enum(SHOPPING_TYPE_VALUES),
});

/**
 * Full request body schema for POST /api/chat.
 *
 * @typedef {{
 *   messages:  ChatMessage[],
 *   emissions: EmissionsPayload,
 *   inputs:    InputsPayload,
 * }} ChatRequest
 */
export const ChatRequestSchema = z.object({
  messages: z
    .array(MessageSchema)
    .min(MIN_MESSAGE_COUNT, 'At least one message is required')
    .max(MAX_MESSAGE_COUNT, `Conversation history must not exceed ${MAX_MESSAGE_COUNT} messages`),

  emissions: EmissionsSchema,

  inputs: InputsSchema,
});
