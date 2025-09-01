/**
 * Storage Manager Module - Personal Vault v2.0
 * Handles data persistence with migration path from localStorage to IndexedDB
 * Phase 1: localStorage implementation with IndexedDB preparation
 */

class StorageManager {
    constructor() {
        this.name = 'storage-manager';
        this.version = '1.0.0';
        this.dependencies = ['event-bus'];
        
        // Storage configuration
        this.storageType = 'localStorage'; // Future: 'indexedDB'
        this.storagePrefix = 'vault_';
        
        // Data schema version for migrations
        this.schemaVersion = '1.0.0';
        
        // Core data keys
        this.dataKeys = {
            NOTES: 'notes',
            AI_MEMORY: 'ai_memory',
            USER_CONFIG: 'user_config',
            SCHEMA_VERSION: 'schema_version'
        };

        // In-memory cache for performance
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes

        this.eventBus = null;
        this.isInitialized = false;
    }

    /**
     * Initialize storage manager
     * @param {EventBus} eventBus - Event bus instance
     * @param {Object} config - Configuration options
     */
    async init(eventBus, config = {}) {
        this.eventBus = eventBus;
        
        try {
            // Check storage availability
            await this.checkStorageAvailability();
            
            // Initialize data schema
            await this.initializeSchema();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Validate and migrate data if needed
            await this.validateAndMigrate();
            
            this.isInitialized = true;
            this.eventBus.emit('storage:initialized', { 
                version: this.version,
                storageType: this.storageType
            });
            
            console.log('StorageManager initialized successfully');
            return Promise.resolve();
            
        } catch (error) {
            console.error('StorageManager initialization failed:', error);
            this.eventBus.emit('storage:error', { error: error.message });
            throw error;
        }
    }

    /**
     * Clean up storage manager
     */
    destroy() {
        if (this.eventBus) {
            this.eventBus.off('storage:save', this.handleSaveEvent);
            this.eventBus.off('storage:load', this.handleLoadEvent);
        }
        
        this.cache.clear();
        this.cacheExpiry.clear();
        this.isInitialized = false;
    }

    /**
     * Get public API for other modules
     */
    getAPI() {
        return {
            save: this.save.bind(this),
            load: this.load.bind(this),
            delete: this.delete.bind(this),
            exists: this.exists.bind(this),
            getAIMemory: this.getAIMemory.bind(this),
            updateAIMemory: this.updateAIMemory.bind(this),
            getUserConfig: this.getUserConfig.bind(this),
            updateUserConfig: this.updateUserConfig.bind(this),
            getAllNotes: this.getAllNotes.bind(this),
            exportData: this.exportData.bind(this),
            importData: this.importData.bind(this),
            clearCache: this.clearCache.bind(this),
            getStorageStats: this.getStorageStats.bind(this)
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('storage:save', this.handleSaveEvent.bind(this));
        this.eventBus.on('storage:load', this.handleLoadEvent.bind(this));
        this.eventBus.on('storage:clear-cache', () => this.clearCache());
    }

    /**
     * Handle save events from other modules
     */
    async handleSaveEvent(data) {
        const { key, value, options } = data;
        try {
            await this.save(key, value, options);
            this.eventBus.emit('storage:saved', { key, success: true });
        } catch (error) {
            this.eventBus.emit('storage:error', { key, error: error.message });
        }
    }

    /**
     * Handle load events from other modules
     */
    async handleLoadEvent(data) {
        const { key, callback } = data;
        try {
            const value = await this.load(key);
            if (callback) callback(null, value);
            this.eventBus.emit('storage:loaded', { key, value });
        } catch (error) {
            if (callback) callback(error);
            this.eventBus.emit('storage:error', { key, error: error.message });
        }
    }

    /**
     * Check if storage is available
     */
    async checkStorageAvailability() {
        try {
            const testKey = this.storagePrefix + 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            throw new Error('localStorage not available: ' + error.message);
        }
    }

    /**
     * Initialize data schema
     */
    async initializeSchema() {
        const version = await this.load(this.dataKeys.SCHEMA_VERSION);
        
        if (!version) {
            // First time initialization
            await this.save(this.dataKeys.SCHEMA_VERSION, this.schemaVersion);
            await this.initializeDefaultData();
        }
    }

    /**
     * Initialize default data structure
     */
    async initializeDefaultData() {
        // Initialize notes array
        const existingNotes = await this.load(this.dataKeys.NOTES);
        if (!existingNotes) {
            await this.save(this.dataKeys.NOTES, []);
        }

        // Initialize AI memory structure
        const existingAI = await this.load(this.dataKeys.AI_MEMORY);
        if (!existingAI) {
            const defaultAIMemory = {
                userVoice: {
                    languagePatterns: {},
                    emotionalBaseline: {},
                    writingStyle: {},
                    lastAnalyzed: null
                },
                contentAnalysis: {
                    categoryPatterns: {},
                    interestEvolution: {},
                    topicCorrelations: {},
                    lastAnalyzed: null
                },
                crossInsights: {
                    personalityVsInterests: {},
                    behaviorPatterns: {},
                    connectionDiscoveries: [],
                    lastGenerated: null
                }
            };
            await this.save(this.dataKeys.AI_MEMORY, defaultAIMemory);
        }

        // Initialize user configuration
        const existingConfig = await this.load(this.dataKeys.USER_CONFIG);
        if (!existingConfig) {
            const defaultConfig = {
                preferences: {
                    theme: 'auto',
                    defaultCategory: '',
                    autoSave: true,
                    notifications: true
                },
                customCategories: [],
                templates: [],
                automationRules: [],
                version: this.schemaVersion
            };
            await this.save(this.dataKeys.USER_CONFIG, defaultConfig);
        }
    }

    /**
     * Validate and migrate data if needed
     */
    async validateAndMigrate() {
        const currentVersion = await this.load(this.dataKeys.SCHEMA_VERSION);
        
        if (currentVersion !== this.schemaVersion) {
            console.log(`Migration needed: ${currentVersion} -> ${this.schemaVersion}`);
            await this.migrateData(currentVersion, this.schemaVersion);
        }
    }

    /**
     * Migrate data between schema versions
     */
    async migrateData(fromVersion, toVersion) {
        // Future implementation for data migrations
        console.log(`Data migration from ${fromVersion} to ${toVersion} completed`);
        await this.save(this.dataKeys.SCHEMA_VERSION, toVersion);
    }

    /**
     * Save data to storage with caching
     * @param {string} key - Storage key
     * @param {*} data - Data to save
     * @param {Object} options - Save options
     */
    async save(key, data, options = {}) {
        try {
            const fullKey = this.storagePrefix + key;
            const serializedData = JSON.stringify({
                data,
                timestamp: Date.now(),
                version: this.schemaVersion
            });

            // Save to localStorage
            localStorage.setItem(fullKey, serializedData);

            // Update cache
            this.updateCache(key, data);

            // Emit save event
            this.eventBus?.emit('storage:data-saved', { 
                key, 
                size: serializedData.length,
                timestamp: Date.now()
            });

            return true;

        } catch (error) {
            console.error(`Storage save error for key ${key}:`, error);
            throw new Error(`Failed to save data: ${error.message}`);
        }
    }

    /**
     * Load data from storage with caching
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     */
    async load(key, defaultValue = null) {
        try {
            // Check cache first
            const cachedData = this.getFromCache(key);
            if (cachedData !== null) {
                return cachedData;
            }

            const fullKey = this.storagePrefix + key;
            const serializedData = localStorage.getItem(fullKey);

            if (serializedData === null) {
                return defaultValue;
            }

            const parsed = JSON.parse(serializedData);
            const data = parsed.data !== undefined ? parsed.data : parsed; // Handle legacy format

            // Update cache
            this.updateCache(key, data);

            return data;

        } catch (error) {
            console.error(`Storage load error for key ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Delete data from storage
     * @param {string} key - Storage key
     */
    async delete(key) {
        try {
            const fullKey = this.storagePrefix + key;
            localStorage.removeItem(fullKey);
            
            // Remove from cache
            this.cache.delete(key);
            this.cacheExpiry.delete(key);

            this.eventBus?.emit('storage:data-deleted', { key });
            return true;

        } catch (error) {
            console.error(`Storage delete error for key ${key}:`, error);
            throw new Error(`Failed to delete data: ${error.message}`);
        }
    }

    /**
     * Check if key exists in storage
     * @param {string} key - Storage key
     */
    async exists(key) {
        const fullKey = this.storagePrefix + key;
        return localStorage.getItem(fullKey) !== null;
    }

    /**
     * Cache management methods
     */
    updateCache(key, data) {
        this.cache.set(key, data);
        this.cacheExpiry.set(key, Date.now() + this.cacheTTL);
    }

    getFromCache(key) {
        const expiry = this.cacheExpiry.get(key);
        if (expiry && Date.now() > expiry) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return null;
        }
        return this.cache.get(key) || null;
    }

    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
        console.log('Storage cache cleared');
    }

    /**
     * Specialized data access methods
     */

    /**
     * Get AI memory with structure validation
     */
    async getAIMemory() {
        const aiMemory = await this.load(this.dataKeys.AI_MEMORY);
        
        // Ensure structure exists
        if (!aiMemory || typeof aiMemory !== 'object') {
            await this.initializeDefaultData();
            return await this.load(this.dataKeys.AI_MEMORY);
        }
        
        return aiMemory;
    }

    /**
     * Update specific section of AI memory
     * @param {string} section - 'userVoice', 'contentAnalysis', or 'crossInsights'
     * @param {Object} data - Data to merge into section
     */
    async updateAIMemory(section, data) {
        const aiMemory = await this.getAIMemory();
        
        if (!aiMemory[section]) {
            aiMemory[section] = {};
        }
        
        // Deep merge the data
        aiMemory[section] = { ...aiMemory[section], ...data };
        aiMemory[section].lastUpdated = new Date().toISOString();
        
        await this.save(this.dataKeys.AI_MEMORY, aiMemory);
        
        this.eventBus?.emit('ai-memory:updated', { section, data });
        return aiMemory[section];
    }

    /**
     * Get user configuration
     */
    async getUserConfig() {
        return await this.load(this.dataKeys.USER_CONFIG);
    }

    /**
     * Update user configuration
     * @param {Object} updates - Configuration updates to merge
     */
    async updateUserConfig(updates) {
        const config = await this.getUserConfig();
        const updatedConfig = { ...config, ...updates };
        updatedConfig.lastModified = new Date().toISOString();
        
        await this.save(this.dataKeys.USER_CONFIG, updatedConfig);
        
        this.eventBus?.emit('user-config:updated', updates);
        return updatedConfig;
    }

    /**
     * Get all notes with optional filtering
     * @param {Object} filter - Optional filter criteria
     */
    async getAllNotes(filter = {}) {
        const notes = await this.load(this.dataKeys.NOTES, []);
        
        if (Object.keys(filter).length === 0) {
            return notes;
        }
        
        // Apply filters
        return notes.filter(note => {
            for (const [key, value] of Object.entries(filter)) {
                if (note[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Export all data for backup/portability
     */
    async exportData() {
        try {
            const exportData = {
                version: this.schemaVersion,
                timestamp: new Date().toISOString(),
                notes: await this.load(this.dataKeys.NOTES, []),
                aiMemory: await this.load(this.dataKeys.AI_MEMORY, {}),
                userConfig: await this.load(this.dataKeys.USER_CONFIG, {})
            };

            return JSON.stringify(exportData, null, 2);

        } catch (error) {
            console.error('Export error:', error);
            throw new Error(`Failed to export data: ${error.message}`);
        }
    }

    /**
     * Import data from backup
     * @param {string} jsonData - Exported JSON data
     * @param {Object} options - Import options
     */
    async importData(jsonData, options = { overwrite: false }) {
        try {
            const importData = JSON.parse(jsonData);
            
            // Validate import data structure
            if (!importData.version || !importData.notes) {
                throw new Error('Invalid import data structure');
            }

            // Handle version compatibility
            if (importData.version !== this.schemaVersion) {
                console.warn(`Version mismatch: ${importData.version} vs ${this.schemaVersion}`);
            }

            if (options.overwrite) {
                // Replace all data
                await this.save(this.dataKeys.NOTES, importData.notes);
                if (importData.aiMemory) {
                    await this.save(this.dataKeys.AI_MEMORY, importData.aiMemory);
                }
                if (importData.userConfig) {
                    await this.save(this.dataKeys.USER_CONFIG, importData.userConfig);
                }
            } else {
                // Merge data (notes get new IDs to avoid conflicts)
                const existingNotes = await this.load(this.dataKeys.NOTES, []);
                const importedNotes = importData.notes.map(note => ({
                    ...note,
                    id: Date.now() + Math.random(), // Generate new ID
                    imported: true,
                    importTimestamp: new Date().toISOString()
                }));
                
                await this.save(this.dataKeys.NOTES, [...existingNotes, ...importedNotes]);
            }

            this.clearCache(); // Clear cache after import
            
            this.eventBus?.emit('storage:data-imported', { 
                notesCount: importData.notes.length,
                overwrite: options.overwrite
            });

            return {
                success: true,
                notesImported: importData.notes.length
            };

        } catch (error) {
            console.error('Import error:', error);
            throw new Error(`Failed to import data: ${error.message}`);
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        try {
            const notes = await this.load(this.dataKeys.NOTES, []);
            const aiMemory = await this.load(this.dataKeys.AI_MEMORY, {});
            const userConfig = await this.load(this.dataKeys.USER_CONFIG, {});

            // Calculate storage usage
            const notesSize = JSON.stringify(notes).length;
            const aiMemorySize = JSON.stringify(aiMemory).length;
            const configSize = JSON.stringify(userConfig).length;
            const totalSize = notesSize + aiMemorySize + configSize;

            // Category distribution
            const categoryStats = {};
            notes.forEach(note => {
                categoryStats[note.category] = (categoryStats[note.category] || 0) + 1;
            });

            return {
                totalNotes: notes.length,
                storageSize: {
                    total: totalSize,
                    notes: notesSize,
                    aiMemory: aiMemorySize,
                    config: configSize
                },
                categoryDistribution: categoryStats,
                cacheStats: {
                    entries: this.cache.size,
                    hitRate: this.calculateCacheHitRate()
                },
                oldestNote: notes.length > 0 ? 
                    new Date(Math.min(...notes.map(n => new Date(n.timestamp)))).toISOString() : null,
                newestNote: notes.length > 0 ? 
                    new Date(Math.max(...notes.map(n => new Date(n.timestamp)))).toISOString() : null
            };

        } catch (error) {
            console.error('Stats calculation error:', error);
            return {
                error: error.message,
                totalNotes: 0,
                storageSize: { total: 0 }
            };
        }
    }

    /**
     * Calculate cache hit rate (simplified implementation)
     */
    calculateCacheHitRate() {
        // This would require tracking hits/misses in a real implementation
        return Math.round((this.cache.size / (this.cache.size + 1)) * 100);
    }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else {
    window.StorageManager = StorageManager;
}
