/**
 * Note Components Module
 * Reusable note display components with dual AI support
 * Phase 2: UI Framework
 */

class NoteComponents {
    constructor() {
        this.name = 'note-components';
        this.version = '1.0.0';
        this.dependencies = ['core', 'event-bus'];
        
        this.eventBus = null;
        this.core = null;
        this.templates = new Map();
        
        this.init();
    }

    async init(core, config = {}) {
        this.core = core;
        this.eventBus = core?.eventBus;
        
        this.setupTemplates();
        this.setupEventListeners();
        
        return Promise.resolve();
    }

    setupTemplates() {
        // Note card template
        this.templates.set('noteCard', {
            html: `
                <div class="note-card" data-id="{{id}}" data-category="{{category}}">
                    <div class="note-header">
                        <h3 class="note-title">{{title}}</h3>
                        <div class="note-badges">
                            {{#isUserCreated}}
                            <span class="user-badge">👤 Mine</span>
                            {{/isUserCreated}}
                            <span class="category-badge {{categoryClass}}">{{category}}</span>
                            {{#rating}}
                            <div class="rating-display">{{ratingStars}}</div>
                            {{/rating}}
                        </div>
                    </div>
                    
                    <div class="note-content">
                        {{#contentType.image}}
                        <img src="{{imageData.dataUrl}}" alt="Note image" class="note-image">
                        {{/contentType.image}}
                        
                        {{#contentType.web}}
                        <div class="web-source">
                            <a href="{{sourceUrl}}" target="_blank" class="source-link">
                                🔗 {{sourceTitle}}
                            </a>
                        </div>
                        {{/contentType.web}}
                        
                        <div class="content-preview">{{contentPreview}}</div>
                    </div>
                    
                    <div class="note-footer">
                        <div class="note-meta">
                            <span class="timestamp">{{formattedDate}}</span>
                            {{#connections.length}}
                            <span class="connections">🔗 {{connections.length}}</span>
                            {{/connections.length}}
                        </div>
                        
                        <div class="note-actions">
                            <button class="btn-icon" data-action="view" title="View">👁️</button>
                            <button class="btn-icon" data-action="edit" title="Edit">✏️</button>
                            <button class="btn-icon" data-action="delete" title="Delete">🗑️</button>
                        </div>
                    </div>
                    
                    {{#tags.length}}
                    <div class="note-tags">
                        {{#tags}}
                        <span class="tag-item">{{.}}</span>
                        {{/tags}}
                    </div>
                    {{/tags.length}}
                    
                    {{#aiInsights}}
                    <div class="ai-insights">
                        <div class="insight-toggle">🧠 AI Insights</div>
                        <div class="insight-content">
                            {{#userVoiceInsights}}
                            <div class="voice-insight">
                                <strong>Writing Pattern:</strong> {{.}}
                            </div>
                            {{/userVoiceInsights}}
                            {{#contentInsights}}
                            <div class="content-insight">
                                <strong>Content Analysis:</strong> {{.}}
                            </div>
                            {{/contentInsights}}
                        </div>
                    </div>
                    {{/aiInsights}}
                </div>
            `,
            css: `
                .note-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    border-left: 4px solid var(--category-color);
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                
                .note-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }
                
                .note-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                }
                
                .note-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                    margin: 0;
                    flex: 1;
                }
                
                .note-badges {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                
                .user-badge {
                    background: #e8f5e8;
                    color: #2e7d32;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .category-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .rating-display {
                    color: #ffa726;
                    font-size: 14px;
                }
                
                .note-content {
                    margin-bottom: 15px;
                }
                
                .note-image {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                    margin-bottom: 10px;
                }
                
                .web-source {
                    margin-bottom: 10px;
                }
                
                .source-link {
                    color: #2196F3;
                    text-decoration: none;
                    font-size: 14px;
                }
                
                .content-preview {
                    color: #666;
                    line-height: 1.5;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .note-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                    color: #999;
                    margin-bottom: 10px;
                }
                
                .note-actions {
                    display: flex;
                    gap: 8px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .note-card:hover .note-actions {
                    opacity: 1;
                }
                
                .btn-icon {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    font-size: 14px;
                }
                
                .btn-icon:hover {
                    background: #f5f5f5;
                }
                
                .note-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-bottom: 10px;
                }
                
                .tag-item {
                    background: #e1f5fe;
                    color: #0277bd;
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                }
                
                .ai-insights {
                    border-top: 1px solid #eee;
                    padding-top: 15px;
                }
                
                .insight-toggle {
                    cursor: pointer;
                    color: #2196F3;
                    font-size: 13px;
                    font-weight: 500;
                }
                
                .insight-content {
                    margin-top: 10px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    display: none;
                    font-size: 12px;
                }
                
                .voice-insight, .content-insight {
                    margin: 5px 0;
                    color: #666;
                }
            `
        });

        // Note list template
        this.templates.set('noteList', {
            html: `
                <div class="notes-container" id="notesContainer">
                    {{#hasNotes}}
                    <div class="notes-grid">
                        {{#notes}}
                        {{{noteCard}}}
                        {{/notes}}
                    </div>
                    {{/hasNotes}}
                    
                    {{^hasNotes}}
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <h2>{{emptyTitle}}</h2>
                        <p>{{emptyMessage}}</p>
                    </div>
                    {{/hasNotes}}
                </div>
            `,
            css: `
                .notes-container {
                    width: 100%;
                }
                
                .notes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 20px;
                    padding: 20px 0;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #999;
                }
                
                .empty-icon {
                    font-size: 48px;
                    margin-bottom: 20px;
                }
                
                @media (max-width: 768px) {
                    .notes-grid {
                        grid-template-columns: 1fr;
                        gap: 15px;
                    }
                }
            `
        });

        // Connection display template
        this.templates.set('connectionList', {
            html: `
                <div class="connections-display">
                    <h4>🔗 Related Notes</h4>
                    {{#connections}}
                    <div class="connection-item" data-id="{{id}}">
                        <span class="connection-title">{{title}}</span>
                        <span class="connection-meta">{{category}} • {{date}}</span>
                    </div>
                    {{/connections}}
                    
                    {{^connections}}
                    <p class="no-connections">No related notes found</p>
                    {{/connections}}
                </div>
            `,
            css: `
                .connections-display {
                    margin: 20px 0;
                }
                
                .connection-item {
                    padding: 10px;
                    border: 1px solid #eee;
                    border-radius: 6px;
                    margin: 8px 0;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .connection-item:hover {
                    background: #f5f5f5;
                }
                
                .connection-title {
                    font-weight: 500;
                    display: block;
                }
                
                .connection-meta {
                    font-size: 12px;
                    color: #666;
                }
                
                .no-connections {
                    color: #999;
                    font-style: italic;
                }
            `
        });
    }

    setupEventListeners() {
        if (!this.eventBus) return;

        // Listen for note display events
        this.eventBus.on('notes:display', (data) => {
            this.displayNotes(data.notes, data.container, data.options);
        });

        // Listen for note updates
        this.eventBus.on('notes:updated', (data) => {
            this.refreshNote(data.noteId);
        });

        // Handle note card interactions
        document.addEventListener('click', (e) => {
            this.handleNoteCardClick(e);
        });
    }

    /**
     * Display array of notes in specified container
     */
    displayNotes(notes, containerId = 'notesContainer', options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const processedNotes = notes.map(note => this.processNoteForDisplay(note));
        
        const templateData = {
            hasNotes: notes.length > 0,
            notes: processedNotes.map(note => ({ 
                noteCard: this.renderNoteCard(note) 
            })),
            emptyTitle: options.emptyTitle || 'No notes yet',
            emptyMessage: options.emptyMessage || 'Click the + button to add your first note!'
        };

        const html = this.renderTemplate('noteList', templateData);
        container.innerHTML = html;

        // Apply CSS if not already applied
        this.applyCSSIfNeeded();

        // Emit display complete event
        this.eventBus?.emit('notes:displayed', { count: notes.length, containerId });
    }

    /**
     * Render single note card
     */
    renderNoteCard(note) {
        const templateData = this.processNoteForDisplay(note);
        return this.renderTemplate('noteCard', templateData);
    }

    /**
     * Process note data for template rendering
     */
    processNoteForDisplay(note) {
        const categoryClass = this.getCategoryClass(note.category);
        const ratingStars = note.rating ? '★'.repeat(note.rating) + '☆'.repeat(5 - note.rating) : '';
        const contentPreview = this.createContentPreview(note.content, 150);
        const formattedDate = this.formatDate(note.timestamp);

        return {
            ...note,
            categoryClass,
            ratingStars,
            contentPreview,
            formattedDate,
            contentType: {
                image: note.contentType === 'image',
                web: note.contentType === 'web',
                text: note.contentType === 'text'
            },
            sourceTitle: this.extractSourceTitle(note.sourceUrl),
            aiInsights: this.formatAIInsights(note.aiInsights)
        };
    }

    /**
     * Get CSS class for category
     */
    getCategoryClass(category) {
        const classMap = {
            'Recipes': 'recipes',
            'Coding': 'coding', 
            'Music': 'music',
            'Games': 'games',
            'Hobbies': 'hobbies',
            'Learning': 'learning',
            'Misc': 'misc'
        };
        return classMap[category] || 'misc';
    }

    /**
     * Create content preview with ellipsis
     */
    createContentPreview(content, maxLength = 150) {
        if (!content) return 'No content';
        
        const cleaned = content.replace(/\n/g, ' ').trim();
        return cleaned.length > maxLength ? 
            cleaned.substring(0, maxLength) + '...' : 
            cleaned;
    }

    /**
     * Format date for display
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Extract title from URL
     */
    extractSourceTitle(url) {
        if (!url) return '';
        
        try {
            const hostname = new URL(url).hostname;
            return hostname.replace('www.', '');
        } catch (e) {
            return url.substring(0, 30) + '...';
        }
    }

    /**
     * Format AI insights for display
     */
    formatAIInsights(insights) {
        if (!insights) return null;

        return {
            userVoiceInsights: insights.userVoice || [],
            contentInsights: insights.contentAnalysis || []
        };
    }

    /**
     * Render template with Mustache-like syntax
     */
    renderTemplate(templateName, data) {
        const template = this.templates.get(templateName);
        if (!template) return '';

        let html = template.html;

        // Simple template replacement
        html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
            const value = this.getNestedProperty(data, key);
            if (Array.isArray(value) && value.length > 0) {
                return value.map(item => this.renderTemplate('inline', { ...data, ...item, '.': item })).join('');
            } else if (value) {
                return content;
            }
            return '';
        });

        html = html.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
            const value = this.getNestedProperty(data, key);
            return (!value || (Array.isArray(value) && value.length === 0)) ? content : '';
        });

        html = html.replace(/\{\{\{(\w+)\}\}\}/g, (match, key) => {
            return this.getNestedProperty(data, key) || '';
        });

        html = html.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
            const value = this.getNestedProperty(data, key);
            return this.escapeHtml(String(value || ''));
        });

        return html;
    }

    /**
     * Get nested property from object
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Escape HTML for security
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Apply CSS styles if not already present
     */
    applyCSSIfNeeded() {
        if (document.getElementById('note-components-styles')) return;

        const style = document.createElement('style');
        style.id = 'note-components-styles';
        
        // Combine all template CSS
        let css = '';
        for (const template of this.templates.values()) {
            if (template.css) {
                css += template.css + '\n';
            }
        }

        // Add category colors
        css += `
            .note-card[data-category="Recipes"] { --category-color: #f57c00; }
            .note-card[data-category="Coding"] { --category-color: #388e3c; }
            .note-card[data-category="Music"] { --category-color: #c2185b; }
            .note-card[data-category="Games"] { --category-color: #7b1fa2; }
            .note-card[data-category="Hobbies"] { --category-color: #00695c; }
            .note-card[data-category="Learning"] { --category-color: #f9a825; }
            .note-card[data-category="Misc"] { --category-color: #2196F3; }
            
            .category-badge.recipes { background: #fff3e0; color: #f57c00; }
            .category-badge.coding { background: #e8f5e8; color: #388e3c; }
            .category-badge.music { background: #fce4ec; color: #c2185b; }
            .category-badge.games { background: #f3e5f5; color: #7b1fa2; }
            .category-badge.hobbies { background: #e0f2f1; color: #00695c; }
            .category-badge.learning { background: #fff8e1; color: #f9a825; }
            .category-badge.misc { background: #e3f2fd; color: #1976d2; }
        `;

        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * Handle click events on note cards
     */
    handleNoteCardClick(e) {
        const noteCard = e.target.closest('.note-card');
        if (!noteCard) return;

        const action = e.target.dataset.action;
        const noteId = noteCard.dataset.id;

        if (action) {
            e.preventDefault();
            e.stopPropagation();
            
            this.eventBus?.emit(`note:${action}`, { noteId });
        } else if (e.target.classList.contains('insight-toggle')) {
            // Toggle AI insights display
            const content = noteCard.querySelector('.insight-content');
            if (content) {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            }
        } else if (e.target.classList.contains('connection-item')) {
            // Handle connection click
            const connectionId = e.target.dataset.id;
            this.eventBus?.emit('note:view', { noteId: connectionId });
        } else {
            // Default card click - view note
            this.eventBus?.emit('note:view', { noteId });
        }
    }

    /**
     * Refresh single note display
     */
    async refreshNote(noteId) {
        const noteCard = document.querySelector(`[data-id="${noteId}"]`);
        if (!noteCard || !this.core) return;

        try {
            const note = await this.core.getNote(noteId);
            if (note) {
                const newCardHtml = this.renderNoteCard(note);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newCardHtml;
                
                noteCard.replaceWith(tempDiv.firstElementChild);
            }
        } catch (error) {
            console.error('Error refreshing note:', error);
        }
    }

    /**
     * Display connections for a note
     */
    displayConnections(connections, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const processedConnections = connections.map(conn => ({
            ...conn,
            date: this.formatDate(conn.timestamp)
        }));

        const html = this.renderTemplate('connectionList', {
            connections: processedConnections
        });

        container.innerHTML = html;
    }

    /**
     * Get public API
     */
    getAPI() {
        return {
            displayNotes: this.displayNotes.bind(this),
            renderNoteCard: this.renderNoteCard.bind(this),
            displayConnections: this.displayConnections.bind(this),
            refreshNote: this.refreshNote.bind(this)
        };
    }

    /**
     * Handle events from event bus
     */
    handleEvent(eventType, data) {
        switch (eventType) {
            case 'notes:display':
                this.displayNotes(data.notes, data.container, data.options);
                break;
            case 'notes:updated':
                this.refreshNote(data.noteId);
                break;
            default:
                console.log(`NoteComponents: Unhandled event ${eventType}`);
        }
    }

    /**
     * Cleanup module
     */
    destroy() {
        // Remove event listeners
        this.eventBus?.off('notes:display');
        this.eventBus?.off('notes:updated');
        
        // Remove styles
        const styles = document.getElementById('note-components-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteComponents;
} else if (typeof window !== 'undefined') {
    window.NoteComponents = NoteComponents;
}
