/**
 * Text Processor Module - Content analysis and cleanup
 * Handles text cleaning, keyword extraction, sentiment analysis
 * 200 lines max per master plan
 */

const TextProcessor = {
    name: 'text-processor',
    version: '1.0.0',
    dependencies: ['core'],
    
    // Core processing configuration
    config: {
        minWordLength: 3,
        maxTags: 8,
        stopWords: ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 
                   'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 
                   'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 
                   'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'end', 
                   'few', 'got', 'man', 'own', 'say', 'she', 'too', 'use'],
        sentimentWords: {
            positive: ['good', 'great', 'excellent', 'amazing', 'love', 'like', 
                      'enjoy', 'happy', 'fantastic', 'wonderful', 'awesome'],
            negative: ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 
                      'angry', 'frustrated', 'disappointed', 'horrible']
        }
    },
    
    core: null,
    eventBus: null,
    
    async init(core, config) {
        this.core = core;
        this.eventBus = core.eventBus;
        
        // Register event listeners
        this.eventBus.on('note:analyze-text', this.analyzeText.bind(this));
        this.eventBus.on('note:extract-keywords', this.extractKeywords.bind(this));
        this.eventBus.on('note:clean-text', this.cleanText.bind(this));
        
        console.log('TextProcessor initialized');
        return Promise.resolve();
    },
    
    destroy() {
        this.eventBus.off('note:analyze-text');
        this.eventBus.off('note:extract-keywords');
        this.eventBus.off('note:clean-text');
    },
    
    /**
     * Main text analysis - combines all processing
     */
    analyzeText(data) {
        const { text, isUserCreated = false } = data;
        
        if (!text || text.trim().length < 10) {
            return {
                keywords: [],
                sentiment: 'neutral',
                readability: 'unknown',
                wordCount: 0
            };
        }
        
        const cleaned = this.cleanText({ text }).cleanedText;
        const keywords = this.extractKeywords({ text: cleaned, isUserCreated }).keywords;
        const sentiment = this.analyzeSentiment(cleaned);
        const readability = this.analyzeReadability(cleaned);
        const stats = this.getTextStats(cleaned);
        
        const result = {
            keywords,
            sentiment,
            readability,
            ...stats,
            originalLength: text.length,
            cleanedLength: cleaned.length
        };
        
        // Emit completion event
        this.eventBus.emit('text:analyzed', result);
        return result;
    },
    
    /**
     * Clean and normalize text content
     */
    cleanText(data) {
        let { text } = data;
        
        // Remove excessive whitespace
        text = text.replace(/\s+/g, ' ');
        
        // Clean common OCR artifacts
        text = text
            .replace(/[|┌┐└┘├┤┬┴┼─│]/g, '') // Table borders
            .replace(/\+[-=]+\+/g, '')      // Table separators
            .replace(/[-=]{3,}/g, '')       // Long separators
            .replace(/\b1(\w)/g, 'I$1')     // OCR l->1 errors
            .replace(/(\w)1(\s|$)/g, '$1l$2')
            .replace(/\b0(\w)/g, 'O$1')     // OCR O->0 errors
            .replace(/(\w)0(\s|$)/g, '$1o$2');
        
        // Clean markdown artifacts from web capture
        text = text
            .replace(/#{1,6}\s*/g, '')      // Headers
            .replace(/\*{1,2}(.*?)\*{1,2}/g, '$1') // Bold/italic
            .replace(/`{1,3}(.*?)`{1,3}/g, '$1')   // Code blocks
            .replace(/\[(.*?)\]\(.*?\)/g, '$1');   // Links
        
        // Remove URL fragments
        text = text.replace(/https?:\/\/[^\s]+/g, '[URL]');
        
        // Clean special characters but preserve meaning
        text = text.replace(/[^\w\s.,!?;:()"-]/g, ' ');
        
        // Final whitespace cleanup
        text = text.replace(/\s+/g, ' ').trim();
        
        return { cleanedText: text };
    },
    
    /**
     * Extract relevant keywords and tags
     */
    extractKeywords(data) {
        const { text, isUserCreated = false } = data;
        
        if (!text) return { keywords: [] };
        
        // Tokenize and clean words
        const words = text.toLowerCase()
            .match(/\b\w{3,}\b/g) || [];
        
        // Filter stop words
        const filtered = words.filter(word => 
            !this.config.stopWords.includes(word) &&
            word.length >= this.config.minWordLength
        );
        
        // Count word frequency
        const frequency = {};
        filtered.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        // Get most frequent words
        const sorted = Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, this.config.maxTags);
        
        // Apply user-created vs external content logic
        let keywords;
        if (isUserCreated) {
            // For user content, prefer meaningful terms over frequency
            keywords = this.selectMeaningfulTerms(sorted, text);
        } else {
            // For external content, use frequency-based selection
            keywords = sorted.map(([word]) => word);
        }
        
        return { keywords: keywords.slice(0, 6) };
    },
    
    /**
     * Select meaningful terms for user-created content
     */
    selectMeaningfulTerms(frequentWords, originalText) {
        const meaningful = [];
        const text = originalText.toLowerCase();
        
        // Priority: nouns and action words
        const nounPatterns = /\b(project|idea|plan|goal|task|problem|solution|result|method|technique|tool|system|process|experience|learning|insight|discovery|creation|development|improvement|strategy|approach)\b/;
        const actionPatterns = /\b(create|build|learn|develop|improve|discover|analyze|design|implement|solve|achieve|complete|start|finish|plan|organize|manage|understand|explore|experiment|practice|master|teach|share)\b/;
        
        frequentWords.forEach(([word, count]) => {
            if (count >= 2) {
                if (nounPatterns.test(text) && text.includes(word)) {
                    meaningful.push(word);
                } else if (actionPatterns.test(text) && text.includes(word)) {
                    meaningful.push(word);
                } else if (count >= 3) {
                    meaningful.push(word);
                }
            }
        });
        
        // Fallback to frequency if no meaningful terms found
        return meaningful.length >= 3 ? meaningful : 
               frequentWords.slice(0, 5).map(([word]) => word);
    },
    
    /**
     * Analyze emotional sentiment
     */
    analyzeSentiment(text) {
        if (!text) return 'neutral';
        
        const words = text.toLowerCase().split(/\s+/);
        let positiveScore = 0;
        let negativeScore = 0;
        
        words.forEach(word => {
            if (this.config.sentimentWords.positive.includes(word)) {
                positiveScore++;
            } else if (this.config.sentimentWords.negative.includes(word)) {
                negativeScore++;
            }
        });
        
        const total = positiveScore + negativeScore;
        if (total === 0) return 'neutral';
        
        const ratio = positiveScore / total;
        if (ratio > 0.6) return 'positive';
        if (ratio < 0.4) return 'negative';
        return 'neutral';
    },
    
    /**
     * Analyze text readability
     */
    analyzeReadability(text) {
        if (!text) return 'unknown';
        
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        if (sentences.length === 0 || words.length === 0) return 'unknown';
        
        const avgWordsPerSentence = words.length / sentences.length;
        const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        
        // Simple readability scoring
        if (avgWordsPerSentence < 10 && avgCharsPerWord < 5) {
            return 'easy';
        } else if (avgWordsPerSentence < 20 && avgCharsPerWord < 7) {
            return 'medium';
        } else {
            return 'complex';
        }
    },
    
    /**
     * Get basic text statistics
     */
    getTextStats(text) {
        if (!text) {
            return {
                wordCount: 0,
                charCount: 0,
                sentenceCount: 0,
                paragraphCount: 0
            };
        }
        
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        return {
            wordCount: words.length,
            charCount: text.length,
            sentenceCount: sentences.length,
            paragraphCount: Math.max(1, paragraphs.length)
        };
    },
    
    /**
     * Public API for other modules
     */
    getAPI() {
        return {
            analyzeText: this.analyzeText.bind(this),
            cleanText: this.cleanText.bind(this),
            extractKeywords: this.extractKeywords.bind(this),
            getTextStats: this.getTextStats.bind(this)
        };
    },
    
    handleEvent(eventType, data) {
        switch (eventType) {
            case 'note:analyze-text':
                return this.analyzeText(data);
            case 'note:extract-keywords':
                return this.extractKeywords(data);
            case 'note:clean-text':
                return this.cleanText(data);
            default:
                console.warn('TextProcessor: Unknown event', eventType);
        }
    }
};

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextProcessor;
} else {
    window.TextProcessor = TextProcessor;
}
