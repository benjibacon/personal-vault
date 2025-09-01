/**
 * Module Loader - Personal Vault v2.0
 * Dynamic module loading and dependency management
 * Target: 200 lines max
 */

class ModuleLoader {
    constructor() {
        this.version = '1.0.0';
        this.name = 'module-loader';
        this.dependencies = [];
        
        // Module registry and cache
        this.moduleCache = new Map();
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        
        // Configuration
        this.config = {
            basePath: './modules/',
            timeout: 10000,
            retries: 3
        };
    }

    /**
     * Initialize module loader
     * @param {Object} core - Core vault instance
     * @param {Object} config - Configuration
     * @returns {Promise<void>}
     */
    async init(core, config = {}) {
        try {
            this.core = core;
            this.config = { ...this.config, ...config };
            
            console.log('Module Loader initialized');
            return Promise.resolve();
        } catch (error) {
            console.error('Module Loader initialization failed:', error);
            throw error;
        }
    }

    /**
     * Clean up module loader
     */
    destroy() {
        this.moduleCache.clear();
        this.loadedModules.clear();
        this.loadingPromises.clear();
    }

    /**
     * Get public API
     * @returns {Object} Public API
     */
    getAPI() {
        return {
            loadModule: this.loadModule.bind(this),
            unloadModule: this.unloadModule.bind(this),
            loadModules: this.loadModules.bind(this),
            isModuleLoaded: this.isModuleLoaded.bind(this),
            getLoadedModules: this.getLoadedModules.bind(this),
            preloadModule: this.preloadModule.bind(this)
        };
    }

    /**
     * Handle events from event bus
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     */
    handleEvent(eventType, data) {
        switch (eventType) {
            case 'modules:load':
                this.loadModules(data.modules);
                break;
            case 'modules:unload':
                this.unloadModule(data.moduleName);
                break;
            case 'core:shutdown':
                this.unloadAllModules();
                break;
            default:
                // Ignore unknown events
                break;
        }
    }

    /**
     * Load a single module
     * @param {string} moduleName - Module name (e.g., 'dual-ai/user-voice-ai')
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loaded module instance
     */
    async loadModule(moduleName, options = {}) {
        try {
            // Check if already loaded
            if (this.loadedModules.has(moduleName)) {
                return this.loadedModules.get(moduleName);
            }

            // Check if currently loading (prevent duplicate loads)
            if (this.loadingPromises.has(moduleName)) {
                return await this.loadingPromises.get(moduleName);
            }

            console.log(`Loading module: ${moduleName}`);

            // Create loading promise
            const loadingPromise = this._doLoadModule(moduleName, options);
            this.loadingPromises.set(moduleName, loadingPromise);

            try {
                const module = await loadingPromise;
                this.loadedModules.set(moduleName, module);
                return module;
            } finally {
                this.loadingPromises.delete(moduleName);
            }
        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
            throw error;
        }
    }

    /**
     * Internal module loading implementation
     * @param {string} moduleName - Module name
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Module instance
     */
    async _doLoadModule(moduleName, options = {}) {
        const startTime = Date.now();
        
        try {
            // Get module from cache or load from file
            let ModuleClass;
            
            if (this.moduleCache.has(moduleName)) {
                ModuleClass = this.moduleCache.get(moduleName);
            } else {
                ModuleClass = await this._loadModuleFile(moduleName, options);
                this.moduleCache.set(moduleName, ModuleClass);
            }

            // Create module instance
            const moduleInstance = new ModuleClass();
            
            // Validate module interface
            if (!this._validateModuleInterface(moduleInstance)) {
                throw new Error(`Invalid module interface: ${moduleName}`);
            }

            // Load dependencies first
            await this._loadDependencies(moduleInstance);

            // Register with core
            if (this.core) {
                await this.core.registerModule(moduleName, moduleInstance);
            }

            const loadTime = Date.now() - startTime;
            console.log(`Module ${moduleName} loaded in ${loadTime}ms`);
            
            return moduleInstance;
        } catch (error) {
            console.error(`Module loading failed for ${moduleName}:`, error);
            throw error;
        }
    }

    /**
     * Load module file (simulated for now)
     * @param {string} moduleName - Module name
     * @param {Object} options - Loading options
     * @returns {Promise<Function>} Module class
     */
    async _loadModuleFile(moduleName, options = {}) {
        try {
            // In a real implementation, this would use dynamic imports
            // For now, we'll simulate with a factory pattern
            
            const modulePath = this.config.basePath + moduleName + '.js';
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // For now, return mock modules based on known module names
            return this._getMockModule(moduleName);
        } catch (error) {
            throw new Error(`Failed to load module file: ${moduleName}`);
        }
    }

    /**
     * Get mock module for development/testing
     * @param {string} moduleName - Module name
     * @returns {Function} Mock module class
     */
    _getMockModule(moduleName) {
        // This is a temporary implementation for development
        // In production, actual module files would be loaded
        
        class MockModule {
            constructor() {
                this.name = moduleName;
                this.version = '1.0.0';
                this.dependencies = [];
            }

            async init(core, config) {
                console.log(`Mock module ${this.name} initialized`);
                return Promise.resolve();
            }

            destroy() {
                console.log(`Mock module ${this.name} destroyed`);
            }

            getAPI() {
                return {
                    getName: () => this.name,
                    getVersion: () => this.version
                };
            }

            handleEvent(eventType, data) {
                // Mock event handling
            }
        }

        return MockModule;
    }

    /**
     * Load module dependencies
     * @param {Object} moduleInstance - Module instance
     * @returns {Promise<void>}
     */
    async _loadDependencies(moduleInstance) {
        if (!moduleInstance.dependencies || !Array.isArray(moduleInstance.dependencies)) {
            return;
        }

        for (const dependency of moduleInstance.dependencies) {
            if (dependency !== 'core' && !this.isModuleLoaded(dependency)) {
                await this.loadModule(dependency);
            }
        }
    }

    /**
     * Validate module interface
     * @param {Object} moduleInstance - Module instance
     * @returns {boolean} Is valid
     */
    _validateModuleInterface(moduleInstance) {
        const required = ['name', 'version', 'init', 'getAPI'];
        
        for (const prop of required) {
            if (!(prop in moduleInstance)) {
                console.error(`Module missing required property: ${prop}`);
                return false;
            }
        }

        if (typeof moduleInstance.init !== 'function' || 
            typeof moduleInstance.getAPI !== 'function') {
            return false;
        }

        return true;
    }

    /**
     * Unload a module
     * @param {string} moduleName - Module name
     * @returns {Promise<boolean>} Success status
     */
    async unloadModule(moduleName) {
        try {
            const module = this.loadedModules.get(moduleName);
            
            if (!module) {
                return false;
            }

            // Unregister from core
            if (this.core) {
                await this.core.unregisterModule(moduleName);
            }

            // Destroy module
            if (module.destroy) {
                await module.destroy();
            }

            // Remove from loaded modules
            this.loadedModules.delete(moduleName);
            
            console.log(`Module unloaded: ${moduleName}`);
            return true;
        } catch (error) {
            console.error(`Failed to unload module ${moduleName}:`, error);
            return false;
        }
    }

    /**
     * Load multiple modules
     * @param {Array<string>} moduleNames - Array of module names
     * @param {Object} options - Loading options
     * @returns {Promise<Array>} Array of loaded modules
     */
    async loadModules(moduleNames, options = {}) {
        const results = [];
        
        for (const moduleName of moduleNames) {
            try {
                const module = await this.loadModule(moduleName, options);
                results.push({ name: moduleName, module, success: true });
            } catch (error) {
                results.push({ name: moduleName, error: error.message, success: false });
                
                if (options.failFast) {
                    throw error;
                }
            }
        }
        
        return results;
    }

    /**
     * Unload all modules
     * @returns {Promise<void>}
     */
    async unloadAllModules() {
        const moduleNames = Array.from(this.loadedModules.keys());
        
        for (const moduleName of moduleNames) {
            await this.unloadModule(moduleName);
        }
    }

    /**
     * Check if module is loaded
     * @param {string} moduleName - Module name
     * @returns {boolean} Is loaded
     */
    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    /**
     * Get list of loaded modules
     * @returns {Array<string>} Module names
     */
    getLoadedModules() {
        return Array.from(this.loadedModules.keys());
    }

    /**
     * Preload a module (load but don't initialize)
     * @param {string} moduleName - Module name
     * @returns {Promise<boolean>} Success status
     */
    async preloadModule(moduleName) {
        try {
            if (!this.moduleCache.has(moduleName)) {
                const ModuleClass = await this._loadModuleFile(moduleName);
                this.moduleCache.set(moduleName, ModuleClass);
            }
            return true;
        } catch (error) {
            console.error(`Failed to preload module ${moduleName}:`, error);
            return false;
        }
    }

    /**
     * Get module loading statistics
     * @returns {Object} Loading stats
     */
    getLoadingStats() {
        return {
            cachedModules: this.moduleCache.size,
            loadedModules: this.loadedModules.size,
            currentlyLoading: this.loadingPromises.size,
            moduleNames: this.getLoadedModules()
        };
    }

    /**
     * Clear module cache
     */
    clearCache() {
        this.moduleCache.clear();
        console.log('Module cache cleared');
    }

    /**
     * Reload a module
     * @param {string} moduleName - Module name
     * @returns {Promise<Object>} Reloaded module
     */
    async reloadModule(moduleName) {
        try {
            // Unload current module
            await this.unloadModule(moduleName);
            
            // Clear from cache
            this.moduleCache.delete(moduleName);
            
            // Load fresh module
            return await this.loadModule(moduleName);
        } catch (error) {
            console.error(`Failed to reload module ${moduleName}:`, error);
            throw error;
        }
    }
}

// Export as module
export default ModuleLoader;
