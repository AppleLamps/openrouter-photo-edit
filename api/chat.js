// Vercel Serverless Function: Chat Completions with Streaming
// Endpoint: POST /api/chat

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
        const { messages, model, stream = true, webSearch = false } = req.body;

        // Validate inputs
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Invalid messages provided' });
        }

        if (!model || typeof model !== 'string') {
            return res.status(400).json({ error: 'Invalid model provided' });
        }

        // Sanitize messages
        const sanitizedMessages = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: typeof msg.content === 'string' 
                ? msg.content.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 10000).trim()
                : ''
        })).filter(msg => msg.content.length > 0);

        if (sanitizedMessages.length === 0) {
            return res.status(400).json({ error: 'No valid messages provided' });
        }

        // Add system message for better responses
        const systemMessage = {
            role: 'system',
            content: 'You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and well-structured responses. When appropriate, use markdown formatting for code blocks, lists, and emphasis. Be concise but thorough.'
        };

        // Build request body
        const requestBody = {
            model: model,
            messages: [systemMessage, ...sanitizedMessages],
            stream: stream,
            max_tokens: 4096
        };

        // Add web search plugin if enabled
        if (webSearch) {
            requestBody.plugins = [{
                id: 'web',
                max_results: 5,
                search_prompt: 'Search for relevant and up-to-date information'
            }];
        }

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.VERCEL_URL || 'https://ai-photo-editor.vercel.app',
                'X-Title': 'AI Photo Editor - Chat'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenRouter API error:', errorData);
            return res.status(response.status).json({ 
                error: errorData.error?.message || `API request failed with status ${response.status}` 
            });
        }

        // Handle streaming response
        if (stream) {
            // Set headers for SSE
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Pipe the stream directly
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    res.write(chunk);
                }
            } catch (streamError) {
                console.error('Stream error:', streamError);
            } finally {
                res.end();
            }
        } else {
            // Non-streaming response
            const data = await response.json();
            return res.status(200).json(data);
        }

    } catch (error) {
        console.error('Error in chat API:', error);
        return res.status(500).json({ error: 'Failed to process chat message' });
    }
}

