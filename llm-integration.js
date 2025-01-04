/**
 * Configuration for the LLM API
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
 * @param {Object} config - Configuration object
 * @param {string} config.baseUrl - Base URL for the API
 * @param {string} config.model - Model name to use
 * @param {Object} config.headers - Additional headers (e.g., for authentication)
 */
export function initializeLLM(config = {}) {
  Object.assign(LLM_CONFIG, config);
}

/**
 * Sends a chat completion request to the local LLM
 * @param {Array} messages - Array of message objects in OpenAI chat format
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} - The LLM response
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
 * @returns {Promise<Object>} - The LLM response
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
 * @returns {string} - The main response text
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
 * @param {string} role - The role (system, user, or assistant)
 * @param {string} content - The message content
 * @returns {Object} - A formatted message object
 */
export function createChatMessage(role, content) {
  return { role, content };
}