/**
 * Content Classifier AI Module
 * Analyzes external content for categorization and topic extraction
 * Part of Dual AI system - handles content NOT created by user
 */

class ContentClassifier {
    constructor() {
        this.name = 'content-classifier';
        this.version = '1.0.0';
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
     * Get default category keywords for content classification
     */
    getDefaultCategoryKeywords() {
        return {
            'Recipes': {
                keywords: ['recipe', 'cook', 'bake', 'ingredient', 'cup', 'tablespoon', 'oven', 'flour', 'sugar', 'salt', 'pepper', 'chicken', 'beef', 'pasta', 'sauce', 'meal', 'dinner', 'lunch', 'breakfast', 'food', 'cooking', 'kitchen', 'chef', 'culinary'],
                weight: 1.0
            },
            'Technology': {
                keywords: ['tech', 'software', 'programming', 'code', 'javascript', 'python', 'html', 'css', 'api', 'database', 'server', 'cloud', 'ai', 'machine learning', 'algorithm', 'development', 'framework', 'library', 'github', 'stackoverflow'],
                weight: 1.0
            },
            'Learning': {
                keywords: ['learn', 'study', 'course', 'tutorial', 'lesson', 'education', 'knowledge', 'skill', 'practice', 'training', 'research', 'book', 'article', 'university', 'academic', 'certification', 'mooc', 'workshop'],
                weight: 1.0
            },
            'Business': {
                keywords: ['business', 'startup', 'entrepreneur', 'marketing', 'strategy', 'finance', 'investment', 'revenue', 'profit', 'management', 'leadership', 'team', 'project', 'planning', 'analysis', 'growth'],
                weight: 1.0
            },
            'Health': {
                keywords: ['health', 'fitness', 'exercise', 'nutrition', 'diet', 'wellness', 'medical', 'doctor', 'therapy', 'mental health', 'psychology', 'medicine', 'treatment', 'diagnosis', 'symptoms'],
                weight: 1.0
            },
            'Entertainment': {
                keywords: ['movie', 'film', 'music', 'game', 'gaming', 'book', 'novel', 'tv show', 'series', 'podcast', 'youtube', 'streaming', 'entertainment', 'celebrity', 'review', 'recommendation'],
                weight: 1.0
            },
            'Science': {
                keywords: ['science', 'research', 'study', 'experiment', 'data', 'analysis', 'theory', 'discovery', 'innovation', 'technology', 'physics', 'chemistry', 'biology', 'psychology', 'neuroscience'],
                weight: 1.0
            }
        };
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

        // Learn from this analysis
        this.learnFromContent(contentData, analysis);
        
        // Update AI memory
        this.updateAIMemory(analysis);

        return analysis;
    }

    /**
     * Classify content into categories
     */
    classifyCategory(text, sourceUrl = '') {
        let scores = {};
        
        // Initialize scores
        Object.keys(this.patterns.categoryKeywords).forEach(category => {
            scores[category] = 0;
        });

        // Score based on keywords
        for (const [category, data] of Object.entries(this.patterns.categoryKeywords)) {
            let categoryScore = 0;
            
            data.keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = (text.match(regex) || []).length;
                categoryScore += matches * data.weight;
            });
            
            scores[category] = categoryScore;
        }

        // Apply source URL bonus
        if (sourceUrl) {
            this.applySourceBonus(scores, sourceUrl);
        }

        // Apply learned patterns
        this.applyLearnedPatterns(scores, text);

        // Find best category
        const bestCategory = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)[0];

        return bestCategory[1] > 0 ? bestCategory[0] : 'General';
    }

    /**
     * Extract relevant tags from content
     */
    extractTags(text, title) {
        const words = text.match(/\b\w{3,15}\b/g) || [];
        const titleWords = title.toLowerCase().match(/\b\w{3,15}\b/g) || [];
        
        // Common stop words to exclude
        const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'end', 'few', 'got', 'man', 'own', 'say', 'she', 'too', 'use', 'very', 'what', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'will', 'come', 'could', 'first', 'would', 'there', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'under', 'while']);

        // Count word frequencies
        const wordFreq = {};
        words.forEach(word => {
            const cleanWord = word.toLowerCase();
            if (!stopWords.has(cleanWord) && cleanWord.length >= 3) {
                wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
            }
        });

        // Boost title words
        titleWords.forEach(word => {
            if (wordFreq[word]) {
                wordFreq[word] *= 2;
            }
        });

        // Select top tags
        const tags = Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6)
            .filter(([word, freq]) => freq >= 2 || titleWords.includes(word))
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
        }
        
        // Source reliability bonus
        if (this.patterns.sourceReliability.has(sourceUrl)) {
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
        // Simple topic extraction based on noun phrases and key terms
        const topics = [];
        
        // Look for capitalized terms (potential proper nouns)
        const properNouns = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
        
        // Look for technical terms or concepts
        const technicalTerms = text.match(/\b\w+(?:[-_]\w+)+\b/g) || [];
        
        // Combine and filter
        const allTopics = [...new Set([...properNouns, ...technicalTerms])]
            .slice(0, 5);
            
        return allTopics;
    }

    /**
     * Analyze sentiment of content
     */
    analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'awesome', 'perfect'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'frustrating', 'annoying'];
        
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
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
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
        
        // Domain-based category hints
        const domainHints = {
            'github.com': 'Technology',
            'stackoverflow.com': 'Technology',
            'medium.com': 'Learning',
            'youtube.com': 'Entertainment',
            'wikipedia.org': 'Learning',
            'reddit.com': 'General',
            'news.ycombinator.com': 'Technology',
            'techcrunch.com': 'Technology',
            'allrecipes.com': 'Recipes',
            'foodnetwork.com': 'Recipes'
        };
        
        if (domainHints[domain]) {
            scores[domainHints[domain]] += 2;
        }
    }

    /**
     * Apply learned classification patterns
     */
    applyLearnedPatterns(scores, text) {
        // Apply topic associations from AI memory
        for (const [topic, categoryData] of this.patterns.topicAssociations) {
            if (text.includes(topic)) {
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
            return !pattern || pattern.negativeCount < pattern.positiveCount;
        });
        
        // Add high-confidence learned tags
        for (const [tag, pattern] of this.patterns.contentPatterns) {
            if (pattern.confidence > 0.8 && text.includes(pattern.trigger) && !refinedTags.includes(tag)) {
                refinedTags.push(tag);
                if (refinedTags.length >= 6) break;
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
            if (text.includes(keyword)) matchCount++;
        });
        
        return Math.min(0.95, Math.max(0.1, matchCount / totalKeywords * 3));
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
            const contextBonus = text.split(tag).length - 1 > 1 ? 0.2 : 0;
            totalConfidence += baseConfidence + contextBonus;
        });
        
        return Math.min(0.95, totalConfidence / tags.length);
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
            if (!this.patterns.sourceReliability.has(sourceUrl)) {
                this.patterns.sourceReliability.set(sourceUrl, 3); // Default reliability
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
        
        // Reduce confidence in incorrect prediction
        if (predictedCategory !== actualCategory && this.patterns.categoryKeywords[predictedCategory]) {
            this.patterns.categoryKeywords[predictedCategory].weight *= 0.95;
        }
        
        // Increase confidence in correct category
        if (this.patterns.categoryKeywords[actualCategory]) {
            this.patterns.categoryKeywords[actualCategory].weight *= 1.05;
            this.patterns.categoryKeywords[actualCategory].weight = Math.min(2.0, this.patterns.categoryKeywords[actualCategory].weight);
        }
        
        // Learn new keywords for the actual category
        if (content) {
            const words = content.toLowerCase().match(/\b\w{4,12}\b/g) || [];
            const uniqueWords = [...new Set(words)].slice(0, 3);
            
            uniqueWords.forEach(word => {
                if (!this.patterns.categoryKeywords[actualCategory].keywords.includes(word)) {
                    this.patterns.categoryKeywords[actualCategory].keywords.push(word);
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
        
        if (sourceUrl && this.patterns.sourceReliability.has(sourceUrl)) {
            const currentReliability = this.patterns.sourceReliability.get(sourceUrl);
            const adjustment = (actualRating - predictedImportance) * 0.1;
            const newReliability = Math.max(1, Math.min(5, currentReliability + adjustment));
            this.patterns.sourceReliability.set(sourceUrl, newReliability);
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
                    this.patterns.categoryKeywords[category] = { ...this.patterns.categoryKeywords[category], ...data };
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
                this.aiMemory.topicCorrelations[topic] = Object.fromEntries(this.patterns.topicAssociations.get(topic));
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
