/**
 * @typedef {Object} Classification
 * @property {string} intent - Classified intent (e.g. "tracking_query", "human_agent", "greeting")
 * @property {number} confidence - Confidence score between 0 and 1
 * @property {Record<string, unknown>} [entities] - Extracted entities (e.g. tracking code)
 */

/**
 * Port: LLM provider abstraction.
 * Implementations: GroqAdapter, OpenAIAdapter, AnthropicAdapter
 *
 * @typedef {Object} ILLMProvider
 * @property {(message: string, history: import('../domain/entities/Message.js').Message[]) => Promise<Classification>} classify
 *   Classify the intent of an incoming message given the conversation history.
 * @property {(intent: Classification, context: Record<string, unknown>) => Promise<string>} generateResponse
 *   Generate a text response based on the classified intent and conversation context.
 */
