/**
 * Storage Manager Module - Personal Vault v2.0
 * Handles all data persistence operations with schema validation
 * Target: 250 lines max
 */

class StorageManager {
    constructor() {
        this.version = '1.0.0';
        this.name = 'storage-manager';
        this.dependencies = ['core'];
        
        // Storage keys
        this.keys = {
            notes: 'vault_notes_v2',
            aiMemory: 'vault_ai_memory_v2',
            userConfig: 'vault_user_config_v2',
            schemas: 'vault_schemas_v2'
        };
        
        // In-memory cache for performance
        this.cache = new Map();
        this.initialized = false;
    }

    /**
     * Initialize the storage system
     * @param {Object} core - Core vault instance
     * @param {Object} config - Configuration object
     * @returns {Promise<void>}
     */
    async init(core, config = {}) {
        try {
            // Initialize default schemas
            await this.initializeSchemas();
            
            // Load or create default data structures
            await this.initializeData();
            
            // Set up cache
            this.loadCache();
            
            this.initialized = true;
            console.log('Storage Manager initialized successfully');
            
            return Promise.resolve();
        } catch (error) {
            console.error('Storage Manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Clean up storage manager
     */
    destroy() {
        this.cache.clear();
        this.initialized = false;
    }

    /**
     * Get public API methods
     * @returns {Object} Public API
     */
    getAPI() {
        return {
            // Core CRUD operations
            save: this.save.bind(this),
            load: this.load.bind(this),
            delete: this.delete.bind(this),
            
            // Note operations
            saveNote: this.saveNote.bind(this),
            loadNotes: this.loadNotes.bind(this),
            updateNote: this.updateNote.bind(this),
            deleteNote: this.deleteNote.bind(this),
            
            // AI Memory operations
            getAIMemory: this.getAIMemory.bind(this),
            updateAIMemory: this.updateAIMemory.bind(this),
            
            // User config operations
            getUserConfig: this.getUserConfig.bind(this),
            updateUserConfig: this.updateUserConfig.bind(this),
            
            // Utility operations
            exportData: this.exportData.bind(this),
            importData: this.importData.bind(this),
            validateSchema: this.validateSchema.bind(this),
            getStorageStats: this.getStorageStats.bind(this)
        };
    }

    /**
     * Handle events from event bus
     * @param {string} eventType - Type of event
     * @param {Object} data - Event data
     */
    handleEvent(eventType, data) {
        switch (eventType) {
            case 'storage:save':
                return this.save(data.key, data.value);
            case 'storage:load':
                return this.load(data.key);
            case 'storage:clear-cache':
                this.cache.clear();
                break;
            default:
                // Ignore unknown events
                break;
        }
    }

    /**
     * Initialize default data schemas
     */
    async initializeSchemas() {
        const defaultSchemas = {
            note: {
                id: 'string',
                title: 'string',
                content: 'string',
                isUserCreated: 'boolean',
                category: 'string',
                tags: 'array',
                rating: 'number',
                ratingReason: 'string',
                timestamp: 'string',
                lastModified: 'string',
                sourceUrl: 'string?',
                contentType: 'string',
                metadata: 'object',
                connections: 'array',
                aiInsights: 'object'
            },
            aiMemory: {
                userVoice: {
                    languagePatterns: 'object',
                    emotionalBaseline: 'object',
                    writingStyle: 'object'
                },
                contentAnalysis: {
                    categoryPatterns: 'object',
                    interestEvolution: 'object',
                    topicCorrelations: 'object'
                },
                crossInsights: {
                    personalityVsInterests: 'object',
                    behaviorPatterns: 'object',
                    connectionDiscoveries: 'array'
                }
            },
            userConfig: {
                preferences: 'object',
                customCategories: 'array',
                templates: 'array',
                automationRules: 'array'
            }
        };

        await this.save(this.keys.schemas, defaultSchemas);
    }

    /**
     * Initialize default data structures
     */
    async initializeData() {
        // Initialize notes if not exists
        const existingNotes = await this.load(this.keys.notes);
        if (!existingNotes) {
            await this.save(this.keys.notes, []);
        }

        // Initialize AI memory if not exists
        const existingAI = await this.load(this.keys.aiMemory);
        if (!existingAI) {
            const defaultAI = {
                userVoice: {
                    languagePatterns: {},
                    emotionalBaseline: {},
                    writingStyle: {}
                },
                contentAnalysis: {
                    categoryPatterns: {},
                    interestEvolution: {},
                    topicCorrelations: {}
                },
                crossInsights: {
                    personalityVsInterests: {},
                    behaviorPatterns: {},
                    connectionDiscoveries: []
                }
            };
            await this.save(this.keys.aiMemory, defaultAI);
        }

        // Initialize user config if not exists
        const existingConfig = await this.load(this.keys.userConfig);
        if (!existingConfig) {
            const defaultConfig = {
                preferences: {
                    theme: 'auto',
                    defaultCategory: 'Misc',
                    autoConnect: true,
                    aiLearning: true
                },
                customCategories: [],
                templates: [],
                automationRules: []
            };
            await this.save(this.keys.userConfig, defaultConfig);
        }
    }

    /**
     * Load frequently accessed data into cache
     */
    loadCache() {
        // Cache schemas for validation
        const schemas = this.loadSync(this.keys.schemas);
        if (schemas) {
            this.cache.set('schemas', schemas);
        }
    }

    /**
     * Generic save operation with validation
     * @param {string} key - Storage key
     * @param {*} data - Data to save
     * @returns {Promise<boolean>} Success status
     */
    async save(key, data) {
        try {
            // Validate data if schema exists
            if (this.shouldValidate(key)) {
                const isValid = this.validateSchema(data, key);
                if (!isValid) {
                    throw new Error(`Invalid data schema for key: ${key}`);
                }
            }

            // Save to localStorage
            const serializedData = JSON.stringify(data);
            localStorage.setItem(key, serializedData);
            
            // Update cache for frequently accessed data
            if (this.shouldCache(key)) {
                this.cache.set(key, data);
            }

            return true;
        } catch (error) {
            console.error(`Save failed for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Generic load operation
     * @param {string} key - Storage key
     * @returns {Promise<*>} Loaded data or null
     */
    async load(key) {
        try {
            // Check cache first
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }

            // Load from localStorage
            const serializedData = localStorage.getItem(key);
            if (!serializedData) {
                return null;
            }

            const data = JSON.parse(serializedData);
            
            // Cache frequently accessed data
            if (this.shouldCache(key)) {
                this.cache.set(key, data);
            }

            return data;
        } catch (error) {
            console.error(`Load failed for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Synchronous load for critical operations
     * @param {string} key - Storage key
     * @returns {*} Loaded data or null
     */
    loadSync(key) {
        try {
            const serializedData = localStorage.getItem(key);
            return serializedData ? JSON.parse(serializedData) : null;
        } catch (error) {
            console.error(`Sync load failed for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Generic delete operation
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        try {
            localStorage.removeItem(key);
            this.cache.delete(key);
            return true;
        } catch (error) {
            console.error(`Delete failed for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Save a note with automatic ID generation
     * @param {Object} noteData - Note data
     * @returns {Promise<Object>} Saved note with ID
     */
    async saveNote(noteData) {
        try {
            const notes = await this.loadNotes();
            
            // Generate ID if not provided
            if (!noteData.id) {
                noteData.id = Date.now().toString();
            }

            // Set timestamps
            const now = new Date().toISOString();
            if (!noteData.timestamp) {
                noteData.timestamp = now;
            }
            noteData.lastModified = now;

            // Add default values
            const note = {
                title: '',
                content: '',
                isUserCreated: false,
                category: 'Misc',
                tags: [],
                rating: 0,
                ratingReason: '',
                sourceUrl: '',
                contentType: 'text',
                metadata: {},
                connections: [],
                aiInsights: {},
                ...noteData
            };

            // Add or update note
            const existingIndex = notes.findIndex(n => n.id === note.id);
            if (existingIndex >= 0) {
                notes[existingIndex] = note;
            } else {
                notes.push(note);
            }

            // Save updated notes array
            await this.save(this.keys.notes, notes);
            
            return note;
        } catch (error) {
            console.error('Save note failed:', error);
            throw error;
        }
    }

    /**
     * Load all notes
     * @returns {Promise<Array>} Array of notes
     */
    async loadNotes() {
        const notes = await this.load(this.keys.notes);
        return notes || [];
    }

    /**
     * Update a specific note
     * @param {string} noteId - Note ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated note
     */
    async updateNote(noteId, updates) {
        try {
            const notes = await this.loadNotes();
            const noteIndex = notes.findIndex(n => n.id === noteId);
            
            if (noteIndex === -1) {
                throw new Error(`Note not found: ${noteId}`);
            }

            // Update note
            notes[noteIndex] = {
                ...notes[noteIndex],
                ...updates,
                lastModified: new Date().toISOString()
            };

            await this.save(this.keys.notes, notes);
            return notes[noteIndex];
        } catch (error) {
            console.error('Update note failed:', error);
            throw error;
        }
    }

    /**
     * Delete a specific note
     * @param {string} noteId - Note ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteNote(noteId) {
        try {
            const notes = await this.loadNotes();
            const filteredNotes = notes.filter(n => n.id !== noteId);
            
            if (filteredNotes.length === notes.length) {
                return false; // Note not found
            }

            await this.save(this.keys.notes, filteredNotes);
            return true;
        } catch (error) {
            console.error('Delete note failed:', error);
            return false;
        }
    }

    /**
     * Get AI memory data
     * @returns {Promise<Object>} AI memory object
     */
    async getAIMemory() {
        return await this.load(this.keys.aiMemory);
    }

    /**
     * Update AI memory section
     * @param {string} section - Section to update (userVoice, contentAnalysis, crossInsights)
     * @param {Object} data - Data to merge
     * @returns {Promise<boolean>} Success status
     */
    async updateAIMemory(section, data) {
        try {
            const aiMemory = await this.getAIMemory();
            
            if (!aiMemory[section]) {
                aiMemory[section] = {};
            }

            // Deep merge the data
            aiMemory[section] = { ...aiMemory[section], ...data };
            
            return await this.save(this.keys.aiMemory, aiMemory);
        } catch (error) {
            console.error('Update AI memory failed:', error);
            return false;
        }
    }

    /**
     * Get user configuration
     * @returns {Promise<Object>} User config object
     */
    async getUserConfig() {
        return await this.load(this.keys.userConfig);
    }

    /**
     * Update user configuration
     * @param {Object} updates - Config updates to merge
     * @returns {Promise<boolean>} Success status
     */
    async updateUserConfig(updates) {
        try {
            const config = await this.getUserConfig();
            const updatedConfig = { ...config, ...updates };
            return await this.save(this.keys.userConfig, updatedConfig);
        } catch (error) {
            console.error('Update user config failed:', error);
            return false;
        }
    }

    /**
     * Export all data for backup/migration
     * @returns {Promise<Object>} Complete data export
     */
    async exportData() {
        try {
            const data = {
                version: this.version,
                exportDate: new Date().toISOString(),
                notes: await this.loadNotes(),
                aiMemory: await this.getAIMemory(),
                userConfig: await this.getUserConfig()
            };
            
            return data;
        } catch (error) {
            console.error('Export data failed:', error);
            throw error;
        }
    }

    /**
     * Import data from backup
     * @param {Object} importData - Data to import
     * @returns {Promise<boolean>} Success status
     */
    async importData(importData) {
        try {
            // Validate import data structure
            if (!importData.notes || !importData.aiMemory || !importData.userConfig) {
                throw new Error('Invalid import data structure');
            }

            // Save imported data
            await this.save(this.keys.notes, importData.notes);
            await this.save(this.keys.aiMemory, importData.aiMemory);
            await this.save(this.keys.userConfig, importData.userConfig);

            // Clear cache to force reload
            this.cache.clear();
            this.loadCache();

            return true;
        } catch (error) {
            console.error('Import data failed:', error);
            return false;
        }
    }

    /**
     * Validate data against schema
     * @param {*} data - Data to validate
     * @param {string} key - Storage key for schema lookup
     * @returns {boolean} Is valid
     */
    validateSchema(data, key) {
        try {
            const schemas = this.cache.get('schemas');
            if (!schemas) return true; // Skip validation if no schemas

            // Simplified validation - in production would use more robust schema validator
            // For now, just check basic structure
            return typeof data === 'object' && data !== null;
        } catch (error) {
            console.error('Schema validation failed:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage stats
     */
    async getStorageStats() {
        try {
            const notes = await this.loadNotes();
            const aiMemory = await this.getAIMemory();
            
            // Calculate storage usage (approximate)
            const notesSize = JSON.stringify(notes).length;
            const aiSize = JSON.stringify(aiMemory).length;
            const totalSize = notesSize + aiSize;
            
            return {
                totalNotes: notes.length,
                categoryCounts: this.getCategoryCounts(notes),
                storageSize: totalSize,
                cacheSize: this.cache.size,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Get storage stats failed:', error);
            return {};
        }
    }

    /**
     * Helper: Get category counts from notes
     * @param {Array} notes - Notes array
     * @returns {Object} Category counts
     */
    getCategoryCounts(notes) {
        return notes.reduce((counts, note) => {
            counts[note.category] = (counts[note.category] || 0) + 1;
            return counts;
        }, {});
    }

    /**
     * Helper: Should validate this key
     * @param {string} key - Storage key
     * @returns {boolean} Should validate
     */
    shouldValidate(key) {
        return key === this.keys.notes; // Only validate notes for now
    }

    /**
     * Helper: Should cache this key
     * @param {string} key - Storage key
     * @returns {boolean} Should cache
     */
    shouldCache(key) {
        return [this.keys.schemas, this.keys.userConfig].includes(key);
    }
}

// Export as module
export default StorageManager;
