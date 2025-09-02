/**
 * Content Classifier AI Module - FIXED VERSION
 * Analyzes external content for categorization and topic extraction
 * Part of Dual AI system - handles content NOT created by user
 */

class ContentClassifier {
    constructor() {
        this.name = 'content-classifier';
        this.version = '1.0.1';
        this.dependencies = ['core', 'storage-manager'];
        
        // AI learning patterns for external content
        this.patterns = {
            categoryKeywords: this.getDefaultCategoryKeywords(),
            topicAssociations: new Map(),
            contentPatterns: new Map(),
            importanceSignals: new Map(),
            sourceReliability: new Map()
        };
        
        // Classification confidence thresholds
        this.confidenceThresholds = {
            category: 0.7,
            tags: 0.6,
            importance: 0.5
        };
        
        this.core = null;
        this.storage = null;
        this.aiMemory = null;
    }

    /**
     * Get module API for other modules
     */
    getAPI() {
        return {
            analyzeContent: this.analyzeContent.bind(this),
            classifyCategory: this.classifyCategory.bind(this),
            extractTags: this.extractTags.bind(this),
            assessImportance: this.assessImportance.bind(this),
            getStats: this.getStats.bind(this)
        };
    }

    /**
     * Handle events from event bus
     */
    handleEvent(eventType, data) {
        switch (eventType) {
            case 'note-created':
                this.handleNoteCreated(data);
                break;
            case 'feedback-received':
                this.handleFeedback(data);
                break;
        }
    }
}

// Export for module system
export { ContentClassifier };
     * Initialize the content classifier
     */
    async init(core, config) {
        this.core = core;
        this.storage = core.getModule('storage-manager');
        
        // Load AI memory for content analysis
        this.aiMemory = await this.storage.getAIMemory('contentAnalysis') || {
            categoryPatterns: {},
            interestEvolution: {},
            topicCorrelations: {},
            learningStats: { totalAnalyzed: 0, feedbackReceived: 0 }
        };
        
        // Restore learned patterns
        this.restoreLearnedPatterns();
        
        // Register event listeners
        this.core.eventBus.on('note-created', (data) => this.handleNoteCreated(data));
        this.core.eventBus.on('feedback-received', (data) => this.handleFeedback(data));
        
        console.log('[ContentClassifier] Initialized with', Object.keys(this.patterns.categoryKeywords).length, 'categories');
        return Promise.resolve();
    }

    /**
     * Get default category keywords - FIXED to match main app categories
     */
    getDefaultCategoryKeywords() {
        return {
            'Recipes': {
                keywords: ['recipe', 'cook', 'bake', 'ingredient', 'cup', 'tablespoon', 'oven', 'flour', 'sugar', 'salt', 'pepper', 'chicken', 'beef', 'pasta', 'sauce', 'meal', 'dinner', 'lunch', 'breakfast', 'food', 'cooking', 'kitchen', 'chef', 'culinary', 'cookies', 'oatmeal'],
                weight: 1.0,
                priority: 1
            },
            'Coding': {
                keywords: ['code', 'programming', 'javascript', 'python', 'html', 'css', 'function', 'variable', 'array', 'object', 'debug', 'api', 'database', 'server', 'client', 'git', 'github', 'algorithm', 'software', 'development', 'framework', 'library'],
                weight: 1.0,
                priority: 1
            },
            'Music': {
                keywords: ['music', 'song', 'guitar', 'piano', 'drum', 'chord', 'melody', 'rhythm', 'album', 'artist', 'concert', 'band', 'lyrics', 'note', 'scale', 'instrument', 'composition', 'performance'],
                weight: 1.0,
                priority: 1
            },
            'Games': {
                keywords: ['game', 'gaming', 'play', 'player', 'level', 'score', 'quest', 'character', 'strategy', 'puzzle', 'arcade', 'console', 'pc', 'mobile', 'video game', 'board game', 'rpg', 'mmorpg'],
                weight: 1.0,
                priority: 1
            },
            'Hobbies': {
                keywords: ['hobby', 'craft', 'art', 'draw', 'paint', 'photography', 'garden', 'collect', 'build', 'make', 'create', 'diy', 'project', 'woodworking', 'knitting', 'sewing'],
                weight: 1.0,
                priority: 1
            },
            'Learning': {
                keywords: ['learn', 'study', 'course', 'tutorial', 'lesson', 'education', 'knowledge', 'skill', 'practice', 'training', 'research', 'book', 'article', 'university', 'academic', 'certification', 'mooc', 'workshop'],
                weight: 1.0,
                priority: 1
            },
            'Misc': {
                keywords: ['general', 'other', 'miscellaneous', 'various', 'random', 'note', 'idea', 'thought', 'reminder'],
                weight: 0.5,
                priority: 0
            }
        };
    }

    /**
     * Classify content into categories - FIXED LOGIC
     */
    classifyCategory(text, sourceUrl = '') {
        let scores = {};
        
        // Initialize scores for all categories
        Object.keys(this.patterns.categoryKeywords).forEach(category => {
            scores[category] = 0;
        });

        // Score based on keywords with improved matching
        for (const [category, data] of Object.entries(this.patterns.categoryKeywords)) {
            let categoryScore = 0;
            
            data.keywords.forEach(keyword => {
                // Use word boundary regex for exact matches
                const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                const matches = (text.match(regex) || []).length;
                if (matches > 0) {
                    // Add bonus for exact keyword matches
                    categoryScore += matches * data.weight * (data.priority === 1 ? 2 : 1);
                    console.log(`[ContentClassifier] Found "${keyword}" in category "${category}", score: +${matches * data.weight}`);
                }
            });
            
            scores[category] = categoryScore;
        }

        // Apply source URL bonus
        if (sourceUrl) {
            this.applySourceBonus(scores, sourceUrl);
        }

        // Apply learned patterns
        this.applyLearnedPatterns(scores, text);

        // Find best category with minimum threshold
        const sortedCategories = Object.entries(scores)
            .sort(([,a], [,b]) => b - a);
        
        console.log('[ContentClassifier] Category scores:', scores);
        
        const bestCategory = sortedCategories[0];
        const secondBest = sortedCategories[1];
        
        // Return best category if it has a clear lead, otherwise default to Misc
        if (bestCategory[1] > 0 && (bestCategory[1] > secondBest[1] * 1.2 || bestCategory[1] >= 2)) {
            console.log(`[ContentClassifier] Selected category: ${bestCategory[0]} (score: ${bestCategory[1]})`);
            return bestCategory[0];
        }
        
        console.log('[ContentClassifier] No clear category winner, defaulting to Misc');
        return 'Misc';
    }

    /**
     * Analyze external content for classification
     */
    async analyzeContent(contentData) {
        const { title = '', content = '', sourceUrl = '', isUserCreated = false } = contentData;
        
        // Only process external content
        if (isUserCreated) {
            return { 
                category: 'Personal',
                tags: [],
                confidence: 1.0,
                aiInsights: { processedBy: 'user-voice-ai' }
            };
        }

        const fullText = `${title} ${content}`.toLowerCase();
        console.log(`[ContentClassifier] Analyzing content: "${title}" (${content.length} chars)`);
        console.log(`[ContentClassifier] Full text preview: ${fullText.substring(0, 200)}...`);
        
        const analysis = {
            category: this.classifyCategory(fullText, sourceUrl),
            tags: this.extractTags(fullText, title),
            importance: this.assessImportance(contentData),
            topics: this.extractTopics(fullText),
            sentiment: this.analyzeSentiment(fullText),
            readingTime: this.estimateReadingTime(content),
            aiInsights: {
                processedBy: 'content-classifier',
                confidence: {},
                signals: [],
                timestamp: new Date().toISOString()
            }
        };

        // Add confidence scores
        analysis.aiInsights.confidence = {
            category: this.calculateCategoryConfidence(fullText, analysis.category),
            tags: this.calculateTagsConfidence(analysis.tags, fullText),
            importance: this.calculateImportanceConfidence(analysis.importance, contentData)
        };

        console.log(`[ContentClassifier] Final analysis:`, analysis);

        // Learn from this analysis
        this.learnFromContent(contentData, analysis);
        
        // Update AI memory
        this.updateAIMemory(analysis);

        return analysis;
    }

    /**
     * Extract relevant tags from content
     */
    extractTags(text, title) {
        const words = text.match(/\b\w{3,15}\b/g) || [];
        const titleWords = title.toLowerCase().match(/\b\w{3,15}\b/g) || [];
        
        // Enhanced stop words list
        const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'end', 'few', 'got', 'man', 'own', 'say', 'she', 'too', 'use', 'very', 'what', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'will', 'come', 'could', 'first', 'would', 'there', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'under', 'while', 'this', 'that', 'than', 'more', 'into', 'over', 'down', 'only', 'just', 'also', 'both', 'back', 'most', 'each', 'such', 'make', 'find', 'take', 'give', 'work', 'look', 'help', 'show', 'tell', 'keep', 'part', 'need', 'feel', 'seem', 'talk', 'turn', 'move', 'like', 'well']);

        // Count word frequencies
        const wordFreq = {};
        words.forEach(word => {
            const cleanWord = word.toLowerCase().trim();
            if (!stopWords.has(cleanWord) && cleanWord.length >= 3 && cleanWord.length <= 15) {
                wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
            }
        });

        // Boost title words significantly
        titleWords.forEach(word => {
            const cleanWord = word.toLowerCase().trim();
            if (wordFreq[cleanWord] && !stopWords.has(cleanWord)) {
                wordFreq[cleanWord] *= 3; // Higher boost for title words
            }
        });

        // Select top tags with better filtering
        const tags = Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8) // Get more candidates
            .filter(([word, freq]) => {
                // More selective filtering
                return (freq >= 2) || (titleWords.includes(word) && freq >= 1);
            })
            .slice(0, 5) // Then limit to 5 best
            .map(([word]) => word);

        return this.refineTagsWithLearning(tags, text);
    }

    /**
     * Assess content importance
     */
    assessImportance(contentData) {
        const { title = '', content = '', sourceUrl = '', timestamp } = contentData;
        let importance = 3; // Base importance (1-5 scale)
        
        // Title indicators
        if (title.match(/\b(important|urgent|breaking|exclusive|must|essential|critical)\b/i)) {
            importance += 1;
        }
        
        // Content length bonus
        if (content.length > 2000) {
            importance += 0.5;
        } else if (content.length < 200) {
            importance -= 0.5;
        }
        
        // Source reliability bonus
        if (sourceUrl && this.patterns.sourceReliability.has(sourceUrl)) {
            const reliability = this.patterns.sourceReliability.get(sourceUrl);
            importance += reliability - 3; // Adjust based on learned source quality
        }
        
        // Recency bonus
        if (timestamp) {
            const age = Date.now() - new Date(timestamp).getTime();
            const daysSinceCreated = age / (1000 * 60 * 60 * 24);
            if (daysSinceCreated < 1) importance += 0.5;
        }
        
        return Math.min(5, Math.max(1, Math.round(importance * 2) / 2));
    }

    /**
     * Extract main topics from content
     */
    extractTopics(text) {
        const topics = [];
        
        // Look for capitalized terms (potential proper nouns)
        const properNouns = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
        
        // Look for technical terms or concepts
        const technicalTerms = text.match(/\b\w+(?:[-_]\w+)+\b/g) || [];
        
        // Look for quoted terms
        const quotedTerms = text.match(/"([^"]+)"/g) || [];
        
        // Combine and filter
        const allTopics = [...new Set([
            ...properNouns.slice(0, 3),
            ...technicalTerms.slice(0, 2),
            ...quotedTerms.map(q => q.replace(/"/g, '')).slice(0, 2)
        ])].slice(0, 5);
            
        return allTopics;
    }

    /**
     * Analyze sentiment of content
     */
    analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'awesome', 'perfect', 'outstanding', 'brilliant', 'superb'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'frustrating', 'annoying', 'poor', 'useless', 'broken'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        positiveWords.forEach(word => {
            const matches = (text.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
            positiveCount += matches;
        });
        
        negativeWords.forEach(word => {
            const matches = (text.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
            negativeCount += matches;
        });
        
        const threshold = 2;
        if (positiveCount >= threshold && positiveCount > negativeCount) return 'positive';
        if (negativeCount >= threshold && negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    /**
     * Estimate reading time in minutes
     */
    estimateReadingTime(content) {
        const wordsPerMinute = 200;
        const wordCount = (content.match(/\b\w+\b/g) || []).length;
        return Math.max(1, Math.round(wordCount / wordsPerMinute));
    }

    /**
     * Apply source URL bonus to category scores
     */
    applySourceBonus(scores, sourceUrl) {
        const domain = this.extractDomain(sourceUrl);
        
        // Domain-based category hints with stronger signals
        const domainHints = {
            'github.com': { 'Coding': 3 },
            'stackoverflow.com': { 'Coding': 4 },
            'codepen.io': { 'Coding': 3 },
            'medium.com': { 'Learning': 2 },
            'youtube.com': { 'Music': 2, 'Learning': 1 },
            'spotify.com': { 'Music': 4 },
            'wikipedia.org': { 'Learning': 2 },
            'reddit.com': { 'Misc': 1 },
            'news.ycombinator.com': { 'Coding': 2, 'Learning': 1 },
            'techcrunch.com': { 'Coding': 2 },
            'allrecipes.com': { 'Recipes': 4 },
            'foodnetwork.com': { 'Recipes': 4 },
            'steam.com': { 'Games': 4 },
            'gamespot.com': { 'Games': 3 },
            'ign.com': { 'Games': 3 }
        };
        
        if (domainHints[domain]) {
            Object.entries(domainHints[domain]).forEach(([category, bonus]) => {
                scores[category] = (scores[category] || 0) + bonus;
                console.log(`[ContentClassifier] Applied domain bonus: ${domain} -> ${category} +${bonus}`);
            });
        }
    }

    /**
     * Apply learned classification patterns
     */
    applyLearnedPatterns(scores, text) {
        // Apply topic associations from AI memory
        for (const [topic, categoryData] of this.patterns.topicAssociations) {
            if (text.includes(topic.toLowerCase())) {
                for (const [category, weight] of Object.entries(categoryData)) {
                    scores[category] = (scores[category] || 0) + weight;
                }
            }
        }
    }

    /**
     * Refine tags using learned patterns
     */
    refineTagsWithLearning(tags, text) {
        // Filter out tags that received negative feedback
        const refinedTags = tags.filter(tag => {
            const pattern = this.patterns.contentPatterns.get(tag);
            return !pattern || (pattern.negativeCount < pattern.positiveCount);
        });
        
        // Add high-confidence learned tags
        for (const [tag, pattern] of this.patterns.contentPatterns) {
            if (pattern.confidence > 0.8 && 
                text.includes(pattern.trigger) && 
                !refinedTags.includes(tag) && 
                refinedTags.length < 5) {
                refinedTags.push(tag);
            }
        }
        
        return refinedTags;
    }

    /**
     * Calculate category classification confidence
     */
    calculateCategoryConfidence(text, category) {
        const categoryData = this.patterns.categoryKeywords[category];
        if (!categoryData) return 0.5;
        
        let matchCount = 0;
        let totalKeywords = categoryData.keywords.length;
        
        categoryData.keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            if (text.match(regex)) matchCount++;
        });
        
        const baseConfidence = matchCount / totalKeywords;
        return Math.min(0.95, Math.max(0.1, baseConfidence * 2));
    }

    /**
     * Calculate tags confidence
     */
    calculateTagsConfidence(tags, text) {
        if (tags.length === 0) return 0.3;
        
        let totalConfidence = 0;
        tags.forEach(tag => {
            const pattern = this.patterns.contentPatterns.get(tag);
            const baseConfidence = pattern ? pattern.confidence : 0.6;
            const contextBonus = (text.split(tag).length - 1) > 1 ? 0.2 : 0;
            totalConfidence += Math.min(0.95, baseConfidence + contextBonus);
        });
        
        return totalConfidence / tags.length;
    }

    /**
     * Calculate importance assessment confidence
     */
    calculateImportanceConfidence(importance, contentData) {
        let confidence = 0.5;
        
        if (contentData.sourceUrl && this.patterns.sourceReliability.has(contentData.sourceUrl)) {
            confidence += 0.2;
        }
        
        if (contentData.content && contentData.content.length > 500) {
            confidence += 0.1;
        }
        
        if (contentData.title && contentData.title.length > 10) {
            confidence += 0.1;
        }
        
        return Math.min(0.9, confidence);
    }

    /**
     * Learn from content analysis
     */
    learnFromContent(contentData, analysis) {
        const { title = '', content = '', sourceUrl = '' } = contentData;
        const text = `${title} ${content}`.toLowerCase();
        
        // Learn topic associations
        analysis.topics.forEach(topic => {
            if (!this.patterns.topicAssociations.has(topic)) {
                this.patterns.topicAssociations.set(topic, {});
            }
            const topicData = this.patterns.topicAssociations.get(topic);
            topicData[analysis.category] = (topicData[analysis.category] || 0) + 0.1;
        });
        
        // Learn content patterns for tags
        analysis.tags.forEach(tag => {
            if (!this.patterns.contentPatterns.has(tag)) {
                this.patterns.contentPatterns.set(tag, {
                    confidence: 0.6,
                    positiveCount: 1,
                    negativeCount: 0,
                    trigger: tag,
                    categories: {}
                });
            }
            
            const pattern = this.patterns.contentPatterns.get(tag);
            pattern.categories[analysis.category] = (pattern.categories[analysis.category] || 0) + 1;
        });
        
        // Learn source reliability (will be updated with user feedback)
        if (sourceUrl) {
            const domain = this.extractDomain(sourceUrl);
            if (!this.patterns.sourceReliability.has(domain)) {
                this.patterns.sourceReliability.set(domain, 3); // Default reliability
            }
        }
        
        // Update learning stats
        this.aiMemory.learningStats.totalAnalyzed++;
    }

    /**
     * Handle user feedback to improve classification
     */
    async handleFeedback(data) {
        if (data.type === 'category-correction') {
            this.learnFromCategoryCorrection(data);
        } else if (data.type === 'tag-feedback') {
            this.learnFromTagFeedback(data);
        } else if (data.type === 'importance-rating') {
            this.learnFromImportanceRating(data);
        }
        
        this.aiMemory.learningStats.feedbackReceived++;
        await this.saveAIMemory();
    }

    /**
     * Learn from category correction feedback
     */
    learnFromCategoryCorrection(data) {
        const { predictedCategory, actualCategory, content, confidence } = data;
        
        console.log(`[ContentClassifier] Learning from correction: ${predictedCategory} -> ${actualCategory}`);
        
        // Reduce confidence in incorrect prediction
        if (predictedCategory !== actualCategory && this.patterns.categoryKeywords[predictedCategory]) {
            this.patterns.categoryKeywords[predictedCategory].weight = 
                Math.max(0.3, this.patterns.categoryKeywords[predictedCategory].weight * 0.9);
        }
        
        // Increase confidence in correct category
        if (this.patterns.categoryKeywords[actualCategory]) {
            this.patterns.categoryKeywords[actualCategory].weight = 
                Math.min(2.0, this.patterns.categoryKeywords[actualCategory].weight * 1.1);
        }
        
        // Learn new keywords for the actual category
        if (content) {
            const words = content.toLowerCase().match(/\b\w{4,12}\b/g) || [];
            const uniqueWords = [...new Set(words)]
                .filter(word => word.length >= 4 && word.length <= 12)
                .slice(0, 3);
            
            uniqueWords.forEach(word => {
                if (!this.patterns.categoryKeywords[actualCategory].keywords.includes(word)) {
                    this.patterns.categoryKeywords[actualCategory].keywords.push(word);
                    console.log(`[ContentClassifier] Learned new keyword "${word}" for category "${actualCategory}"`);
                }
            });
        }
    }

    /**
     * Learn from tag feedback
     */
    learnFromTagFeedback(data) {
        const { tag, rating, content } = data;
        
        if (!this.patterns.contentPatterns.has(tag)) {
            this.patterns.contentPatterns.set(tag, {
                confidence: 0.6,
                positiveCount: 0,
                negativeCount: 0,
                trigger: tag,
                categories: {}
            });
        }
        
        const pattern = this.patterns.contentPatterns.get(tag);
        
        if (rating === 'positive' || rating === 'good') {
            pattern.positiveCount++;
            pattern.confidence = Math.min(0.95, pattern.confidence + 0.05);
        } else if (rating === 'negative' || rating === 'bad') {
            pattern.negativeCount++;
            pattern.confidence = Math.max(0.1, pattern.confidence - 0.1);
        }
    }

    /**
     * Learn from importance rating feedback
     */
    learnFromImportanceRating(data) {
        const { sourceUrl, predictedImportance, actualRating } = data;
        
        if (sourceUrl) {
            const domain = this.extractDomain(sourceUrl);
            if (this.patterns.sourceReliability.has(domain)) {
                const currentReliability = this.patterns.sourceReliability.get(domain);
                const adjustment = (actualRating - predictedImportance) * 0.1;
                const newReliability = Math.max(1, Math.min(5, currentReliability + adjustment));
                this.patterns.sourceReliability.set(domain, newReliability);
            }
        }
    }

    /**
     * Restore learned patterns from AI memory
     */
    restoreLearnedPatterns() {
        // Restore category patterns
        if (this.aiMemory.categoryPatterns) {
            Object.entries(this.aiMemory.categoryPatterns).forEach(([category, data]) => {
                if (this.patterns.categoryKeywords[category]) {
                    this.patterns.categoryKeywords[category] = { 
                        ...this.patterns.categoryKeywords[category], 
                        ...data 
                    };
                }
            });
        }
        
        // Restore topic correlations
        if (this.aiMemory.topicCorrelations) {
            Object.entries(this.aiMemory.topicCorrelations).forEach(([topic, correlations]) => {
                this.patterns.topicAssociations.set(topic, correlations);
            });
        }
    }

    /**
     * Update AI memory with new learnings
     */
    updateAIMemory(analysis) {
        // Store category patterns
        this.aiMemory.categoryPatterns[analysis.category] = {
            weight: this.patterns.categoryKeywords[analysis.category]?.weight || 1.0,
            lastUsed: new Date().toISOString()
        };
        
        // Store topic correlations
        analysis.topics.forEach(topic => {
            if (this.patterns.topicAssociations.has(topic)) {
                this.aiMemory.topicCorrelations[topic] = 
                    Object.fromEntries(this.patterns.topicAssociations.get(topic));
            }
        });
        
        // Track interest evolution
        const today = new Date().toISOString().split('T')[0];
        if (!this.aiMemory.interestEvolution[today]) {
            this.aiMemory.interestEvolution[today] = {};
        }
        this.aiMemory.interestEvolution[today][analysis.category] = 
            (this.aiMemory.interestEvolution[today][analysis.category] || 0) + 1;
    }

    /**
     * Save AI memory to storage
     */
    async saveAIMemory() {
        await this.storage.updateAIMemory('contentAnalysis', this.aiMemory);
    }

    /**
     * Handle note creation events
     */
    async handleNoteCreated(data) {
        if (!data.isUserCreated) {
            // Process external content
            const analysis = await this.analyzeContent(data);
            
            // Emit analysis results
            this.core.eventBus.emit('content-analyzed', {
                noteId: data.id,
                analysis: analysis
            });
        }
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return '';
        }
    }

    /**
     * Get current learning statistics
     */
    getStats() {
        return {
            totalAnalyzed: this.aiMemory.learningStats.totalAnalyzed,
            feedbackReceived: this.aiMemory.learningStats.feedbackReceived,
            categoriesLearned: Object.keys(this.patterns.categoryKeywords).length,
            topicAssociations: this.patterns.topicAssociations.size,
            contentPatterns: this.patterns.contentPatterns.size,
            sourceReliability: this.patterns.sourceReliability.size
        };
    }

    /**
     * Module cleanup
     */
    destroy() {
        this.core?.eventBus?.off('note-created');
        this.core?.eventBus?.off('feedback-received');
        this.saveAIMemory();
    }

    /**
