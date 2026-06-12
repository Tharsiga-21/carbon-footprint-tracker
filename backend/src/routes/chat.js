/**
 * @file routes/chat.js
 * @description POST /api/chat — proxies a conversation turn to Claude.
 *
 * Request/response contract:
 *   POST /api/chat
 *   Body:    { messages: ChatMessage[], emissions: EmissionsPayload, inputs: InputsPayload }
 *   200 OK:  { reply: string, usage: { inputTokens: number, outputTokens: number } }
 *   400:     { error: string, details?: object }   — validation failure
 *   429:     { error: string }                     — rate limited (from rateLimiter middleware)
 *   500:     { error: string }                     — upstream or server error
 *
 * The Anthropic API key is read exclusively server-side — it is never
 * included in any response and never accessible to the browser.
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { ChatRequestSchema } from '../utils/validation.js';
import { buildSystemPrompt } from '../utils/promptBuilder.js';

const router = Router();

/**
 * Anthropic SDK client instance.
 * Reads ANTHROPIC_API_KEY from the environment — set via Railway env vars in production.
 *
 * @type {Anthropic}
 */
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * The Claude model version to use for all chat completions.
 * Pinned to a specific version for reproducible behaviour.
 *
 * @constant {string}
 */
const CLAUDE_MODEL = 'claude-sonnet-4-6';

/**
 * Maximum number of tokens Claude may generate in a single response.
 * 1024 is sufficient for actionable, concise eco-advice.
 *
 * @constant {number}
 */
const MAX_RESPONSE_TOKENS = 1024;

/**
 * POST /api/chat
 *
 * Validates the request body, builds a contextualised system prompt
 * containing the user's emission data, calls Claude, and returns the
 * assistant's reply along with token usage metadata.
 *
 * All errors are forwarded via next(err) to the centralised error handler
 * — this handler contains zero catch-and-swallow logic.
 *
 * @param {import('express').Request}  req  - Express request
 * @param {import('express').Response} res  - Express response
 * @param {import('express').NextFunction} next - Express next (for error forwarding)
 * @returns {Promise<void>}
 */
router.post('/', async (req, res, next) => {
  // ── Validate input ──────────────────────────────────────────────────────────
  const parsed = ChatRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error:   'Invalid request body',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { messages, emissions, inputs } = parsed.data;

  // ── Build contextualised system prompt ──────────────────────────────────────
  // Prompt construction is delegated to a pure utility so it can be tested
  // independently and iterated on without touching this route.
  const systemPrompt = buildSystemPrompt(emissions, inputs);

  try {
    const response = await anthropicClient.messages.create({
      model:      CLAUDE_MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      system:     systemPrompt,
      messages,
    });

    // Extract the text block from the response content array
    const reply = response.content.find((block) => block.type === 'text')?.text ?? '';

    return res.json({
      reply,
      usage: {
        inputTokens:  response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    // Forward to the global error handler — never swallow
    return next(err);
  }
});

export default router;
