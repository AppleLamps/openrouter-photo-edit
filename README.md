# AI Photo Editor

A web-based AI-powered photo editing application that uses OpenRouter API to analyze, edit, and generate images.

## Features

- **Drag & Drop Image Upload**: Easily upload images by dragging and dropping or clicking to browse
- **AI-Powered Editing**: Use natural language to describe the edits you want
- **AI Image Generation**: Create new images from text descriptions
- **Multiple Models**: Choose from various AI models for image generation
- **Prompt Enhancement**: Improve your editing instructions with AI assistance
- **Before & After Comparison**: View original and edited images side by side
- **Download Images**: Save your AI-edited or generated images to your device
- **Lightbox View**: Click any image to view it full-size

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- OpenRouter API key (get one at [https://openrouter.ai/keys](https://openrouter.ai/keys))

## Deploy to Vercel (Recommended)

The easiest way to deploy this app is using Vercel, which keeps your API key secure:

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ai-photo-editor.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project" and import your repository
3. Add your environment variable:
   - Name: `OPENROUTER_API_KEY`
   - Value: Your OpenRouter API key (from [openrouter.ai/keys](https://openrouter.ai/keys))
4. Click "Deploy"

Your app will be live at `https://your-project.vercel.app` with your API key securely stored server-side!

## Local Development

### Option 1: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Create .env.local file
cp .env.example .env.local
# Edit .env.local and add your API key

# Run locally with serverless functions
vercel dev
```

### Option 2: Static File Server (API key exposed - development only!)
1. Open `api.js` and temporarily add your API key
2. Serve the files with any static server (e.g., `npx serve`)
3. **Warning**: This exposes your API key in the browser!

## Project Structure

```
ai-photo-editor/
├── api/                    # Vercel serverless functions
│   ├── analyze.js          # Image analysis endpoint
│   ├── edit.js             # Image editing endpoint
│   ├── enhance.js          # Prompt enhancement endpoint
│   └── generate.js         # Image generation endpoint
├── index.html              # Main HTML file
├── styles.css              # Main styles
├── additional-styles.css   # Additional styles (modes, modals)
├── script.js               # Main application logic
├── api.js                  # API client (calls serverless functions)
├── utils.js                # Utility functions
├── vercel.json             # Vercel configuration
├── .env.example            # Environment variables template
└── .gitignore              # Git ignore rules
```

## How to Use

### Generate Mode
1. Select an AI model from the dropdown
2. Enter a description of the image you want to create
3. (Optional) Click "Enhance Prompt" to improve your description
4. Click "Generate Image"
5. Download your generated image

### Edit Mode
1. Switch to "Edit Mode" using the toggle
2. Upload an image by dragging and dropping or clicking
3. Enter editing instructions (e.g., "Make the sky bluer", "Remove background")
4. (Optional) Click "Enhance Prompt" to improve your instructions
5. Click "Apply AI Edit"
6. Download your edited image

## Supported Image Formats

- JPG/JPEG
- PNG
- WEBP

## Available Models

### Generation Models
- **FLUX.2 Pro** - High-end visual quality and reliability
- **FLUX.2 Flex** - Great for text and typography
- **Gemini 3 Pro Image** - Google's advanced multimodal model
- **GPT-5 Image Mini** - Fast and efficient
- **GPT-5 Image** - Best-in-class quality
- **Gemini 2.5 Flash Image** - Optimized for speed

### Editing & Analysis
- Image editing uses `openai/gpt-5-image-mini`
- Prompt enhancement uses `openrouter/bert-nebulon-alpha`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |

## Troubleshooting

- **"Server configuration error"**: Make sure your `OPENROUTER_API_KEY` environment variable is set in Vercel
- **Network Errors**: Check your internet connection
- **Image Loading Issues**: Ensure you're using supported image formats (JPG, PNG, WEBP)
- **Rate Limit Errors**: Wait a moment before making another request (10 requests/minute limit)
- **API Errors**: Check the browser console for detailed error messages

## Security

- API keys are stored securely as environment variables on Vercel
- All API calls are proxied through serverless functions
- User prompts are sanitized before being sent to the API
- Rate limiting prevents abuse

## License

This project is open source and available for personal and commercial use.
