// Utility functions for AI Photo Editor

// Constants
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_PROMPT_LENGTH = 2000;
const MAX_IMAGE_DIMENSION = 2048; // Max width/height for API uploads
const MAX_BASE64_SIZE_MB = 3; // Max base64 size for API (under Vercel's 4.5MB limit)
const MAX_BASE64_SIZE_BYTES = MAX_BASE64_SIZE_MB * 1024 * 1024;

/**
 * Centralized error messages for consistent user-facing error handling
 * @type {Object.<string, string>}
 */
const ErrorMessages = {
    NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
    API_ERROR: 'The AI service encountered an error. Please try again.',
    RATE_LIMIT: 'Too many requests. Please wait a moment before trying again.',
    INVALID_IMAGE: 'The image could not be processed. Please try a different image.',
    INVALID_PROMPT: 'Please enter a valid prompt.',
    INVALID_FILE: 'Invalid file type. Please use JPG, PNG, or WEBP',
    FILE_TOO_LARGE: 'File too large. Maximum size is 10MB',
    PAYLOAD_TOO_LARGE: 'Image is too large to process. Please use a smaller image.',
    UNKNOWN: 'An unexpected error occurred. Please try again.'
};

/**
 * Convert technical errors to user-friendly error messages
 * @param {Error|string} error - The error object or error message
 * @returns {string} User-friendly error message
 */
function getUserFriendlyError(error) {
    const message = (error?.message || error || '').toLowerCase();
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('failed to fetch') || message.includes('networkerror')) {
        return ErrorMessages.NETWORK_ERROR;
    }
    
    // Payload too large (413 error)
    if (message.includes('413') || message.includes('too large') || 
        message.includes('payload') || message.includes('content too large')) {
        return ErrorMessages.PAYLOAD_TOO_LARGE;
    }
    
    // Rate limiting
    if (message.includes('rate') || message.includes('429') || 
        message.includes('rate limit')) {
        return ErrorMessages.RATE_LIMIT;
    }
    
    // API errors
    if (message.includes('api') || message.includes('500') || 
        message.includes('502') || message.includes('503') || 
        message.includes('504') || message.includes('service')) {
        return ErrorMessages.API_ERROR;
    }
    
    // Invalid prompt
    if (message.includes('invalid prompt') || message.includes('prompt')) {
        return ErrorMessages.INVALID_PROMPT;
    }
    
    // Invalid image/file
    if (message.includes('invalid') && (message.includes('image') || message.includes('file'))) {
        return ErrorMessages.INVALID_IMAGE;
    }
    
    // Log original error for debugging
    console.error('Original error:', error);
    
    return ErrorMessages.UNKNOWN;
}

/**
 * @typedef {Object} FileValidationResult
 * @property {boolean} valid - Whether the file is valid
 * @property {string|null} error - Error message if invalid, null if valid
 */

/**
 * Sanitize user prompt to prevent potential security issues
 * @param {string} prompt - User-provided prompt
 * @returns {string} Sanitized prompt (empty string if invalid)
 */
function sanitizePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') return '';
    
    // Remove potential control characters (ASCII 0-31 and 127)
    let sanitized = prompt.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Limit length to prevent abuse
    sanitized = sanitized.substring(0, MAX_PROMPT_LENGTH);
    
    // Trim whitespace
    return sanitized.trim();
}

/**
 * Rate limiter to prevent excessive API calls
 * Uses a sliding window algorithm to track requests
 * @class
 */
class RateLimiter {
    /**
     * Create a rate limiter
     * @param {number} maxRequests - Maximum number of requests allowed in the window
     * @param {number} windowMs - Time window in milliseconds
     */
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    /**
     * Check if a request can be made and record it if allowed
     * @returns {boolean} - True if request is allowed, false if rate limited
     */
    canMakeRequest() {
        const now = Date.now();
        // Remove requests outside the current window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }

    /**
     * Get the time until the next request can be made
     * @returns {number} - Milliseconds until next request is allowed (0 if allowed now)
     */
    getTimeUntilNextRequest() {
        if (this.requests.length < this.maxRequests) return 0;
        const oldestRequest = Math.min(...this.requests);
        return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
    }

    /**
     * Get remaining requests in current window
     * @returns {number} - Number of requests remaining
     */
    getRemainingRequests() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }
}

/**
 * Convert a File object to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded string (data URL format)
 * @throws {Error} If file reading fails
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Compress an image to fit within size limits
 * @param {string} base64Image - Base64 encoded image (data URL format)
 * @param {number} [maxDimension=2048] - Maximum width/height
 * @param {number} [maxSizeBytes=3145728] - Maximum file size in bytes (3MB default)
 * @param {number} [initialQuality=0.9] - Starting quality for compression
 * @returns {Promise<string>} Compressed base64 image
 */
async function compressImage(base64Image, maxDimension = MAX_IMAGE_DIMENSION, maxSizeBytes = MAX_BASE64_SIZE_BYTES, initialQuality = 0.9) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                // Calculate new dimensions maintaining aspect ratio
                let { width, height } = img;
                
                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension / width, maxDimension / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                
                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Determine output format (prefer JPEG for photos, PNG for transparency)
                const hasTransparency = base64Image.includes('image/png');
                const outputFormat = hasTransparency ? 'image/png' : 'image/jpeg';
                
                // Progressive quality reduction to meet size target
                let quality = initialQuality;
                let result = canvas.toDataURL(outputFormat, quality);
                
                // For JPEG, progressively reduce quality until under size limit
                if (outputFormat === 'image/jpeg') {
                    while (result.length > maxSizeBytes && quality > 0.1) {
                        quality -= 0.1;
                        result = canvas.toDataURL(outputFormat, quality);
                    }
                }
                
                // If still too large, reduce dimensions further
                if (result.length > maxSizeBytes) {
                    const scaleFactor = Math.sqrt(maxSizeBytes / result.length);
                    const newWidth = Math.round(width * scaleFactor);
                    const newHeight = Math.round(height * scaleFactor);
                    
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    result = canvas.toDataURL(outputFormat, quality);
                }
                
                console.log(`Image compressed: ${(base64Image.length / 1024 / 1024).toFixed(2)}MB → ${(result.length / 1024 / 1024).toFixed(2)}MB`);
                resolve(result);
            } catch (error) {
                reject(new Error('Failed to compress image: ' + error.message));
            }
        };
        
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = base64Image;
    });
}

/**
 * Check if an image needs compression
 * @param {string} base64Image - Base64 encoded image
 * @returns {boolean} True if image exceeds size limit
 */
function needsCompression(base64Image) {
    return base64Image && base64Image.length > MAX_BASE64_SIZE_BYTES;
}

/**
 * Prepare an image for API upload (compress if needed)
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} Compressed/optimized base64 image
 */
async function prepareImageForUpload(base64Image) {
    if (!base64Image) {
        throw new Error('No image provided');
    }
    
    // Check if compression is needed
    if (needsCompression(base64Image)) {
        console.log(`Image too large (${(base64Image.length / 1024 / 1024).toFixed(2)}MB), compressing...`);
        return await compressImage(base64Image);
    }
    
    return base64Image;
}

/**
 * Display an image in a container
 * @param {string} containerId - ID of the container element
 * @param {string} imageSrc - Image source (base64 or URL)
 * @param {string} [altText='Image'] - Alternative text for the image
 * @param {Function|null} [onClick=null] - Optional click handler for the image
 * @returns {void}
 */
function displayImage(containerId, imageSrc, altText = 'Image', onClick = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Create and append image element
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = altText;
    
    // Add click handler if provided
    if (onClick && typeof onClick === 'function') {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', onClick);
    }
    
    container.appendChild(img);
}

/**
 * Show loading indicator
 * @param {string} [text='Processing your image...'] - Loading text to display
 * @returns {void}
 */
function showLoading(text = 'Processing your image...') {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loadingText = document.getElementById('loadingText');

    if (loadingIndicator && loadingText) {
        loadingText.textContent = text;
        loadingIndicator.style.display = 'flex';
    }
}

/**
 * Hide loading indicator
 * @returns {void}
 */
function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 * @returns {void}
 */
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

/**
 * Hide error message
 * @returns {void}
 */
function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

/**
 * Hide success message
 * @returns {void}
 */
function hideSuccess() {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.style.display = 'none';
    }
}

// Track success message timeout
let successTimeoutId = null;

/**
 * Show success message
 * @param {string} message - Success message to display
 * @param {number} [duration=3000] - Duration in ms before auto-hide (0 = no auto-hide)
 * @returns {void}
 */
function showSuccess(message, duration = 3000) {
    // Clear any existing timeout
    if (successTimeoutId) {
        clearTimeout(successTimeoutId);
        successTimeoutId = null;
    }

    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';

        if (duration > 0) {
            successTimeoutId = setTimeout(() => {
                hideSuccess();
                successTimeoutId = null;
            }, duration);
        }
    }
}

/**
 * Enhance user prompt with AI-friendly language
 * @param {string} prompt - Original user prompt
 * @returns {string} Enhanced prompt
 */
function enhancePrompt(prompt) {
    if (!prompt || prompt.trim() === '') {
        return 'Enhance this image with professional photo editing techniques';
    }

    // Basic prompt enhancement logic
    const enhancements = [
        'Please apply professional photo editing techniques to ',
        'Using advanced AI image processing, please ',
        'Enhance this image by ',
        'Transform this photo by ',
        'Create a professional version of this image by '
    ];

    const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)];

    // Add some common enhancements if not already mentioned
    let enhancedPrompt = randomEnhancement + prompt;

    if (!prompt.toLowerCase().includes('quality') && !prompt.toLowerCase().includes('resolution')) {
        enhancedPrompt += '. Ensure the image maintains high quality and resolution';
    }

    if (!prompt.toLowerCase().includes('natural') && !prompt.toLowerCase().includes('realistic')) {
        enhancedPrompt += ' while keeping the result looking natural and realistic';
    }

    return enhancedPrompt;
}

/**
 * Validate image file (type and size)
 * @param {File} file - File to validate
 * @returns {FileValidationResult} Validation result with error message
 */
function isValidImageFile(file) {
    if (!file) return { valid: false, error: 'No file provided' };

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Please use JPG, PNG, or WEBP' };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB` };
    }

    return { valid: true, error: null };
}

/**
 * Get file extension from base64 string
 * @param {string} base64String - Base64 encoded string
 * @returns {string} File extension (e.g., 'png', 'jpeg'), defaults to 'png'
 */
function getFileExtensionFromBase64(base64String) {
    if (!base64String) return 'png';

    const matches = base64String.match(/^data:image\/(\w+);base64,/);
    if (matches && matches[1]) {
        return matches[1].toLowerCase();
    }
    return 'png';
}

/**
 * Create a download link for an image
 * @param {string} base64String - Base64 encoded image
 * @param {string} filename - Filename for the download
 * @returns {void}
 */
function createDownloadLink(base64String, filename) {
    const link = document.createElement('a');
    link.href = base64String;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
