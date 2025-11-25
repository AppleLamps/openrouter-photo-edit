// Vercel Serverless Function: Image Editing
// Endpoint: POST /api/edit

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

        if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid image provided' });
        }

        // Sanitize prompt
        const sanitizedPrompt = prompt.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 2000).trim();

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.VERCEL_URL || 'https://ai-photo-editor.vercel.app',
                'X-Title': 'AI Photo Editor'
            },
            body: JSON.stringify({
                model: 'openai/gpt-5-image-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: sanitizedPrompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: image
                                }
                            }
                        ]
                    }
                ],
                modalities: ['image', 'text'],
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
        console.error('Error in edit API:', error);
        return res.status(500).json({ error: 'Failed to edit image' });
    }
}

