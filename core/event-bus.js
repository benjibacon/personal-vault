/**
 * Event Bus - Core Communication System for Personal Vault v2.0
 * 
 * Central nervous system for module communication using publish/subscribe pattern.
 * Enables loose coupling between modules while maintaining type safety and debugging.
 * 
 * @version 1.0.0
 * @author Personal Vault v2.0
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.debugMode = false;
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.wildcardListeners = new Set();
        
        // Performance monitoring
        this.stats = {
            totalEvents: 0,
            totalListeners: 0,
            slowEvents: []
        };
        
        this.init();
    }

    /**
     * Initialize the event bus with error handling and debugging
     */
    init() {
        // Enable debug mode in development
        this.debugMode = this.isDevMode();
        
        // Global error handler for event processing
        window.addEventListener('error', (event) => {
            this.emit('system:error', {
                type: 'global',
                error: event.error,
                message: event.message,
                filename: event.filename,
                lineno: event.lineno
            });
        });

        if (this.debugMode) {
            console.log('🚌 Event Bus initialized in debug mode');
        }
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - Event name (supports wildcards with *)
     * @param {Function} callback - Event handler
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    on(eventType, callback, options = {}) {
        if (typeof eventType !== 'string' || typeof callback !== 'function') {
            throw new Error('EventBus.on: eventType must be string, callback must be function');
        }

        const config = {
            once: options.once || false,
            priority: options.priority || 0,
            module: options.module || 'unknown',
            id: this.generateListenerId()
        };

        // Handle wildcard subscriptions
        if (eventType.includes('*')) {
            this.wildcardListeners.add({
                pattern: eventType,
                callback,
                config
            });
        } else {
            // Regular event subscription
            if (!this.events.has(eventType)) {
                this.events.set(eventType, []);
            }

            const listener = { callback, config };
            const listeners = this.events.get(eventType);
            
            // Insert based on priority (higher priority first)
            const insertIndex = listeners.findIndex(l => l.config.priority < config.priority);
            if (insertIndex === -1) {
                listeners.push(listener);
            } else {
                listeners.splice(insertIndex, 0, listener);
            }
        }

        this.stats.totalListeners++;

        if (this.debugMode) {
            console.log(`📝 Event listener added: ${eventType} (${config.module})`);
        }

        // Return unsubscribe function
        return () => this.off(eventType, callback);
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first trigger)
     * @param {string} eventType - Event name
     * @param {Function} callback - Event handler
     * @param {Object} options - Additional options
     * @returns {Function} Unsubscribe function
     */
    once(eventType, callback, options = {}) {
        return this.on(eventType, callback, { ...options, once: true });
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventType - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(eventType, callback) {
        if (eventType.includes('*')) {
            // Remove wildcard listener
            this.wildcardListeners = new Set(
                [...this.wildcardListeners].filter(
                    listener => !(listener.pattern === eventType && listener.callback === callback)
                )
            );
        } else {
            // Remove regular listener
            const listeners = this.events.get(eventType);
            if (listeners) {
                const filteredListeners = listeners.filter(l => l.callback !== callback);
                if (filteredListeners.length === 0) {
                    this.events.delete(eventType);
                } else {
                    this.events.set(eventType, filteredListeners);
                }
            }
        }

        this.stats.totalListeners = Math.max(0, this.stats.totalListeners - 1);

        if (this.debugMode) {
            console.log(`🗑️ Event listener removed: ${eventType}`);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventType - Event name
     * @param {any} data - Event data
     * @param {Object} options - Emit options
     * @returns {Promise<Array>} Results from all handlers
     */
    async emit(eventType, data = null, options = {}) {
        const startTime = performance.now();
        const eventId = this.generateEventId();
        
        const eventData = {
            type: eventType,
            data,
            timestamp: Date.now(),
            id: eventId,
            source: options.source || 'unknown'
        };

        // Add to history
        this.eventHistory.push(eventData);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }

        this.stats.totalEvents++;

        if (this.debugMode) {
            console.log(`📢 Event emitted: ${eventType}`, data);
        }

        const results = [];
        const errors = [];

        try {
            // Process regular listeners
            const listeners = this.events.get(eventType) || [];
            const listenersToRemove = [];

            for (const listener of listeners) {
                try {
                    const result = await this.executeListener(listener, eventData);
                    results.push(result);

                    // Remove one-time listeners
                    if (listener.config.once) {
                        listenersToRemove.push(listener);
                    }
                } catch (error) {
                    errors.push({
                        listener: listener.config,
                        error,
                        eventType,
                        eventId
                    });
                    
                    if (this.debugMode) {
                        console.error(`❌ Error in event listener for ${eventType}:`, error);
                    }
                }
            }

            // Remove one-time listeners
            if (listenersToRemove.length > 0) {
                const remainingListeners = listeners.filter(l => !listenersToRemove.includes(l));
                if (remainingListeners.length === 0) {
                    this.events.delete(eventType);
                } else {
                    this.events.set(eventType, remainingListeners);
                }
            }

            // Process wildcard listeners
            for (const wildcardListener of this.wildcardListeners) {
                if (this.matchesWildcard(eventType, wildcardListener.pattern)) {
                    try {
                        const result = await this.executeListener(wildcardListener, eventData);
                        results.push(result);
                    } catch (error) {
                        errors.push({
                            listener: wildcardListener.config,
                            error,
                            eventType,
                            eventId
                        });
                    }
                }
            }

            // Performance monitoring
            const duration = performance.now() - startTime;
            if (duration > 10) { // Log slow events (>10ms)
                this.stats.slowEvents.push({
                    eventType,
                    duration,
                    timestamp: Date.now(),
                    listenerCount: listeners.length
                });
                
                // Keep only recent slow events
                if (this.stats.slowEvents.length > 20) {
                    this.stats.slowEvents.shift();
                }
            }

            // Emit errors as system events if any occurred
            if (errors.length > 0) {
                // Prevent infinite recursion by not emitting error events for system:error
                if (eventType !== 'system:error') {
                    this.emit('system:error', {
                        type: 'listener',
                        originalEvent: eventType,
                        errors,
                        eventId
                    });
                }
            }

        } catch (error) {
            if (this.debugMode) {
                console.error(`💥 Critical error emitting event ${eventType}:`, error);
            }
            
            // Try to emit system error (with recursion protection)
            if (eventType !== 'system:error') {
                setTimeout(() => {
                    this.emit('system:error', {
                        type: 'critical',
                        originalEvent: eventType,
                        error: error.message,
                        eventId
                    });
                }, 0);
            }
            
            throw error;
        }

        return results;
    }

    /**
     * Execute a listener with proper error handling
     * @private
     */
    async executeListener(listener, eventData) {
        const callback = listener.callback || listener;
        
        if (typeof callback !== 'function') {
            throw new Error('Listener callback is not a function');
        }

        // Support both sync and async callbacks
        const result = callback(eventData.data, eventData);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
            return await result;
        }
        
        return result;
    }

    /**
     * Check if event type matches wildcard pattern
     * @private
     */
    matchesWildcard(eventType, pattern) {
        const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*') + '$'
        );
        return regex.test(eventType);
    }

    /**
     * Remove all listeners for an event type
     * @param {string} eventType - Event name
     */
    removeAllListeners(eventType) {
        if (eventType) {
            this.events.delete(eventType);
            
            // Remove matching wildcard listeners
            this.wildcardListeners = new Set(
                [...this.wildcardListeners].filter(
                    listener => listener.pattern !== eventType
                )
            );
        } else {
            // Remove all listeners
            this.events.clear();
            this.wildcardListeners.clear();
        }

        if (this.debugMode) {
            console.log(`🧹 Removed all listeners for: ${eventType || 'ALL EVENTS'}`);
        }
    }

    /**
     * Get current event statistics
     * @returns {Object} Event bus statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeListeners: this.stats.totalListeners,
            activeEvents: this.events.size,
            wildcardListeners: this.wildcardListeners.size,
            historySize: this.eventHistory.length
        };
    }

    /**
     * Get recent event history
     * @param {number} limit - Number of recent events to return
     * @returns {Array} Recent events
     */
    getHistory(limit = 10) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Debug mode state
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🔧 Event Bus debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
        this.stats.slowEvents = [];
    }

    /**
     * Generate unique listener ID
     * @private
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique event ID
     * @private
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Detect development mode
     * @private
     */
    isDevMode() {
        return (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:' ||
            window.location.search.includes('debug=true')
        );
    }

    /**
     * Destroy the event bus and clean up
     */
    destroy() {
        this.removeAllListeners();
        this.clearHistory();
        
        if (this.debugMode) {
            console.log('🚌 Event Bus destroyed');
        }
    }
}

// Create singleton instance
const eventBus = new EventBus();

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = eventBus;
} else if (typeof window !== 'undefined') {
    window.EventBus = eventBus;
}

// Standard events that modules can use
const STANDARD_EVENTS = {
    // System events
    SYSTEM_READY: 'system:ready',
    SYSTEM_ERROR: 'system:error',
    MODULE_LOADED: 'module:loaded',
    MODULE_UNLOADED: 'module:unloaded',
    
    // Data events
    NOTE_CREATED: 'data:note:created',
    NOTE_UPDATED: 'data:note:updated',
    NOTE_DELETED: 'data:note:deleted',
    DATA_IMPORTED: 'data:imported',
    DATA_EXPORTED: 'data:exported',
    
    // UI events
    UI_MODAL_OPEN: 'ui:modal:open',
    UI_MODAL_CLOSE: 'ui:modal:close',
    UI_SEARCH: 'ui:search',
    UI_FILTER: 'ui:filter',
    
    // AI events
    AI_CATEGORIZED: 'ai:categorized',
    AI_TAGGED: 'ai:tagged',
    AI_CONNECTED: 'ai:connected',
    AI_INSIGHT: 'ai:insight',
    
    // User events
    USER_ACTION: 'user:action',
    USER_FEEDBACK: 'user:feedback'
};

// Expose standard events
if (typeof window !== 'undefined') {
    window.EVENTS = STANDARD_EVENTS;
}
