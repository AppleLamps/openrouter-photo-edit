// Vercel Serverless Function: Prompt Enhancement
// Endpoint: POST /api/enhance

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('OPENROUTER_API_KEY environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const { prompt, image } = req.body;

        // Validate inputs
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            return res.status(400).json({ error: 'Invalid prompt provided' });
        }

        // Sanitize prompt
        const sanitizedPrompt = prompt.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 2000).trim();

        const systemPrompt = 'You are an expert at writing prompts for AI image editing. Your task is to take a user\'s simple image editing request and enhance it into a more detailed, effective prompt that will produce better results. If an image is provided, tailor your enhanced prompt to make sense for that specific image. Keep the enhanced prompt concise but specific. Include details about style, quality, and technique where appropriate. Only respond with the enhanced prompt text directly - no quotes, no explanations, no additional text.';

        // Build user content based on whether image is provided
        let userContent;
        if (image && typeof image === 'string' && image.startsWith('data:image/')) {
            userContent = [
                {
                    type: 'text',
                    text: `Enhance this image editing prompt to be more effective for the provided image: ${sanitizedPrompt}`
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: image
                    }
                }
            ];
        } else {
            userContent = `Enhance this image editing prompt to be more effective: ${sanitizedPrompt}`;
        }

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.VERCEL_URL || 'https://ai-photo-editor.vercel.app',
                'X-Title': 'AI Photo Editor'
            },
            body: JSON.stringify({
                model: 'openrouter/bert-nebulon-alpha',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userContent
                    }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenRouter API error:', errorData);
            return res.status(response.status).json({ 
                error: errorData.error?.message || `API request failed with status ${response.status}` 
            });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Error in enhance API:', error);
        return res.status(500).json({ error: 'Failed to enhance prompt' });
    }
}

