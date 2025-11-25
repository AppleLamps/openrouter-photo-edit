// API Integration for AI Photo Editor
// Uses Vercel serverless functions to securely proxy OpenRouter API calls

/**
 * @typedef {Object} ImageGenerationModel
 * @property {string} name - Display name of the model
 * @property {string} description - Description of model capabilities
 */

/**
 * @typedef {Object.<string, ImageGenerationModel>} ModelRegistry
 */

/**
 * @typedef {Object} ApiResponse
 * @property {Array<Object>} choices - Array of response choices
 * @property {Object} [choices[0].message] - Message object
 * @property {string|Array} [choices[0].message.content] - Message content
 * @property {Array<Object>} [choices[0].message.images] - Array of image objects
 * @property {Object} [choices[0].message.images[0].image_url] - Image URL object
 * @property {string} [choices[0].message.images[0].image_url.url] - Image URL string
 * @property {Object} [error] - Error object if request failed
 * @property {string} [error.message] - Error message
 */

/**
 * @typedef {Object} RateLimitStatus
 * @property {number} remaining - Number of remaining requests
 * @property {number} waitTime - Wait time in seconds until next request
 */

/**
 * Available image generation models
 * @type {ModelRegistry}
 */
const IMAGE_GENERATION_MODELS = {
    'black-forest-labs/flux.2-pro': {
        name: 'FLUX.2 Pro',
        description: 'A high-end image generation and editing model focused on frontier-level visual quality and reliability. Strong prompt adherence, stable lighting, sharp textures.'
    },
    'black-forest-labs/flux.2-flex': {
        name: 'FLUX.2 Flex',
        description: 'Excels at rendering complex text, typography, and fine details. Supports multi-reference editing in the same unified architecture.'
    },
    'google/gemini-3-pro-image-preview': {
        name: 'Gemini 3 Pro Image',
        description: 'Google\'s latest multimodal model with advanced image generation capabilities and excellent prompt understanding.'
    },
    'openai/gpt-5-image-mini': {
        name: 'GPT-5 Image Mini',
        description: 'OpenAI\'s compact image generation model. Fast and efficient with great quality for most use cases.'
    },
    'openai/gpt-5-image': {
        name: 'GPT-5 Image',
        description: 'OpenAI\'s flagship image generation model. Best-in-class quality and creativity.'
    },
    'google/gemini-2.5-flash-image': {
        name: 'Gemini 2.5 Flash Image',
        description: 'Google\'s fast image generation model. Optimized for speed while maintaining good quality.'
    }
};

/**
 * Current selected generation model ID
 * @type {string}
 */
let currentGenerationModel = 'black-forest-labs/flux.2-pro';

/**
 * Rate limiter for API calls (10 requests per minute)
 * @type {RateLimiter}
 */
const apiRateLimiter = new RateLimiter(10, 60000);

/**
 * Check rate limit before making API request
 * @returns {void}
 * @throws {Error} If rate limit is exceeded
 */
function checkRateLimit() {
    if (!apiRateLimiter.canMakeRequest()) {
        const waitTime = Math.ceil(apiRateLimiter.getTimeUntilNextRequest() / 1000);
        throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before making another request.`);
    }
}

/**
 * Analyze an image using AI
 * @param {string} base64Image - Base64 encoded image (data:image/...;base64,...)
 * @param {string} [prompt="Analyze this image and describe its content and quality"] - Analysis prompt (optional)
 * @returns {Promise<ApiResponse>} API response containing analysis
 * @throws {Error} If analysis fails or rate limit is exceeded
 */
async function analyzeImage(base64Image, prompt = "Analyze this image and describe its content and quality") {
    // Check rate limit
    checkRateLimit();

    // Sanitize user prompt
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) {
        throw new Error('Invalid prompt provided');
    }

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: sanitizedPrompt,
                image: base64Image
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error analyzing image:', error);
        if (error.message?.toLowerCase().includes('rate limit')) {
            throw error;
        }
        throw new Error(getUserFriendlyError(error));
    }
}

/**
 * Edit an image using AI
 * @param {string} base64Image - Base64 encoded image (data:image/...;base64,...)
 * @param {string} prompt - Editing instructions for the AI
 * @returns {Promise<string>} Base64 encoded edited image (data:image/...;base64,...)
 * @throws {Error} If editing fails, no image is returned, or rate limit is exceeded
 */
async function editImage(base64Image, prompt) {
    // Check rate limit
    checkRateLimit();

    // Sanitize user prompt
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) {
        throw new Error('Invalid prompt provided');
    }

    try {
        const response = await fetch('/api/edit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: sanitizedPrompt,
                image: base64Image
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }

        const result = await response.json();

        // Extract the edited image from the response
        if (result.choices && result.choices[0]?.message?.images?.length > 0) {
            return result.choices[0].message.images[0].image_url.url;
        } else if (result.choices && result.choices[0]?.message?.content) {
            // If no image is returned, try to extract a base64 image from the text content
            const content = result.choices[0].message.content;
            const base64Match = content.match(/data:image\/\w+;base64,[^\s]+/);
            if (base64Match) {
                return base64Match[0];
            }
        }

        throw new Error('No edited image found in the API response');
    } catch (error) {
        console.error('Error editing image:', error);
        if (error.message?.toLowerCase().includes('rate limit')) {
            throw error;
        }
        throw new Error(getUserFriendlyError(error));
    }
}

/**
 * Enhance a user prompt using AI to make it more effective for image editing
 * @param {string} userPrompt - Original user prompt
 * @param {string|null} [base64Image=null] - Optional base64 encoded image to tailor the prompt
 * @returns {Promise<string>} Enhanced prompt
 * @throws {Error} If enhancement fails or rate limit is exceeded
 */
async function enhancePromptWithAI(userPrompt, base64Image = null) {
    // Check rate limit
    checkRateLimit();

    // Sanitize user prompt
    const sanitizedPrompt = sanitizePrompt(userPrompt);
    if (!sanitizedPrompt) {
        throw new Error('Invalid prompt provided');
    }

    try {
        const requestBody = {
            prompt: sanitizedPrompt
        };

        // Include image if provided
        if (base64Image) {
            requestBody.image = base64Image;
        }

        const response = await fetch('/api/enhance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }

        const result = await response.json();

        if (result.choices && result.choices[0]?.message?.content) {
            // Remove surrounding quotes if present
            let enhancedPrompt = result.choices[0].message.content.trim();
            if ((enhancedPrompt.startsWith('"') && enhancedPrompt.endsWith('"')) ||
                (enhancedPrompt.startsWith("'") && enhancedPrompt.endsWith("'"))) {
                enhancedPrompt = enhancedPrompt.slice(1, -1);
            }
            return enhancedPrompt;
        }

        throw new Error('No enhanced prompt found in the API response');
    } catch (error) {
        console.error('Error enhancing prompt with AI:', error);
        if (error.message?.toLowerCase().includes('rate limit')) {
            throw error;
        }
        throw new Error(getUserFriendlyError(error));
    }
}

/**
 * Generate an image using AI
 * @param {string} prompt - Text description of the image to generate
 * @param {string|null} [model=null] - Optional model ID to use for generation
 * @returns {Promise<string>} Base64 encoded generated image (data:image/...;base64,...)
 * @throws {Error} If generation fails, no image is returned, or rate limit is exceeded
 */
async function generateImage(prompt, model = null) {
    // Check rate limit
    checkRateLimit();

    // Sanitize user prompt
    const sanitizedPrompt = sanitizePrompt(prompt);
    if (!sanitizedPrompt) {
        throw new Error('Invalid prompt provided');
    }

    const selectedModel = model || currentGenerationModel;

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: sanitizedPrompt,
                model: selectedModel
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }

        const result = await response.json();

        // Extract the generated image from the response
        if (result.choices && result.choices[0]?.message?.content) {
            const content = result.choices[0].message.content;
            
            // Check if content is an array (multimodal response)
            if (Array.isArray(content)) {
                for (const part of content) {
                    if (part.type === 'image_url' && part.image_url?.url) {
                        return part.image_url.url;
                    }
                }
            }
            
            // Check for base64 image in text content
            if (typeof content === 'string') {
                const base64Match = content.match(/data:image\/[^;]+;base64,[^\s"]+/);
                if (base64Match) {
                    return base64Match[0];
                }
            }
        }

        // Check for images array in message
        if (result.choices && result.choices[0]?.message?.images?.length > 0) {
            const imageData = result.choices[0].message.images[0];
            if (imageData.image_url?.url) {
                return imageData.image_url.url;
            }
            if (imageData.url) {
                return imageData.url;
            }
        }

        console.log('API Response:', JSON.stringify(result, null, 2));
        throw new Error('No generated image found in the API response');
    } catch (error) {
        console.error('Error generating image:', error);
        if (error.message?.toLowerCase().includes('rate limit')) {
            throw error;
        }
        throw new Error(getUserFriendlyError(error));
    }
}

/**
 * Set the current generation model
 * @param {string} modelId - Model ID to use for generation
 * @returns {void}
 */
function setGenerationModel(modelId) {
    if (IMAGE_GENERATION_MODELS[modelId]) {
        currentGenerationModel = modelId;
    }
}

/**
 * Get the current generation model
 * @returns {string} Current model ID
 */
function getGenerationModel() {
    return currentGenerationModel;
}

/**
 * Get available generation models
 * @returns {ModelRegistry} Available models with their info
 */
function getAvailableModels() {
    return IMAGE_GENERATION_MODELS;
}

/**
 * Get rate limiter status for UI feedback
 * @returns {RateLimitStatus} Remaining requests and wait time in seconds
 */
function getRateLimitStatus() {
    return {
        remaining: apiRateLimiter.getRemainingRequests(),
        waitTime: Math.ceil(apiRateLimiter.getTimeUntilNextRequest() / 1000)
    };
}
