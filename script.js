// Main JavaScript for AI Photo Editor
document.addEventListener('DOMContentLoaded', function () {
    /**
     * @typedef {'edit'|'generate'} AppMode
     */

    // DOM Elements - Upload & Edit Mode
    /** @type {HTMLInputElement|null} */
    const fileInput = document.getElementById('fileInput');
    const editorSection = document.getElementById('editorSection');
    const editPrompt = document.getElementById('editPrompt');
    const enhancePromptBtn = document.getElementById('enhancePrompt');
    const applyEditBtn = document.getElementById('applyEdit');
    const originalImageContainer = document.getElementById('originalImageContainer');
    const editedImageContainer = document.getElementById('editedImageContainer');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadedThumbnail = document.getElementById('uploadedThumbnail');
    const thumbnailImg = document.getElementById('thumbnailImg');
    const removeThumbnail = document.getElementById('removeThumbnail');
    const editInputRow = document.getElementById('editInputRow');

    // DOM Elements - Generation Mode
    const generationSection = document.getElementById('generationSection');
    const generatePrompt = document.getElementById('generatePrompt');
    const enhanceGeneratePromptBtn = document.getElementById('enhanceGeneratePrompt');
    const generateImageBtn = document.getElementById('generateImage');
    const generatedImageContainer = document.getElementById('generatedImageContainer');
    const selectModelBtn = document.getElementById('selectModelBtn');
    const selectedModelName = document.getElementById('selectedModelName');

    // DOM Elements - Mode Toggle
    const modeBtns = document.querySelectorAll('.mode-btn');

    // DOM Elements - Edit Model Selector
    const selectEditModelBtn = document.getElementById('selectEditModelBtn');
    const selectedEditModelName = document.getElementById('selectedEditModelName');

    // DOM Elements - Generation Model Modal
    const modelModalOverlay = document.getElementById('modelModalOverlay');
    const closeModelModal = document.getElementById('closeModelModal');

    // DOM Elements - Edit Model Modal
    const editModelModalOverlay = document.getElementById('editModelModalOverlay');
    const closeEditModelModal = document.getElementById('closeEditModelModal');

    // DOM Elements - Lightbox
    const lightboxOverlay = document.getElementById('lightboxOverlay');
    const lightboxImage = document.getElementById('lightboxImage');
    const closeLightbox = document.getElementById('closeLightbox');

    // Application state
    let currentImageFile = null;
    let currentBase64Image = null;
    let currentObjectUrl = null; // Object URL for display (more memory efficient)
    let currentEditedImage = null;
    let currentGeneratedImage = null;
    let currentMode = 'generate'; // 'edit' or 'generate'

    // Initialize the application
    init();

    /**
     * Render generation model list dynamically from JavaScript
     */
    function renderModelList() {
        const modelList = document.getElementById('generateModelList');
        if (!modelList) return;

        const models = getAvailableModels();
        const currentModel = getGenerationModel();

        modelList.innerHTML = Object.entries(models).map(([id, info]) => `
            <div class="model-option ${id === currentModel ? 'selected' : ''}" data-model="${id}">
                <div class="model-info">
                    <div class="model-name">${escapeHtml(info.name)}</div>
                    <div class="model-description">${escapeHtml(info.description)}</div>
                    <div class="model-id">${escapeHtml(id)}</div>
                </div>
                <div class="model-check">
                    <i data-lucide="check"></i>
                </div>
            </div>
        `).join('');

        // Re-attach event listeners
        modelList.querySelectorAll('.model-option').forEach(option => {
            option.addEventListener('click', () => selectModel(option));
        });

        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Render edit model list dynamically from JavaScript
     */
    function renderEditModelList() {
        const modelList = document.getElementById('editModelList');
        if (!modelList) return;

        const models = getAvailableModels();
        const currentModel = getEditModel();

        modelList.innerHTML = Object.entries(models).map(([id, info]) => `
            <div class="model-option ${id === currentModel ? 'selected' : ''}" data-model="${id}">
                <div class="model-info">
                    <div class="model-name">${escapeHtml(info.name)}</div>
                    <div class="model-description">${escapeHtml(info.description)}</div>
                    <div class="model-id">${escapeHtml(id)}</div>
                </div>
                <div class="model-check">
                    <i data-lucide="check"></i>
                </div>
            </div>
        `).join('');

        // Re-attach event listeners
        modelList.querySelectorAll('.model-option').forEach(option => {
            option.addEventListener('click', () => selectEditModel(option));
        });

        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Initialize event listeners and setup
     * @returns {void}
     */
    function init() {
        // Render model lists dynamically
        renderModelList();
        renderEditModelList();

        // File upload via click on upload button
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', handleFileUpload);

        // Drag and drop events on input row
        editInputRow.addEventListener('dragover', handleDragOver);
        editInputRow.addEventListener('dragleave', handleDragLeave);
        editInputRow.addEventListener('drop', handleDrop);

        // Remove thumbnail button
        removeThumbnail.addEventListener('click', removeUploadedImage);

        // Edit mode button events
        enhancePromptBtn.addEventListener('click', enhanceUserPrompt);
        applyEditBtn.addEventListener('click', applyAIEdit);
        selectEditModelBtn.addEventListener('click', openEditModelModal);

        // Generation mode button events
        enhanceGeneratePromptBtn.addEventListener('click', enhanceGenerateUserPrompt);
        generateImageBtn.addEventListener('click', generateAIImage);
        selectModelBtn.addEventListener('click', openModelModal);

        // Mode toggle events
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });

        // Generation Model Modal events
        closeModelModal.addEventListener('click', closeModal);
        modelModalOverlay.addEventListener('click', (e) => {
            if (e.target === modelModalOverlay) {
                closeModal();
            }
        });

        // Edit Model Modal events
        closeEditModelModal.addEventListener('click', closeEditModal);
        editModelModalOverlay.addEventListener('click', (e) => {
            if (e.target === editModelModalOverlay) {
                closeEditModal();
            }
        });

        // Model selection events are attached in renderModelList() and renderEditModelList()

        // Keyboard events for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (lightboxOverlay.classList.contains('active')) {
                    closeLightboxModal();
                } else if (modelModalOverlay.classList.contains('active')) {
                    closeModal();
                } else if (editModelModalOverlay.classList.contains('active')) {
                    closeEditModal();
                }
            }
        });

        // Lightbox events
        closeLightbox.addEventListener('click', closeLightboxModal);
        lightboxOverlay.addEventListener('click', (e) => {
            if (e.target === lightboxOverlay) {
                closeLightboxModal();
            }
        });

        // Auto-grow textareas
        setupAutoGrowTextarea(editPrompt);
        setupAutoGrowTextarea(generatePrompt);

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Setup auto-grow functionality for a textarea
     * @param {HTMLTextAreaElement} textarea - The textarea element
     */
    function setupAutoGrowTextarea(textarea) {
        if (!textarea) return;

        const adjustHeight = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        };

        textarea.addEventListener('input', adjustHeight);
        textarea.addEventListener('focus', adjustHeight);
        
        // Initial adjustment
        adjustHeight();
    }

    /**
     * Open lightbox to view image full size
     * @param {string} imageSrc - Source URL of the image
     */
    function openLightbox(imageSrc) {
        lightboxImage.src = imageSrc;
        lightboxOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Reinitialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Close the lightbox modal
     */
    function closeLightboxModal() {
        lightboxOverlay.classList.remove('active');
        document.body.style.overflow = '';
        lightboxImage.src = '';
    }

    /**
     * Switch between edit and generate modes
     * @param {string} mode - 'edit' or 'generate'
     */
    function switchMode(mode) {
        if (mode === currentMode) return;

        currentMode = mode;

        // Update toggle buttons
        modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Show/hide sections
        if (mode === 'edit') {
            editorSection.style.display = 'block';
            generationSection.style.display = 'none';
        } else {
            editorSection.style.display = 'none';
            generationSection.style.display = 'block';
        }

        // Clear any messages
        hideError();
        hideSuccess();
    }

    /**
     * Open the generation model selector modal
     */
    function openModelModal() {
        // Refresh model list to ensure it's up to date
        renderModelList();
        modelModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close the generation model selector modal
     */
    function closeModal() {
        modelModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Open the edit model selector modal
     */
    function openEditModelModal() {
        // Refresh model list to ensure it's up to date
        renderEditModelList();
        editModelModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close the edit model selector modal
     */
    function closeEditModal() {
        editModelModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Select a generation model from the modal
     * @param {HTMLElement} option - The clicked model option element
     */
    function selectModel(option) {
        const modelId = option.dataset.model;

        // Update selection state in this modal only
        const modelList = document.getElementById('generateModelList');
        modelList.querySelectorAll('.model-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        // Update the API
        setGenerationModel(modelId);

        // Update the button text
        const modelName = option.querySelector('.model-name').textContent;
        selectedModelName.textContent = modelName;

        // Close the modal
        closeModal();

        // Reinitialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Select an edit model from the modal
     * @param {HTMLElement} option - The clicked model option element
     */
    function selectEditModel(option) {
        const modelId = option.dataset.model;

        // Update selection state in this modal only
        const modelList = document.getElementById('editModelList');
        modelList.querySelectorAll('.model-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        // Update the API
        setEditModel(modelId);

        // Update the button text
        const modelName = option.querySelector('.model-name').textContent;
        selectedEditModelName.textContent = modelName;

        // Close the modal
        closeEditModal();

        // Reinitialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Add download button for edited image
     */
    function addDownloadButton(container, image, prefix = 'edited') {
        // Get the parent image-container, not just the wrapper
        const imageContainer = container.closest('.image-container');
        if (!imageContainer) return;

        // Remove existing download button if any
        const existingBtn = imageContainer.querySelector('.download-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        if (!image) return;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = '<i data-lucide="download"></i> Download';

        downloadBtn.addEventListener('click', () => {
            if (image) {
                const extension = getFileExtensionFromBase64(image);
                const filename = `${prefix}-image-${new Date().getTime()}.${extension}`;
                createDownloadLink(image, filename);
            }
        });

        imageContainer.appendChild(downloadBtn);

        // Initialize Lucide icons in the new button
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Handle file upload via input
     * @param {Event} event - File input change event
     */
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return; // User cancelled file selection

        const validation = isValidImageFile(file);
        if (validation.valid) {
            processUploadedFile(file);
        } else {
            showError(validation.error);
        }
    }

    /**
     * Handle drag over event
     * @param {Event} event - Drag over event
     */
    function handleDragOver(event) {
        event.preventDefault();
        editInputRow.classList.add('drag-over');
    }

    /**
     * Handle drag leave event
     * @param {Event} event - Drag leave event
     */
    function handleDragLeave(event) {
        event.preventDefault();
        editInputRow.classList.remove('drag-over');
    }

    /**
     * Handle file drop event
     * @param {Event} event - Drop event
     */
    function handleDrop(event) {
        event.preventDefault();
        editInputRow.classList.remove('drag-over');

        const file = event.dataTransfer.files[0];
        if (!file) return;

        const validation = isValidImageFile(file);
        if (validation.valid) {
            processUploadedFile(file);
        } else {
            showError(validation.error);
        }
    }

    /**
     * Remove uploaded image
     */
    function removeUploadedImage() {
        cleanupPreviousImage();
        currentImageFile = null;
        
        // Hide thumbnail
        uploadedThumbnail.style.display = 'none';
        thumbnailImg.src = '';
        
        // Show upload button
        uploadBtn.style.display = 'flex';
        
        // Reset original image container
        originalImageContainer.innerHTML = `
            <div class="image-placeholder">
                <i data-lucide="image"></i>
                <p>No image uploaded</p>
            </div>
        `;
        
        // Reset edited image container
        editedImageContainer.innerHTML = `
            <div class="image-placeholder">
                <i data-lucide="image-off"></i>
                <p>No edits applied yet</p>
            </div>
        `;
        
        currentEditedImage = null;
        
        // Reinitialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Reset file input
        fileInput.value = '';
    }

    /**
     * Cleanup previous image Object URL to prevent memory leaks
     * @returns {void}
     */
    function cleanupPreviousImage() {
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
        // Clear base64 image from memory when not needed
        currentBase64Image = null;
    }

    /**
     * Get base64 image, lazy loading when needed for API calls
     * @returns {Promise<string|null>} Base64 encoded image or null if no file
     */
    async function getBase64Image() {
        if (!currentBase64Image && currentImageFile) {
            currentBase64Image = await fileToBase64(currentImageFile);
        }
        return currentBase64Image;
    }

    /**
     * Process uploaded file
     * @param {File} file - Uploaded image file
     * @returns {Promise<void>}
     */
    async function processUploadedFile(file) {
        try {
            hideError();

            // Cleanup previous image
            cleanupPreviousImage();

            // Store the file
            currentImageFile = file;

            // For display, use Object URL (more memory efficient)
            currentObjectUrl = URL.createObjectURL(file);
            
            // Show thumbnail in input row
            thumbnailImg.src = currentObjectUrl;
            uploadedThumbnail.style.display = 'block';
            uploadBtn.style.display = 'none';
            
            // Display in original image container
            displayImage('originalImageContainer', currentObjectUrl, file.name, () => {
                // Lazy load base64 for lightbox if needed
                getBase64Image().then(base64 => openLightbox(base64));
            });

            // Clear edited image
            editedImageContainer.innerHTML = '';
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';
            placeholder.innerHTML = `
                <i data-lucide="image-off"></i>
                <p>No edits applied yet</p>
            `;
            editedImageContainer.appendChild(placeholder);

            // Initialize Lucide icons in the new placeholder
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Reset edited image state
            currentEditedImage = null;

        } catch (error) {
            console.error('Error processing file:', error);
            showError(getUserFriendlyError(error));
        }
    }

    /**
     * Analyze the uploaded image (optional)
     * @param {string} base64Image - Base64 encoded image
     * @returns {Promise<void>}
     */
    async function analyzeUploadedImage(base64Image) {
        try {
            showLoading('Analyzing your image with AI...');
            const analysis = await analyzeImage(base64Image);
            console.log('Image analysis:', analysis);

            if (analysis.choices && analysis.choices[0]?.message?.content) {
                const analysisText = analysis.choices[0].message.content;
                console.log('Analysis result:', analysisText);
                // You could display this to the user if desired
            }
        } catch (error) {
            console.error('Error analyzing image:', error);
            // Don't show error to user for analysis failure
        } finally {
            hideLoading();
        }
    }

    /**
     * Enhance user's prompt using AI (Edit Mode)
     * @returns {Promise<void>}
     */
    async function enhanceUserPrompt() {
        const originalPrompt = editPrompt.value;
        if (!originalPrompt || originalPrompt.trim() === '') {
            showError('Please enter a prompt first');
            return;
        }

        try {
            hideError();
            setButtonsDisabled(true);
            showLoading('Enhancing your prompt with AI...');

            // Pass the current image if available so the AI can tailor the prompt
            const base64Image = await getBase64Image();
            const enhancedPromptText = await enhancePromptWithAI(originalPrompt, base64Image);
            editPrompt.value = enhancedPromptText;
            editPrompt.dispatchEvent(new Event('input')); // Trigger auto-grow
            showSuccess('Prompt enhanced successfully!');
        } catch (error) {
            console.error('Error enhancing prompt:', error);
            showError(getUserFriendlyError(error));
        } finally {
            hideLoading();
            setButtonsDisabled(false);
        }
    }

    /**
     * Enhance user's prompt using AI (Generation Mode)
     * @returns {Promise<void>}
     */
    async function enhanceGenerateUserPrompt() {
        const originalPrompt = generatePrompt.value;
        if (!originalPrompt || originalPrompt.trim() === '') {
            showError('Please enter a prompt first');
            return;
        }

        try {
            hideError();
            setGenerationButtonsDisabled(true);
            showLoading('Enhancing your prompt with AI...');

            const enhancedPromptText = await enhancePromptWithAI(originalPrompt);
            generatePrompt.value = enhancedPromptText;
            generatePrompt.dispatchEvent(new Event('input')); // Trigger auto-grow
            showSuccess('Prompt enhanced successfully!');
        } catch (error) {
            console.error('Error enhancing prompt:', error);
            showError(getUserFriendlyError(error));
        } finally {
            hideLoading();
            setGenerationButtonsDisabled(false);
        }
    }

    /**
     * Apply AI editing to the image
     * @returns {Promise<void>}
     */
    async function applyAIEdit() {
        const prompt = editPrompt.value;

        const base64Image = await getBase64Image();
        if (!base64Image) {
            showError('Please upload an image first');
            return;
        }

        if (!prompt || prompt.trim() === '') {
            showError('Please enter editing instructions');
            return;
        }

        try {
            hideError();
            setButtonsDisabled(true);
            showLoading('Applying AI edits to your image...');

            // Enhance the prompt before sending
            const enhancedPromptText = enhancePrompt(prompt);

            // Send to OpenRouter API for editing
            currentEditedImage = await editImage(base64Image, enhancedPromptText);

            // Display the edited image (with lightbox click)
            displayImage('editedImageContainer', currentEditedImage, 'Edited ' + (currentImageFile?.name || 'image'), () => openLightbox(currentEditedImage));

            // Add download button
            addDownloadButton(editedImageContainer, currentEditedImage, 'edited');

            // Show success message
            showSuccess('AI edits applied successfully!');

        } catch (error) {
            console.error('Error applying AI edit:', error);
            showError(getUserFriendlyError(error));
        } finally {
            hideLoading();
            setButtonsDisabled(false);
        }
    }

    /**
     * Generate an AI image from prompt
     * @returns {Promise<void>}
     */
    async function generateAIImage() {
        const prompt = generatePrompt.value;

        if (!prompt || prompt.trim() === '') {
            showError('Please enter a description for the image you want to generate');
            return;
        }

        try {
            hideError();
            setGenerationButtonsDisabled(true);
            showLoading('Generating your image with AI...');

            // Generate the image
            currentGeneratedImage = await generateImage(prompt);

            // Display the generated image (with lightbox click)
            displayImage('generatedImageContainer', currentGeneratedImage, 'Generated image', () => openLightbox(currentGeneratedImage));

            // Add download button
            addDownloadButton(generatedImageContainer, currentGeneratedImage, 'generated');

            // Show success message
            showSuccess('Image generated successfully!');

        } catch (error) {
            console.error('Error generating image:', error);
            showError(getUserFriendlyError(error));
        } finally {
            hideLoading();
            setGenerationButtonsDisabled(false);
        }
    }

    /**
     * Enable or disable edit mode buttons during processing
     * @param {boolean} disabled - Whether buttons should be disabled
     */
    function setButtonsDisabled(disabled) {
        applyEditBtn.disabled = disabled;
        enhancePromptBtn.disabled = disabled;
        selectEditModelBtn.disabled = disabled;
        uploadBtn.disabled = disabled;
        if (disabled) {
            applyEditBtn.style.opacity = '0.6';
            enhancePromptBtn.style.opacity = '0.6';
            selectEditModelBtn.style.opacity = '0.6';
            uploadBtn.style.opacity = '0.6';
        } else {
            applyEditBtn.style.opacity = '1';
            enhancePromptBtn.style.opacity = '1';
            selectEditModelBtn.style.opacity = '1';
            uploadBtn.style.opacity = '1';
        }
    }

    /**
     * Enable or disable generation mode buttons during processing
     * @param {boolean} disabled - Whether buttons should be disabled
     */
    function setGenerationButtonsDisabled(disabled) {
        generateImageBtn.disabled = disabled;
        enhanceGeneratePromptBtn.disabled = disabled;
        selectModelBtn.disabled = disabled;
        if (disabled) {
            generateImageBtn.style.opacity = '0.6';
            enhanceGeneratePromptBtn.style.opacity = '0.6';
            selectModelBtn.style.opacity = '0.6';
        } else {
            generateImageBtn.style.opacity = '1';
            enhanceGeneratePromptBtn.style.opacity = '1';
            selectModelBtn.style.opacity = '1';
        }
    }

    // Expose functions to global scope for debugging and utility access
    window.aiPhotoEditor = {
        enhanceUserPrompt,
        applyAIEdit,
        generateAIImage,
        switchMode,
        openLightbox,
        getCurrentImage: async () => await getBase64Image(),
        getEditedImage: () => currentEditedImage,
        getGeneratedImage: () => currentGeneratedImage,
        getCurrentMode: () => currentMode
    };
});
