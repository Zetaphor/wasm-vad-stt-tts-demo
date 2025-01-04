/**
 * @module llm-integration
 * @description Integration module for Large Language Model (LLM) API interactions.
 * Provides functionality for making chat completion and text completion requests
 * to a local or remote LLM server using an OpenAI-compatible API format.
 */

/**
 * Configuration for the LLM API
 * @typedef {Object} LLMConfig
 * @property {string} baseUrl - Base URL for the API endpoint
 * @property {string} model - Name of the model to use
 * @property {number} temperature - Controls randomness in the output (0-1)
 * @property {number} max_tokens - Maximum number of tokens to generate
 * @property {Object} headers - HTTP headers for API requests
 */
const LLM_CONFIG = {
  baseUrl: 'http://localhost:8000/v1', // Default local endpoint, can be changed
  model: 'local-model', // Default model name, can be changed
  temperature: 0.7,
  max_tokens: 1000,
  headers: {
    'Content-Type': 'application/json',
  }
};

/**
 * Initializes the LLM configuration
 * @param {Partial<LLMConfig>} config - Partial configuration object to merge with defaults
 * @throws {Error} If the configuration is invalid
 */
export function initializeLLM(config = {}) {
  Object.assign(LLM_CONFIG, config);
}

/**
 * Sends a chat completion request to the local LLM
 * @param {Array<{role: string, content: string}>} messages - Array of message objects in OpenAI chat format
 * @param {Object} options - Additional options for the request
 * @param {number} [options.temperature] - Override default temperature
 * @param {number} [options.max_tokens] - Override default max_tokens
 * @returns {Promise<Object>} The LLM response in OpenAI format
 * @throws {Error} If the API request fails
 */
export async function getChatCompletion(messages, options = {}) {
  try {
    const response = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(LLM_CONFIG.headers || {})
      },
      body: JSON.stringify({
        messages: messages,
        model: LLM_CONFIG.model,
        temperature: options.temperature || LLM_CONFIG.temperature,
        max_tokens: options.max_tokens || LLM_CONFIG.max_tokens,
        ...options
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API request failed: ${response.status} ${response.statusText}${errorData ? ` - ${errorData.error}` : ''}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in LLM request:', error);
    throw error;
  }
}

/**
 * Sends a completion request to the local LLM
 * @param {string} prompt - The text prompt
 * @param {Object} options - Additional options for the request
 * @param {number} [options.temperature] - Override default temperature
 * @param {number} [options.max_tokens] - Override default max_tokens
 * @returns {Promise<Object>} The LLM response in OpenAI format
 * @throws {Error} If the API request fails
 */
export async function getCompletion(prompt, options = {}) {
  try {
    const response = await fetch(`${LLM_CONFIG.baseUrl}/completions`, {
      method: 'POST',
      headers: LLM_CONFIG.headers,
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        prompt: prompt,
        temperature: options.temperature || LLM_CONFIG.temperature,
        max_tokens: options.max_tokens || LLM_CONFIG.max_tokens,
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in LLM request:', error);
    throw error;
  }
}

/**
 * Helper function to extract the main response text from an LLM completion
 * @param {Object} completion - The completion response from the LLM
 * @param {Array} completion.choices - Array of completion choices
 * @param {Object|string} completion.choices[0].message - Message object for chat completions
 * @param {string} [completion.choices[0].text] - Text for regular completions
 * @returns {string} The main response text
 */
export function extractResponseText(completion) {
  if (completion.choices && completion.choices.length > 0) {
    if (completion.choices[0].message) {
      return completion.choices[0].message.content;
    }
    return completion.choices[0].text;
  }
  return '';
}

/**
 * Creates a simple chat message object
 * @param {'system'|'user'|'assistant'} role - The role of the message sender
 * @param {string} content - The message content
 * @returns {{role: string, content: string}} A formatted message object
 */
export function createChatMessage(role, content) {
  return { role, content };
}