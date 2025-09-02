/**
 * Quick Add Module - Fast input interfaces for rapid note creation
 * Part of Personal Vault v2.0 UI Framework
 */

const QuickAddModule = {
    name: 'quick-add',
    version: '1.0.0',
    dependencies: ['core', 'storage-manager', 'event-bus'],
    
    // Internal state
    _isInitialized: false,
    _shortcuts: new Map(),
    _quickAddOverlay: null,
    _currentInput: null,
    _captureHistory: [],
    
    /**
     * Initialize the Quick Add system
     */
    async init(core, config = {}) {
        if (this._isInitialized) return;
        
        this._core = core;
        this._config = {
            shortcuts: config.shortcuts || {
                'ctrl+q': 'openQuickAdd',
                'ctrl+shift+q': 'openQuickCapture',
                'escape': 'closeQuickAdd'
            },
            autoSaveDelay: config.autoSaveDelay || 2000,
            enableVoiceShortcuts: config.enableVoiceShortcuts || false
        

// Export for use in modular architecture
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuickAddModule;
} else if (typeof window !== 'undefined') {
    window.QuickAddModule = QuickAddModule;
}
        
        this._setupKeyboardShortcuts();
        this._createQuickAddOverlay();
        this._setupEventListeners();
        
        this._isInitialized = true;
        console.log('[QuickAdd] Module initialized');
    },
    
    /**
     * Create the quick add overlay interface
     */
    _createQuickAddOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'quickAddOverlay';
        overlay.className = 'quick-add-overlay';
        overlay.innerHTML = `
            <div class="quick-add-container">
                <div class="quick-add-header">
                    <h3>Quick Add</h3>
                    <div class="quick-add-modes">
                        <button class="mode-btn active" data-mode="text">Text</button>
                        <button class="mode-btn" data-mode="web">Web</button>
                        <button class="mode-btn" data-mode="voice">Voice</button>
                        <button class="mode-btn" data-mode="image">Image</button>
                    </div>
                    <button class="close-btn">&times;</button>
                </div>
                
                <div class="quick-add-content">
                    <!-- Text Mode -->
                    <div class="input-mode active" data-mode="text">
                        <input type="text" class="quick-title" placeholder="Quick title (optional)">
                        <textarea class="quick-content" placeholder="Type your note... (Ctrl+Enter to save)"></textarea>
                        <div class="quick-options">
                            <label><input type="checkbox" class="user-created"> I created this</label>
                            <select class="quick-category">
                                <option value="">Auto-detect category</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Web Mode -->
                    <div class="input-mode" data-mode="web">
                        <input type="url" class="web-url" placeholder="Enter URL to capture...">
                        <div class="web-options">
                            <label><input type="checkbox" class="capture-full"> Capture full page</label>
                            <label><input type="checkbox" class="extract-text"> Extract text content</label>
                        </div>
                        <div class="web-preview" style="display: none;"></div>
                    </div>
                    
                    <!-- Voice Mode -->
                    <div class="input-mode" data-mode="voice">
                        <div class="voice-controls">
                            <button class="voice-record-btn">🎤 Start Recording</button>
                            <div class="voice-status">Ready to record</div>
                        </div>
                        <div class="voice-transcript" style="display: none;">
                            <textarea placeholder="Transcript will appear here..."></textarea>
                        </div>
                    </div>
                    
                    <!-- Image Mode -->
                    <div class="input-mode" data-mode="image">
                        <div class="image-drop-zone">
                            <input type="file" class="image-input" accept="image/*" style="display: none;">
                            <div class="drop-zone-content">
                                <div class="drop-icon">📷</div>
                                <p>Drop image here or click to select</p>
                            </div>
                        </div>
                        <div class="image-preview" style="display: none;"></div>
                        <div class="ocr-options">
                            <label><input type="checkbox" class="enable-ocr" checked> Extract text from image</label>
                        </div>
                    </div>
                </div>
                
                <div class="quick-add-actions">
                    <div class="auto-save-indicator">Auto-saving...</div>
                    <button class="save-btn primary">Save (Ctrl+Enter)</button>
                    <button class="cancel-btn">Cancel (Esc)</button>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = this._getQuickAddStyles();
        document.head.appendChild(style);
        
        document.body.appendChild(overlay);
        this._quickAddOverlay = overlay;
        
        this._setupOverlayEvents();
    },
    
    /**
     * Setup keyboard shortcuts
     */
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const key = this._getShortcutKey(e);
            const action = this._config.shortcuts[key];
            
            if (action && this[action]) {
                e.preventDefault();
                this[action]();
            }
            
            // Handle save shortcut in quick add
            if (e.ctrlKey && e.key === 'Enter' && this._isQuickAddOpen()) {
                e.preventDefault();
                this._saveCurrentInput();
            }
        });
    },
    
    /**
     * Setup event listeners for the overlay
     */
    _setupOverlayEvents() {
        if (!this._quickAddOverlay) return;
        
        // Mode switching
        this._quickAddOverlay.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this._switchMode(mode);
            });
        });
        
        // Close button
        this._quickAddOverlay.querySelector('.close-btn').addEventListener('click', () => {
            this.closeQuickAdd();
        });
        
        // Action buttons
        this._quickAddOverlay.querySelector('.save-btn').addEventListener('click', () => {
            this._saveCurrentInput();
        });
        
        this._quickAddOverlay.querySelector('.cancel-btn').addEventListener('click', () => {
            this.closeQuickAdd();
        });
        
        // Auto-save on typing (text mode)
        const textArea = this._quickAddOverlay.querySelector('.quick-content');
        textArea.addEventListener('input', this._debounce(() => {
            this._autoSave();
        }, this._config.autoSaveDelay));
        
        // Web URL input
        const urlInput = this._quickAddOverlay.querySelector('.web-url');
        urlInput.addEventListener('paste', (e) => {
            setTimeout(() => this._handleWebUrlInput(e.target.value), 100);
        });
        
        // Voice recording
        const voiceBtn = this._quickAddOverlay.querySelector('.voice-record-btn');
        voiceBtn.addEventListener('click', () => this._toggleVoiceRecording());
        
        // Image drag and drop
        const dropZone = this._quickAddOverlay.querySelector('.image-drop-zone');
        this._setupImageDropZone(dropZone);
        
        // Click overlay to close
        this._quickAddOverlay.addEventListener('click', (e) => {
            if (e.target === this._quickAddOverlay) {
                this.closeQuickAdd();
            }
        });
    },
    
    /**
     * Setup main event bus listeners
     */
    _setupEventListeners() {
        this._core.EventBus.on('quick-add:request', (data) => {
            this.openQuickAdd(data);
        });
        
        this._core.EventBus.on('web-capture:complete', (data) => {
            this._handleWebCaptureComplete(data);
        });
        
        this._core.EventBus.on('ocr:complete', (data) => {
            this._handleOCRComplete(data);
        });
    },
    
    /**
     * Open quick add overlay
     */
    openQuickAdd(options = {}) {
        if (!this._quickAddOverlay) return;
        
        // Pre-populate if data provided
        if (options.title) {
            this._quickAddOverlay.querySelector('.quick-title').value = options.title;
        }
        if (options.content) {
            this._quickAddOverlay.querySelector('.quick-content').value = options.content;
        }
        if (options.url) {
            this._switchMode('web');
            this._quickAddOverlay.querySelector('.web-url').value = options.url;
            this._handleWebUrlInput(options.url);
        }
        if (options.mode) {
            this._switchMode(options.mode);
        }
        
        this._quickAddOverlay.classList.add('active');
        this._focusCurrentInput();
        
        // Track usage
        this._core.EventBus.emit('analytics:track', {
            event: 'quick_add_opened',
            mode: options.mode || 'text'
        });
    },
    
    /**
     * Open quick capture (simplified web capture)
     */
    openQuickCapture() {
        // Try to get URL from clipboard
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(text => {
                if (this._isValidUrl(text)) {
                    this.openQuickAdd({ url: text, mode: 'web' });
                } else {
                    this.openQuickAdd({ content: text });
                }
            }).catch(() => {
                this.openQuickAdd({ mode: 'web' });
            });
        } else {
            this.openQuickAdd({ mode: 'web' });
        }
    },
    
    /**
     * Close quick add overlay
     */
    closeQuickAdd() {
        if (!this._quickAddOverlay) return;
        
        this._quickAddOverlay.classList.remove('active');
        this._clearInputs();
        this._stopVoiceRecording();
        
        this._core.EventBus.emit('analytics:track', {
            event: 'quick_add_closed'
        });
    },
    
    /**
     * Switch input mode
     */
    _switchMode(mode) {
        // Update mode buttons
        this._quickAddOverlay.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Update input panels
        this._quickAddOverlay.querySelectorAll('.input-mode').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.mode === mode);
        });
        
        this._focusCurrentInput();
    },
    
    /**
     * Focus appropriate input for current mode
     */
    _focusCurrentInput() {
        const activeMode = this._quickAddOverlay.querySelector('.input-mode.active');
        if (!activeMode) return;
        
        const mode = activeMode.dataset.mode;
        let focusElement;
        
        switch (mode) {
            case 'text':
                focusElement = activeMode.querySelector('.quick-content');
                break;
            case 'web':
                focusElement = activeMode.querySelector('.web-url');
                break;
            case 'voice':
                // Don't auto-focus for voice mode
                break;
            case 'image':
                // Don't auto-focus for image mode
                break;
        }
        
        if (focusElement) {
            setTimeout(() => focusElement.focus(), 100);
        }
    },
    
    /**
     * Save current input based on active mode
     */
    async _saveCurrentInput() {
        const activeMode = this._quickAddOverlay.querySelector('.input-mode.active').dataset.mode;
        
        try {
            let noteData;
            
            switch (activeMode) {
                case 'text':
                    noteData = this._extractTextData();
                    break;
                case 'web':
                    noteData = await this._extractWebData();
                    break;
                case 'voice':
                    noteData = this._extractVoiceData();
                    break;
                case 'image':
                    noteData = await this._extractImageData();
                    break;
                default:
                    throw new Error('Unknown input mode');
            }
            
            if (!noteData) {
                this._showError('No content to save');
                return;
            }
            
            // Add to capture history
            this._captureHistory.push({
                timestamp: Date.now(),
                mode: activeMode,
                data: noteData
            });
            
            // Save via core
            const savedNote = await this._core.addNote(noteData);
            
            this._showSuccess('Note saved successfully');
            this.closeQuickAdd();
            
            // Emit success event
            this._core.EventBus.emit('quick-add:saved', {
                noteId: savedNote.id,
                mode: activeMode
            });
            
        } catch (error) {
            console.error('[QuickAdd] Save error:', error);
            this._showError('Failed to save note: ' + error.message);
        }
    },
    
    /**
     * Extract data from text mode
     */
    _extractTextData() {
        const title = this._quickAddOverlay.querySelector('.quick-title').value.trim();
        const content = this._quickAddOverlay.querySelector('.quick-content').value.trim();
        const isUserCreated = this._quickAddOverlay.querySelector('.user-created').checked;
        const category = this._quickAddOverlay.querySelector('.quick-category').value;
        
        if (!title && !content) return null;
        
        return {
            title: title || 'Quick Note',
            content: content,
            isUserCreated: isUserCreated,
            category: category || null,
            contentType: 'text',
            source: 'quick-add'
        };
    },
    
    /**
     * Extract data from web mode
     */
    async _extractWebData() {
        const url = this._quickAddOverlay.querySelector('.web-url').value.trim();
        const captureFull = this._quickAddOverlay.querySelector('.capture-full').checked;
        const extractText = this._quickAddOverlay.querySelector('.extract-text').checked;
        
        if (!url || !this._isValidUrl(url)) {
            throw new Error('Invalid URL provided');
        }
        
        // Request web capture
        const captureData = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Web capture timeout')), 10000);
            
            this._core.EventBus.emit('web-capture:request', {
                url: url,
                options: { captureFull, extractText }
            });
            
            const handleComplete = (data) => {
                clearTimeout(timeout);
                resolve(data);
            };
            
            this._core.EventBus.once('web-capture:complete', handleComplete);
        });
        
        return {
            title: captureData.title || 'Web Capture',
            content: captureData.content || captureData.text || '',
            isUserCreated: false,
            sourceUrl: url,
            contentType: 'web',
            metadata: captureData.metadata,
            source: 'quick-add'
        };
    },
    
    /**
     * Extract data from voice mode
     */
    _extractVoiceData() {
        const transcript = this._quickAddOverlay.querySelector('.voice-transcript textarea').value.trim();
        
        if (!transcript) return null;
        
        return {
            title: 'Voice Note',
            content: transcript,
            isUserCreated: true,
            contentType: 'voice',
            source: 'quick-add'
        };
    },
    
    /**
     * Extract data from image mode
     */
    async _extractImageData() {
        const imageInput = this._quickAddOverlay.querySelector('.image-input');
        const enableOCR = this._quickAddOverlay.querySelector('.enable-ocr').checked;
        
        if (!imageInput.files || !imageInput.files[0]) {
            throw new Error('No image selected');
        }
        
        const file = imageInput.files[0];
        const imageData = await this._processImageFile(file);
        
        let ocrText = '';
        if (enableOCR) {
            // Request OCR processing
            ocrText = await new Promise((resolve) => {
                this._core.EventBus.emit('ocr:request', { imageData });
                this._core.EventBus.once('ocr:complete', (data) => {
                    resolve(data.text || '');
                });
            });
        }
        
        return {
            title: 'Image Note',
            content: ocrText,
            isUserCreated: false,
            contentType: 'image',
            imageData: imageData,
            source: 'quick-add'
        };
    },
    
    /**
     * Auto-save functionality
     */
    _autoSave() {
        const activeMode = this._quickAddOverlay.querySelector('.input-mode.active').dataset.mode;
        
        if (activeMode !== 'text') return;
        
        const title = this._quickAddOverlay.querySelector('.quick-title').value;
        const content = this._quickAddOverlay.querySelector('.quick-content').value;
        
        if (!title && !content) return;
        
        // Show auto-save indicator
        const indicator = this._quickAddOverlay.querySelector('.auto-save-indicator');
        indicator.style.display = 'block';
        
        // Save to temporary storage
        localStorage.setItem('quickAdd_draft', JSON.stringify({
            title, content,
            timestamp: Date.now()
        }));
        
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 1500);
    },
    
    /**
     * Handle web URL input
     */
    _handleWebUrlInput(url) {
        if (!this._isValidUrl(url)) return;
        
        // Show preview loading
        const preview = this._quickAddOverlay.querySelector('.web-preview');
        preview.style.display = 'block';
        preview.innerHTML = '<div class="loading">Loading preview...</div>';
        
        // Request basic metadata
        this._core.EventBus.emit('web-preview:request', { url });
    },
    
    /**
     * Handle voice recording toggle
     */
    _toggleVoiceRecording() {
        const btn = this._quickAddOverlay.querySelector('.voice-record-btn');
        const status = this._quickAddOverlay.querySelector('.voice-status');
        const transcript = this._quickAddOverlay.querySelector('.voice-transcript');
        
        if (this._isVoiceRecording) {
            this._stopVoiceRecording();
        } else {
            this._startVoiceRecording();
        }
    },
    
    /**
     * Start voice recording
     */
    _startVoiceRecording() {
        const btn = this._quickAddOverlay.querySelector('.voice-record-btn');
        const status = this._quickAddOverlay.querySelector('.voice-status');
        const transcript = this._quickAddOverlay.querySelector('.voice-transcript');
        
        // Check for speech recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this._showError('Speech recognition not supported');
            return;
        }
        
        this._recognition = new SpeechRecognition();
        this._recognition.continuous = true;
        this._recognition.interimResults = true;
        this._recognition.lang = 'en-US';
        
        this._recognition.onstart = () => {
            this._isVoiceRecording = true;
            btn.textContent = '⏹️ Stop Recording';
            btn.classList.add('recording');
            status.textContent = 'Listening...';
            transcript.style.display = 'block';
        };
        
        this._recognition.onresult = (event) => {
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
            
            if (finalTranscript) {
                const textarea = transcript.querySelector('textarea');
                textarea.value += finalTranscript;
            }
        };
        
        this._recognition.onerror = (event) => {
            this._showError('Speech recognition error: ' + event.error);
            this._stopVoiceRecording();
        };
        
        this._recognition.onend = () => {
            this._stopVoiceRecording();
        };
        
        this._recognition.start();
    },
    
    /**
     * Stop voice recording
     */
    _stopVoiceRecording() {
        if (!this._isVoiceRecording || !this._recognition) return;
        
        this._recognition.stop();
        this._isVoiceRecording = false;
        
        const btn = this._quickAddOverlay.querySelector('.voice-record-btn');
        const status = this._quickAddOverlay.querySelector('.voice-status');
        
        btn.textContent = '🎤 Start Recording';
        btn.classList.remove('recording');
        status.textContent = 'Recording stopped';
    },
    
    /**
     * Setup image drop zone
     */
    _setupImageDropZone(dropZone) {
        const input = dropZone.querySelector('.image-input');
        
        // Click to select
        dropZone.addEventListener('click', () => input.click());
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                input.files = files;
                this._handleImageSelection(files[0]);
            }
        });
        
        // File input change
        input.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this._handleImageSelection(e.target.files[0]);
            }
        });
    },
    
    /**
     * Handle image selection
     */
    _handleImageSelection(file) {
        const preview = this._quickAddOverlay.querySelector('.image-preview');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Selected image" style="max-width: 100%; max-height: 200px; border-radius: 4px;">
                <div class="image-info">${file.name} (${(file.size / 1024).toFixed(1)}KB)</div>
            `;
            preview.style.display = 'block';
        };
        
        reader.readAsDataURL(file);
    },
    
    // Utility methods
    
    /**
     * Check if quick add is open
     */
    _isQuickAddOpen() {
        return this._quickAddOverlay && this._quickAddOverlay.classList.contains('active');
    },
    
    /**
     * Get shortcut key string
     */
    _getShortcutKey(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        parts.push(e.key.toLowerCase());
        return parts.join('+');
    },
    
    /**
     * Validate URL
     */
    _isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    },
    
    /**
     * Process image file
     */
    _processImageFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    dataUrl: e.target.result,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type
                });
            };
            reader.readAsDataURL(file);
        });
    },
    
    /**
     * Clear all inputs
     */
    _clearInputs() {
        this._quickAddOverlay.querySelector('.quick-title').value = '';
        this._quickAddOverlay.querySelector('.quick-content').value = '';
        this._quickAddOverlay.querySelector('.web-url').value = '';
        this._quickAddOverlay.querySelector('.image-input').value = '';
        this._quickAddOverlay.querySelector('.voice-transcript textarea').value = '';
        
        // Hide previews
        this._quickAddOverlay.querySelector('.web-preview').style.display = 'none';
        this._quickAddOverlay.querySelector('.image-preview').style.display = 'none';
        this._quickAddOverlay.querySelector('.voice-transcript').style.display = 'none';
        
        // Reset checkboxes
        this._quickAddOverlay.querySelector('.user-created').checked = false;
        this._quickAddOverlay.querySelector('.capture-full').checked = false;
        this._quickAddOverlay.querySelector('.extract-text').checked = true;
        this._quickAddOverlay.querySelector('.enable-ocr').checked = true;
        
        // Switch back to text mode
        this._switchMode('text');
    },
    
    /**
     * Show success message
     */
    _showSuccess(message) {
        this._core.EventBus.emit('notification:show', {
            type: 'success',
            message: message
        });
    },
    
    /**
     * Show error message
     */
    _showError(message) {
        this._core.EventBus.emit('notification:show', {
            type: 'error',
            message: message
        });
    },
    
    /**
     * Debounce utility
     */
    _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Get CSS styles for quick add interface
     */
    _getQuickAddStyles() {
        return `
            .quick-add-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.7);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            }
            
            .quick-add-overlay.active {
                display: flex;
            }
            
            .quick-add-container {
                background: white;
                border-radius: 12px;
                width: 90vw;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }
            
            .quick-add-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
            }
            
            .quick-add-header h3 {
                margin: 0;
                color: #333;
            }
            
            .quick-add-modes {
                display: flex;
                gap: 8px;
            }
            
            .mode-btn {
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            
            .mode-btn.active {
                background: #2196F3;
                color: white;
                border-color: #2196F3;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .close-btn:hover {
                background: #f0f0f0;
            }
            
            .quick-add-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            .input-mode {
                display: none;
            }
            
            .input-mode.active {
                display: block;
            }
            
            .quick-title {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 16px;
                margin-bottom: 12px;
            }
            
            .quick-content {
                width: 100%;
                min-height: 120px;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 16px;
                font-family: inherit;
                resize: vertical;
                margin-bottom: 12px;
            }
            
            .quick-title:focus,
            .quick-content:focus {
                border-color: #2196F3;
                outline: none;
            }
            
            .quick-options {
                display: flex;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
            }
            
            .web-url {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 16px;
                margin-bottom: 12px;
            }
            
            .web-options {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }
            
            .web-preview {
                background: #f8f9fa;
                border-radius: 6px;
                padding: 15px;
                margin-top: 10px;
            }
            
            .voice-controls {
                text-align: center;
                margin-bottom: 15px;
            }
            
            .voice-record-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                background: #4CAF50;
                color: white;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s;
            }
            
            .voice-record-btn.recording {
                background: #f44336;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            .voice-status {
                margin-top: 10px;
                font-size: 14px;
                color: #666;
            }
            
            .voice-transcript textarea {
                width: 100%;
                min-height: 100px;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-family: inherit;
                font-size: 14px;
            }
            
            .image-drop-zone {
                border: 2px dashed #ddd;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                background: #fafafa;
            }
            
            .image-drop-zone:hover,
            .image-drop-zone.drag-over {
                border-color: #2196F3;
                background: #f0f8ff;
            }
            
            .drop-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }
            
            .image-preview {
                text-align: center;
                margin-top: 15px;
            }
            
            .image-info {
                margin-top: 10px;
                font-size: 12px;
                color: #666;
            }
            
            .ocr-options {
                margin-top: 15px;
            }
            
            .quick-add-actions {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px;
                border-top: 1px solid #eee;
                background: #f8f9fa;
            }
            
            .auto-save-indicator {
                font-size: 12px;
                color: #666;
                display: none;
            }
            
            .save-btn,
            .cancel-btn {
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            
            .save-btn {
                background: #2196F3;
                color: white;
                border: none;
            }
            
            .save-btn:hover {
                background: #1976D2;
            }
            
            .cancel-btn {
                background: #f5f5f5;
                color: #666;
                border: 1px solid #ddd;
                margin-right: 10px;
            }
            
            .cancel-btn:hover {
                background: #e0e0e0;
            }
            
            .loading {
                text-align: center;
                padding: 20px;
                color: #666;
            }
            
            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .quick-add-container {
                    width: 95vw;
                    max-height: 90vh;
                }
                
                .quick-add-header {
                    padding: 15px;
                }
                
                .quick-add-content {
                    padding: 15px;
                }
                
                .quick-add-modes {
                    flex-wrap: wrap;
                    gap: 6px;
                }
                
                .mode-btn {
                    font-size: 12px;
                    padding: 4px 8px;
                }
                
                .web-options,
                .quick-options {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .image-drop-zone {
                    padding: 30px 20px;
                }
                
                .drop-icon {
                    font-size: 36px;
                }
            }
        `;
    },
    
    /**
     * Get public API for other modules
     */
    getAPI() {
        return {
            open: (options) => this.openQuickAdd(options),
            openCapture: () => this.openQuickCapture(),
            close: () => this.closeQuickAdd(),
            isOpen: () => this._isQuickAddOpen(),
            
            // Get capture history
            getHistory: () => [...this._captureHistory],
            
            // Register custom shortcuts
            addShortcut: (key, action) => {
                this._shortcuts.set(key, action);
            },
            
            // Get quick add stats
            getStats: () => ({
                totalCaptures: this._captureHistory.length,
                modeUsage: this._getModeUsageStats(),
                averageContentLength: this._getAverageContentLength()
            })
        };
    },
    
    /**
     * Handle events from event bus
     */
    handleEvent(eventType, data) {
        switch (eventType) {
            case 'web-capture:complete':
                this._handleWebCaptureComplete(data);
                break;
            case 'ocr:complete':
                this._handleOCRComplete(data);
                break;
            case 'shortcut:triggered':
                if (data.shortcut === 'quick-add') {
                    this.openQuickAdd();
                }
                break;
        }
    },
    
    /**
     * Handle web capture completion
     */
    _handleWebCaptureComplete(data) {
        const preview = this._quickAddOverlay?.querySelector('.web-preview');
        if (!preview) return;
        
        if (data.error) {
            preview.innerHTML = `<div class="error">Failed to capture: ${data.error}</div>`;
        } else {
            preview.innerHTML = `
                <div class="web-preview-content">
                    <h4>${data.title || 'Web Page'}</h4>
                    <p>${(data.description || data.text || 'No description available').substring(0, 200)}...</p>
                    <small>From: ${data.url}</small>
                </div>
            `;
        }
    },
    
    /**
     * Handle OCR completion
     */
    _handleOCRComplete(data) {
        const transcript = this._quickAddOverlay?.querySelector('.voice-transcript textarea');
        if (transcript && data.text) {
            transcript.value = data.text;
        }
    },
    
    /**
     * Get mode usage statistics
     */
    _getModeUsageStats() {
        const stats = { text: 0, web: 0, voice: 0, image: 0 };
        this._captureHistory.forEach(capture => {
            if (stats.hasOwnProperty(capture.mode)) {
                stats[capture.mode]++;
            }
        });
        return stats;
    },
    
    /**
     * Get average content length
     */
    _getAverageContentLength() {
        if (this._captureHistory.length === 0) return 0;
        
        const totalLength = this._captureHistory.reduce((sum, capture) => {
            const content = capture.data?.content || '';
            return sum + content.length;
        }, 0);
        
        return Math.round(totalLength / this._captureHistory.length);
    },
    
    /**
     * Cleanup module
     */
    destroy() {
        // Remove overlay
        if (this._quickAddOverlay) {
            this._quickAddOverlay.remove();
            this._quickAddOverlay = null;
        }
        
        // Clean up voice recording
        this._stopVoiceRecording();
        
        // Clear shortcuts
        this._shortcuts.clear();
        
        // Clear history
        this._captureHistory = [];
        
        this._isInitialized = false;
        console.log('[QuickAdd] Module destroyed');
    }
};
