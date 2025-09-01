/**
 * Vault Core Module - Personal Vault v2.0
 * Main orchestration system for all vault operations
 * Target: 300 lines max
 */

class VaultCore {
    constructor() {
        this.version = '2.0.0';
        this.name = 'vault-core';
        this.dependencies = [];
        
        // Module registry
        this.modules = new Map();
        this.apis = new Map();
        
        // Core components (will be injected)
        this.eventBus = null;
        this.storageManager = null;
        this.moduleLoader = null;
        
        // State management
        this.initialized = false;
        this.config = {};
    }

    /**
     * Initialize the core vault system
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} config - Core configuration
     * @returns {Promise<void>}
     */
    async init(dependencies = {}, config = {}) {
        try {
            console.log('Initializing Vault Core v' + this.version);
            
            // Inject dependencies
            this.eventBus = dependencies.eventBus;
            this.storageManager = dependencies.storageManager;
            this.moduleLoader = dependencies.moduleLoader;
            
            if (!this.eventBus || !this.storageManager) {
                throw new Error('Missing required dependencies: eventBus, storageManager');
            }

            // Store configuration
            this.config = {
                autoSave: true,
                enableLearning: true,
                modulesPath: './modules/',
                ...config
            };

            // Initialize storage first
            await this.storageManager.init(this, this.config);
            
            // Register core APIs
            this.registerCoreAPIs();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('Vault Core initialized successfully');
            
            // Emit initialization complete event
            this.eventBus.emit('core:initialized', { version: this.version });
            
            return Promise.resolve();
        } catch (error) {
            console.error('Vault Core initialization failed:', error);
            throw error;
        }
    }

    /**
     * Shutdown core system
     */
    async destroy() {
        try {
            // Emit shutdown event
            this.eventBus.emit('core:shutdown');
            
            // Destroy all modules
            for (const [name, module] of this.modules) {
                if (module.destroy) {
                    await module.destroy();
                }
            }
            
            // Clear registries
            this.modules.clear();
            this.apis.clear();
            
            this.initialized = false;
            console.log('Vault Core shutdown complete');
        } catch (error) {
            console.error('Vault Core shutdown failed:', error);
        }
    }

    /**
     * Register a module with the core system
     * @param {string} name - Module name
     * @param {Object} module - Module instance
     * @returns {Promise<boolean>} Success status
     */
    async registerModule(name, module) {
        try {
            if (this.modules.has(name)) {
                console.warn(`Module ${name} already registered, skipping`);
                return false;
            }

            // Validate module interface
            if (!this.validateModuleInterface(module)) {
                throw new Error(`Invalid module interface: ${name}`);
            }

            // Initialize module
            await module.init(this, this.config);
            
            // Register module and its API
            this.modules.set(name, module);
            
            const api = module.getAPI();
            if (api) {
                this.apis.set(name, api);
            }

            console.log(`Module registered: ${name}`);
            
            // Emit module registered event
            this.eventBus.emit('core:module-registered', { name, version: module.version });
            
            return true;
        } catch (error) {
            console.error(`Failed to register module ${name}:`, error);
            return false;
        }
    }

    /**
     * Unregister a module
     * @param {string} name - Module name
     * @returns {Promise<boolean>} Success status
     */
    async unregisterModule(name) {
        try {
            const module = this.modules.get(name);
            if (!module) {
                return false;
            }

            // Destroy module
            if (module.destroy) {
                await module.destroy();
            }

            // Remove from registries
            this.modules.delete(name);
            this.apis.delete(name);

            console.log(`Module unregistered: ${name}`);
            
            // Emit module unregistered event
            this.eventBus.emit('core:module-unregistered', { name });
            
            return true;
        } catch (error) {
            console.error(`Failed to unregister module ${name}:`, error);
            return false;
        }
    }

    /**
     * Get API for a registered module
     * @param {string} moduleName - Module name
     * @returns {Object|null} Module API or null
     */
    getModuleAPI(moduleName) {
        return this.apis.get(moduleName) || null;
    }

    /**
     * Check if module is registered
     * @param {string} moduleName - Module name
     * @returns {boolean} Is registered
     */
    hasModule(moduleName) {
        return this.modules.has(moduleName);
    }

    /**
     * Get public Core API
     * @returns {Object} Public API methods
     */
    getAPI() {
        return {
            // Note operations
            addNote: this.addNote.bind(this),
            updateNote: this.updateNote.bind(this),
            deleteNote: this.deleteNote.bind(this),
            getNote: this.getNote.bind(this),
            searchNotes: this.searchNotes.bind(this),
            
            // Connection operations
            getConnections: this.getConnections.bind(this),
            addConnection: this.addConnection.bind(this),
            
            // Module management
            getModuleAPI: this.getModuleAPI.bind(this),
            hasModule: this.hasModule.bind(this),
            
            // System operations
            getStats: this.getStats.bind(this),
            exportData: this.exportData.bind(this),
            importData: this.importData.bind(this)
        };
    }

    /**
     * Add a new note
     * @param {Object} noteData - Note data
     * @returns {Promise<Object>} Created note
     */
    async addNote(noteData) {
        try {
            // Validate required fields
            if (!noteData.title && !noteData.content) {
                throw new Error('Note must have title or content');
            }

            // Emit pre-add event for modules to process
            this.eventBus.emit('note:pre-add', noteData);
            
            // Save note using storage manager
            const savedNote = await this.storageManager.saveNote(noteData);
            
            // Emit post-add event
            this.eventBus.emit('note:added', savedNote);
            
            console.log(`Note added: ${savedNote.id}`);
            return savedNote;
        } catch (error) {
            console.error('Add note failed:', error);
            this.eventBus.emit('note:add-failed', { noteData, error: error.message });
            throw error;
        }
    }

    /**
     * Update an existing note
     * @param {string} noteId - Note ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Updated note
     */
    async updateNote(noteId, updates) {
        try {
            // Emit pre-update event
            this.eventBus.emit('note:pre-update', { noteId, updates });
            
            // Update note using storage manager
            const updatedNote = await this.storageManager.updateNote(noteId, updates);
            
            // Emit post-update event
            this.eventBus.emit('note:updated', updatedNote);
            
            console.log(`Note updated: ${noteId}`);
            return updatedNote;
        } catch (error) {
            console.error('Update note failed:', error);
            this.eventBus.emit('note:update-failed', { noteId, updates, error: error.message });
            throw error;
        }
    }

    /**
     * Delete a note
     * @param {string} noteId - Note ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteNote(noteId) {
        try {
            // Get note before deletion for event
            const note = await this.getNote(noteId);
            
            // Emit pre-delete event
            this.eventBus.emit('note:pre-delete', { noteId, note });
            
            // Delete note using storage manager
            const success = await this.storageManager.deleteNote(noteId);
            
            if (success) {
                // Emit post-delete event
                this.eventBus.emit('note:deleted', { noteId, note });
                console.log(`Note deleted: ${noteId}`);
            }
            
            return success;
        } catch (error) {
            console.error('Delete note failed:', error);
            this.eventBus.emit('note:delete-failed', { noteId, error: error.message });
            return false;
        }
    }

    /**
     * Get a specific note
     * @param {string} noteId - Note ID
     * @returns {Promise<Object|null>} Note or null
     */
    async getNote(noteId) {
        try {
            const notes = await this.storageManager.loadNotes();
            const note = notes.find(n => n.id === noteId);
            
            if (note) {
                // Emit note accessed event
                this.eventBus.emit('note:accessed', note);
            }
            
            return note || null;
        } catch (error) {
            console.error('Get note failed:', error);
            return null;
        }
    }

    /**
     * Search notes with query
     * @param {Object} searchParams - Search parameters
     * @returns {Promise<Array>} Matching notes
     */
    async searchNotes(searchParams = {}) {
        try {
            const { 
                query = '', 
                category = '', 
                tags = [], 
                dateRange = null,
                limit = 100 
            } = searchParams;

            // Load all notes
            const allNotes = await this.storageManager.loadNotes();
            
            // Apply filters
            let filteredNotes = allNotes;
            
            // Text query filter
            if (query) {
                const lowerQuery = query.toLowerCase();
                filteredNotes = filteredNotes.filter(note =>
                    note.title.toLowerCase().includes(lowerQuery) ||
                    note.content.toLowerCase().includes(lowerQuery) ||
                    note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
                );
            }
            
            // Category filter
            if (category) {
                filteredNotes = filteredNotes.filter(note => note.category === category);
            }
            
            // Tags filter
            if (tags.length > 0) {
                filteredNotes = filteredNotes.filter(note =>
                    tags.some(tag => note.tags.includes(tag))
                );
            }
            
            // Date range filter
            if (dateRange && dateRange.start && dateRange.end) {
                filteredNotes = filteredNotes.filter(note => {
                    const noteDate = new Date(note.timestamp);
                    return noteDate >= new Date(dateRange.start) && 
                           noteDate <= new Date(dateRange.end);
                });
            }
            
            // Apply limit
            const results = filteredNotes.slice(0, limit);
            
            // Emit search event
            this.eventBus.emit('notes:searched', { searchParams, resultCount: results.length });
            
            return results;
        } catch (error) {
            console.error('Search notes failed:', error);
            return [];
        }
    }

    /**
     * Get connections for a note
     * @param {string} noteId - Note ID
     * @returns {Promise<Array>} Connected notes
     */
    async getConnections(noteId) {
        try {
            const note = await this.getNote(noteId);
            if (!note || !note.connections) {
                return [];
            }

            // Load connected notes
            const allNotes = await this.storageManager.loadNotes();
            const connectedNotes = allNotes.filter(n => 
                note.connections.includes(n.id)
            );

            return connectedNotes;
        } catch (error) {
            console.error('Get connections failed:', error);
            return [];
        }
    }

    /**
     * Add connection between notes
     * @param {string} noteId1 - First note ID
     * @param {string} noteId2 - Second note ID
     * @returns {Promise<boolean>} Success status
     */
    async addConnection(noteId1, noteId2) {
        try {
            // Get both notes
            const note1 = await this.getNote(noteId1);
            const note2 = await this.getNote(noteId2);
            
            if (!note1 || !note2) {
                throw new Error('One or both notes not found');
            }

            // Add bidirectional connections
            if (!note1.connections.includes(noteId2)) {
                note1.connections.push(noteId2);
                await this.updateNote(noteId1, { connections: note1.connections });
            }

            if (!note2.connections.includes(noteId1)) {
                note2.connections.push(noteId1);
                await this.updateNote(noteId2, { connections: note2.connections });
            }

            // Emit connection event
            this.eventBus.emit('notes:connected', { noteId1, noteId2 });
            
            return true;
        } catch (error) {
            console.error('Add connection failed:', error);
            return false;
        }
    }

    /**
     * Get system statistics
     * @returns {Promise<Object>} System stats
     */
    async getStats() {
        try {
            const storageStats = await this.storageManager.getStorageStats();
            
            return {
                version: this.version,
                initialized: this.initialized,
                moduleCount: this.modules.size,
                registeredModules: Array.from(this.modules.keys()),
                storage: storageStats,
                uptime: Date.now() - this.startTime,
                config: this.config
            };
        } catch (error) {
            console.error('Get stats failed:', error);
            return {};
        }
    }

    /**
     * Export all vault data
     * @returns {Promise<Object>} Complete data export
     */
    async exportData() {
        try {
            const exportData = await this.storageManager.exportData();
            
            // Add core metadata
            exportData.coreVersion = this.version;
            exportData.modules = Array.from(this.modules.keys());
            
            // Emit export event
            this.eventBus.emit('data:exported', { size: JSON.stringify(exportData).length });
            
            return exportData;
        } catch (error) {
            console.error('Export data failed:', error);
            throw error;
        }
    }

    /**
     * Import vault data
     * @param {Object} importData - Data to import
     * @returns {Promise<boolean>} Success status
     */
    async importData(importData) {
        try {
            // Validate import data
            if (!importData || typeof importData !== 'object') {
                throw new Error('Invalid import data');
            }

            // Emit pre-import event
            this.eventBus.emit('data:pre-import', importData);
            
            // Import using storage manager
            const success = await this.storageManager.importData(importData);
            
            if (success) {
                // Emit post-import event
                this.eventBus.emit('data:imported', importData);
            }
            
            return success;
        } catch (error) {
            console.error('Import data failed:', error);
            this.eventBus.emit('data:import-failed', { error: error.message });
            return false;
        }
    }

    /**
     * Register core APIs with event bus
     */
    registerCoreAPIs() {
        // Register storage manager API
        if (this.storageManager) {
            this.apis.set('storage', this.storageManager.getAPI());
        }
        
        // Register core API
        this.apis.set('core', this.getAPI());
    }

    /**
     * Set up core event listeners
     */
    setupEventListeners() {
        // Listen for module events and forward to modules
        this.eventBus.on('*', (eventType, data) => {
            // Forward events to all registered modules
            for (const [name, module] of this.modules) {
                if (module.handleEvent && typeof module.handleEvent === 'function') {
                    try {
                        module.handleEvent(eventType, data);
                    } catch (error) {
                        console.error(`Module ${name} event handler failed:`, error);
                    }
                }
            }
        });

        // Handle storage events
        this.eventBus.on('storage:save', (data) => {
            if (this.storageManager) {
                this.storageManager.handleEvent('storage:save', data);
            }
        });

        this.eventBus.on('storage:load', (data) => {
            if (this.storageManager) {
                this.storageManager.handleEvent('storage:load', data);
            }
        });
    }

    /**
     * Validate module interface
     * @param {Object} module - Module to validate
     * @returns {boolean} Is valid
     */
    validateModuleInterface(module) {
        const required = ['name', 'version', 'init', 'getAPI'];
        const optional = ['dependencies', 'destroy', 'handleEvent'];
        
        // Check required methods/properties
        for (const prop of required) {
            if (!(prop in module)) {
                console.error(`Module missing required property: ${prop}`);
                return false;
            }
        }

        // Check method types
        if (typeof module.init !== 'function') {
            console.error('Module init must be a function');
            return false;
        }

        if (typeof module.getAPI !== 'function') {
            console.error('Module getAPI must be a function');
            return false;
        }

        return true;
    }

    /**
     * Handle events from event bus
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     */
    handleEvent(eventType, data) {
        switch (eventType) {
            case 'core:reload':
                this.reload();
                break;
            case 'core:shutdown':
                this.destroy();
                break;
            default:
                // Log unhandled core events in debug mode
                if (this.config.debug) {
                    console.debug(`Core: Unhandled event ${eventType}`, data);
                }
                break;
        }
    }

    /**
     * Reload core system
     */
    async reload() {
        try {
            console.log('Reloading Vault Core...');
            
            // Emit reload event
            this.eventBus.emit('core:reloading');
            
            // Reinitialize without destroying modules
            await this.storageManager.init(this, this.config);
            
            console.log('Vault Core reloaded successfully');
            this.eventBus.emit('core:reloaded');
        } catch (error) {
            console.error('Core reload failed:', error);
            this.eventBus.emit('core:reload-failed', { error: error.message });
        }
    }

    /**
     * Get module information
     * @returns {Array} Module information
     */
    getModuleInfo() {
        return Array.from(this.modules.entries()).map(([name, module]) => ({
            name: name,
            version: module.version || 'unknown',
            dependencies: module.dependencies || [],
            initialized: true
        }));
    }

    /**
     * Check system health
     * @returns {Object} Health status
     */
    async checkHealth() {
        const health = {
            core: this.initialized,
            storage: false,
            modules: {},
            timestamp: new Date().toISOString()
        };

        // Check storage health
        try {
            await this.storageManager.load('test-key');
            health.storage = true;
        } catch (error) {
            health.storageError = error.message;
        }

        // Check module health
        for (const [name, module] of this.modules) {
            health.modules[name] = {
                loaded: true,
                version: module.version || 'unknown'
            };
        }

        return health;
    }
}

// Export as module
export default VaultCore;
