/**
 * Modal System Module
 * Provides reusable modal components with event-driven communication
 * Part of UI Framework - Phase 2 Implementation
 */

class ModalSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.activeModals = new Map();
        this.modalCount = 0;
        this.zIndexBase = 1000;
        
        this.setupEventListeners();
        this.injectBaseStyles();
    }

    /**
     * Setup event bus listeners for modal management
     */
    setupEventListeners() {
        // Listen for modal requests from other modules
        this.eventBus.on('modal:show', (data) => this.showModal(data));
        this.eventBus.on('modal:hide', (data) => this.hideModal(data.modalId));
        this.eventBus.on('modal:update', (data) => this.updateModal(data.modalId, data.content));
        
        // Handle global escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                const lastModal = Array.from(this.activeModals.keys()).pop();
                this.hideModal(lastModal);
            }
        });
    }

    /**
     * Inject base modal styles into the document
     */
    injectBaseStyles() {
        if (document.getElementById('modal-system-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'modal-system-styles';
        styles.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                z-index: 1000;
            }

            .modal-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .modal-container {
                background: white;
                border-radius: 12px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                transform: scale(0.7) translateY(-50px);
                transition: all 0.3s ease;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }

            .modal-overlay.show .modal-container {
                transform: scale(1) translateY(0);
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
            }

            .modal-title {
                font-size: 20px;
                font-weight: 600;
                color: #333;
                margin: 0;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .modal-close:hover {
                color: #666;
                background: #f0f0f0;
            }

            .modal-body {
                padding: 24px;
                overflow-y: auto;
                max-height: calc(90vh - 140px);
            }

            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #eee;
                background: #f8f9fa;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            .modal-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .modal-btn-primary {
                background: #2196F3;
                color: white;
            }

            .modal-btn-primary:hover {
                background: #1976D2;
            }

            .modal-btn-secondary {
                background: #6c757d;
                color: white;
            }

            .modal-btn-secondary:hover {
                background: #5a6268;
            }

            .modal-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .modal-container {
                    max-width: 95vw;
                    margin: 20px;
                }
                
                .modal-header {
                    padding: 16px;
                }
                
                .modal-body {
                    padding: 16px;
                }
                
                .modal-footer {
                    padding: 12px 16px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Show a modal with the given configuration
     * @param {Object} config - Modal configuration
     * @param {string} config.id - Unique modal identifier
     * @param {string} config.title - Modal title
     * @param {string|HTMLElement} config.body - Modal body content
     * @param {Array} config.buttons - Array of button configurations
     * @param {Object} config.options - Additional options
     */
    showModal(config) {
        const modalId = config.id || `modal-${++this.modalCount}`;
        
        if (this.activeModals.has(modalId)) {
            console.warn(`Modal ${modalId} is already active`);
            return modalId;
        }

        const modalElement = this.createModalElement(modalId, config);
        document.body.appendChild(modalElement);
        
        // Store modal reference
        this.activeModals.set(modalId, {
            element: modalElement,
            config: config
        });

        // Show modal with animation
        requestAnimationFrame(() => {
            modalElement.classList.add('show');
            // Set proper z-index for stacking
            modalElement.style.zIndex = this.zIndexBase + this.activeModals.size;
        });

        // Focus management
        if (config.autoFocus !== false) {
            this.setModalFocus(modalElement);
        }

        // Emit modal shown event
        this.eventBus.emit('modal:shown', { modalId, config });

        return modalId;
    }

    /**
     * Hide a modal by ID
     * @param {string} modalId - Modal identifier
     */
    hideModal(modalId) {
        const modal = this.activeModals.get(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} not found`);
            return;
        }

        const { element, config } = modal;
        
        // Hide with animation
        element.classList.remove('show');
        
        setTimeout(() => {
            // Remove from DOM and tracking
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.activeModals.delete(modalId);
            
            // Emit modal hidden event
            this.eventBus.emit('modal:hidden', { modalId, config });
        }, 300);
    }

    /**
     * Update modal content
     * @param {string} modalId - Modal identifier
     * @param {Object} updates - Content updates
     */
    updateModal(modalId, updates) {
        const modal = this.activeModals.get(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} not found`);
            return;
        }

        const { element } = modal;
        
        if (updates.title) {
            const titleEl = element.querySelector('.modal-title');
            if (titleEl) titleEl.textContent = updates.title;
        }

        if (updates.body) {
            const bodyEl = element.querySelector('.modal-body');
            if (bodyEl) {
                if (typeof updates.body === 'string') {
                    bodyEl.innerHTML = updates.body;
                } else {
                    bodyEl.innerHTML = '';
                    bodyEl.appendChild(updates.body);
                }
            }
        }

        if (updates.buttons) {
            this.updateModalButtons(element, updates.buttons);
        }

        // Emit modal updated event
        this.eventBus.emit('modal:updated', { modalId, updates });
    }

    /**
     * Create modal DOM element
     * @param {string} modalId - Modal identifier
     * @param {Object} config - Modal configuration
     * @returns {HTMLElement} Modal element
     */
    createModalElement(modalId, config) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = modalId;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', `${modalId}-title`);

        const container = document.createElement('div');
        container.className = 'modal-container';
        container.style.width = config.width || 'auto';
        container.style.maxWidth = config.maxWidth || '500px';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.id = `${modalId}-title`;
        title.textContent = config.title || 'Modal';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close modal');
        closeBtn.addEventListener('click', () => this.hideModal(modalId));
        
        header.appendChild(title);
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        if (typeof config.body === 'string') {
            body.innerHTML = config.body;
        } else if (config.body) {
            body.appendChild(config.body);
        }

        // Footer (if buttons provided)
        let footer = null;
        if (config.buttons && config.buttons.length > 0) {
            footer = document.createElement('div');
            footer.className = 'modal-footer';
            
            config.buttons.forEach(btnConfig => {
                const button = this.createModalButton(btnConfig, modalId);
                footer.appendChild(button);
            });
        }

        // Assemble modal
        container.appendChild(header);
        container.appendChild(body);
        if (footer) container.appendChild(footer);
        
        overlay.appendChild(container);

        // Click outside to close
        if (config.closeOnOverlayClick !== false) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideModal(modalId);
                }
            });
        }

        return overlay;
    }

    /**
     * Create a modal button
     * @param {Object} btnConfig - Button configuration
     * @param {string} modalId - Modal identifier
     * @returns {HTMLElement} Button element
     */
    createModalButton(btnConfig, modalId) {
        const button = document.createElement('button');
        button.className = `modal-btn ${btnConfig.variant === 'primary' ? 'modal-btn-primary' : 'modal-btn-secondary'}`;
        button.textContent = btnConfig.text || 'Button';
        
        if (btnConfig.disabled) {
            button.disabled = true;
        }

        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (btnConfig.action) {
                const result = btnConfig.action(modalId, e);
                
                // Auto-close modal unless explicitly prevented
                if (result !== false && btnConfig.autoClose !== false) {
                    this.hideModal(modalId);
                }
            } else if (btnConfig.autoClose !== false) {
                this.hideModal(modalId);
            }
        });

        return button;
    }

    /**
     * Update modal buttons
     * @param {HTMLElement} modalElement - Modal element
     * @param {Array} buttons - Button configurations
     */
    updateModalButtons(modalElement, buttons) {
        const footer = modalElement.querySelector('.modal-footer');
        if (!footer) return;

        footer.innerHTML = '';
        const modalId = modalElement.id;
        
        buttons.forEach(btnConfig => {
            const button = this.createModalButton(btnConfig, modalId);
            footer.appendChild(button);
        });
    }

    /**
     * Set focus on modal for accessibility
     * @param {HTMLElement} modalElement - Modal element
     */
    setModalFocus(modalElement) {
        // Focus first focusable element in modal
        const focusableElements = modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            // Focus first non-close button, or first element if no other buttons
            const firstBtn = Array.from(focusableElements).find(el => 
                !el.classList.contains('modal-close')
            );
            (firstBtn || focusableElements[0]).focus();
        }
    }

    /**
     * Check if any modals are currently active
     * @returns {boolean} True if modals are active
     */
    hasActiveModals() {
        return this.activeModals.size > 0;
    }

    /**
     * Get list of active modal IDs
     * @returns {Array<string>} Active modal IDs
     */
    getActiveModalIds() {
        return Array.from(this.activeModals.keys());
    }

    /**
     * Close all active modals
     */
    closeAllModals() {
        const modalIds = this.getActiveModalIds();
        modalIds.forEach(id => this.hideModal(id));
    }

    /**
     * Get public API for other modules
     * @returns {Object} Public API methods
     */
    getAPI() {
        return {
            show: (config) => this.showModal(config),
            hide: (modalId) => this.hideModal(modalId),
            update: (modalId, updates) => this.updateModal(modalId, updates),
            hasActive: () => this.hasActiveModals(),
            getActive: () => this.getActiveModalIds(),
            closeAll: () => this.closeAllModals()
        };
    }

    /**
     * Cleanup when module is destroyed
     */
    destroy() {
        // Close all modals
        this.closeAllModals();
        
        // Remove event listeners
        this.eventBus.off('modal:show');
        this.eventBus.off('modal:hide');
        this.eventBus.off('modal:update');
        
        // Remove styles
        const styles = document.getElementById('modal-system-styles');
        if (styles) styles.remove();
    }
}

// Module export following the standard interface
const ModalSystemModule = {
    name: 'modal-system',
    version: '1.0.0',
    dependencies: ['event-bus'],
    
    init(eventBus, config = {}) {
        return new Promise((resolve) => {
            const modalSystem = new ModalSystem(eventBus);
            resolve(modalSystem);
        });
    },
    
    destroy(instance) {
        if (instance && instance.destroy) {
            instance.destroy();
        }
    }
};

export default ModalSystemModule;
