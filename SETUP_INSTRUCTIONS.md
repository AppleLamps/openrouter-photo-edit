# AI Photo Editor - Setup Instructions

## Getting Started

Follow these simple steps to set up and run the AI Photo Editor:

### 1. Get Your OpenRouter API Key

1. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up or log in to your OpenRouter account
3. Create a new API key
4. Copy the API key (it will look something like `sk-or-v1-...`)

### 2. Configure the Application

1. Open the `api.js` file in a text editor
2. Find the line that says:

   ```javascript
   const OPENROUTER_API_KEY = 'YOUR_OPENROUTER_API_KEY';
   ```

3. Replace `YOUR_OPENROUTER_API_KEY` with your actual API key
4. (Optional) Update the `HTTP-Referer` and `X-Title` headers with your website information

### 3. Run the Application

1. Open the `index.html` file in your web browser
2. You can do this by:
   - Double-clicking the file in your file explorer
   - Right-clicking the file and selecting "Open with" your preferred browser
   - Dragging the file into your browser window

### 4. Start Editing Photos

1. Upload an image by dragging and dropping or clicking the upload area
2. Enter your editing instructions (e.g., "Make the sky more vibrant", "Remove the background")
3. Click "Apply AI Edit" to see the results

## Troubleshooting

### API Key Issues

- Make sure you've copied the entire API key correctly
- Ensure there are no extra spaces before or after the key
- Check that you're using a valid OpenRouter API key

### Browser Compatibility

- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Ensure JavaScript is enabled in your browser

### File Issues

- Make sure all files are in the same directory
- Check that no files are missing from the project

## Advanced Configuration

### Changing Models

You can change the AI models used for analysis and editing by modifying these lines in `api.js`:

```javascript
// For image analysis
model: 'openrouter/bert-nebulon-alpha',

// For image editing
model: 'openai/gpt-5-image-mini',
```

Visit [https://openrouter.ai/models](https://openrouter.ai/models) to see available models.

### Customizing the UI

Edit the `styles.css` file to change colors, layout, and appearance.

### Improving Prompt Enhancement

Edit the `enhancePrompt` function in `utils.js` to improve how user prompts are enhanced.
