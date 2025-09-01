# Personal Vault v2.0 - Master Project Specification

## 🎯 Project Vision
Create an intelligent, modular personal knowledge repository that learns user patterns, discovers connections between data, and evolves into a comprehensive personal assistant. Primary focus: collect and intelligently organize user interests with dual AI tracking of user voice vs. collected content.

## 🏗️ Architecture Overview

### Core Principle
Modular web-first application with clean API contracts enabling independent module development and future native app conversion.

### File Structure
```
personal-vault/
├── index.html                    # Main shell (200 lines max)
├── manifest.json                 # PWA configuration
├── core/
│   ├── vault-core.js            # Main orchestration (300 lines)
│   ├── storage-manager.js       # Data persistence (250 lines)
│   ├── event-bus.js            # Module communication (150 lines)
│   ├── module-loader.js        # Dynamic loading (200 lines)
│   └── api-contracts.js        # Module API definitions (100 lines)
├── modules/
│   ├── dual-ai/
│   │   ├── user-voice-ai.js    # Personal writing analysis (300 lines)
│   │   ├── content-classifier.js # External content analysis (300 lines)
│   │   └── ai-coordinator.js   # Dual AI management (200 lines)
│   ├── learning-system/
│   │   ├── pattern-tracker.js  # User behavior patterns (250 lines)
│   │   ├── time-analyzer.js    # Temporal pattern learning (200 lines)
│   │   ├── connection-finder.js # Cross-reference discovery (300 lines)
│   │   └── insight-generator.js # Personal insights (250 lines)
│   ├── content-processor/
│   │   ├── text-processor.js   # Text analysis/cleanup (200 lines)
│   │   ├── web-capture.js      # URL snapshot system (300 lines)
│   │   ├── image-ocr.js        # Image processing (250 lines)
│   │   └── audio-handler.js    # Podcast/music metadata (200 lines)
│   ├── rating-system/
│   │   ├── interest-rating.js  # 5-star rating system (150 lines)
│   │   └── evolution-tracker.js # Rating changes over time (200 lines)
│   ├── template-system/
│   │   ├── template-engine.js  # Dynamic template creation (250 lines)
│   │   └── template-evolution.js # AI-driven template improvement (200 lines)
│   ├── ui-framework/
│   │   ├── modal-system.js     # Reusable modals (200 lines)
│   │   ├── note-components.js  # Note display components (250 lines)
│   │   ├── discovery-widget.js # "Today I Noticed" sidebar (200 lines)
│   │   └── quick-add.js        # Fast input interfaces (200 lines)
│   ├── search-engine/
│   │   ├── intelligent-search.js # Natural language search (300 lines)
│   │   └── filter-system.js    # Advanced filtering (200 lines)
│   └── automation/
│       ├── browser-extension/  # Future: Quick Add extension
│       └── mobile-integration/ # Future: Native app bridge
├── data/
│   ├── schema.json             # Data structure definitions
│   ├── ai-memory.json          # Persistent AI learning data
│   └── user-config.json        # User preferences
├── styles/
│   ├── base.css               # Core styles
│   ├── components.css         # Component styles
│   └── themes.css            # Theme system
└── docs/
    ├── api-reference.md       # Module API documentation
    ├── development-guide.md   # Development standards
    └── deployment.md          # Deployment instructions
```

## 🧠 Dual AI System Specification

### User Voice AI
**Purpose**: Learn user's personal writing style, thoughts, and voice
**Triggers**: Notes marked "I created this" checkbox
**Learning**: Personal language patterns, emotional sentiment, writing style
**Storage**: `ai-memory.json` → `userVoice` section

### Content Classifier AI
**Purpose**: Analyze and categorize external content
**Triggers**: All content without "I created this" checkbox
**Learning**: Content categorization, topic extraction, importance patterns
**Storage**: `ai-memory.json` → `contentAnalysis` section

### AI Coordination
**Purpose**: Prevent cross-contamination while enabling insights
**Function**: Compare user interests vs. user voice for personalized recommendations

## 📊 Data Architecture

### Core Data Schema
```json
{
  "notes": [
    {
      "id": "timestamp",
      "title": "string",
      "content": "string",
      "isUserCreated": "boolean",
      "category": "string",
      "tags": ["array"],
      "rating": "1-5 integer",
      "ratingReason": "string",
      "timestamp": "ISO string",
      "lastModified": "ISO string",
      "sourceUrl": "string optional",
      "contentType": "text|image|web|audio",
      "metadata": "object",
      "connections": ["note IDs"],
      "aiInsights": "object"
    }
  ],
  "aiMemory": {
    "userVoice": {
      "languagePatterns": {},
      "emotionalBaseline": {},
      "writingStyle": {}
    },
    "contentAnalysis": {
      "categoryPatterns": {},
      "interestEvolution": {},
      "topicCorrelations": {}
    },
    "crossInsights": {
      "personalityVsInterests": {},
      "behaviorPatterns": {},
      "connectionDiscoveries": []
    }
  },
  "userConfig": {
    "preferences": {},
    "customCategories": [],
    "templates": [],
    "automationRules": []
  }
}
```

### Storage Strategy
- **Primary**: localStorage for development/single-user
- **Backup**: Export/import JSON files
- **Future**: IndexedDB for performance, cloud sync options

## 🔄 Example Workflows

### Workflow 1: External Article Capture
```
1. User inputs URL via Quick Add
2. web-capture.js → fetches page content + metadata
3. content-classifier.js → analyzes text, suggests category/tags
4. User reviews AI suggestions, adds 1-5 star rating
5. storage-manager.js → saves with isUserCreated: false
6. connection-finder.js → identifies related existing notes
7. insight-generator.js → updates interest patterns
8. discovery-widget.js → may show "New connection found!"
```

### Workflow 2: Personal Journal Entry  
```
1. User writes personal note, checks "I created this"
2. user-voice-ai.js → analyzes writing style, emotional tone
3. text-processor.js → extracts key topics, generates tags
4. User saves without rating (personal content)
5. storage-manager.js → saves with isUserCreated: true
6. pattern-tracker.js → learns user writing patterns
7. time-analyzer.js → notes timing patterns for personal writing
8. template-evolution.js → may suggest new template based on structure
```

### Workflow 3: Image with OCR
```
1. User uploads image via Quick Add
2. image-ocr.js → processes image, extracts text (manual input for now)
3. content-classifier.js → categorizes based on extracted text
4. User rates usefulness 1-5 stars
5. storage-manager.js → saves with image data + OCR text
6. connection-finder.js → links to related text notes
7. learning-system updates OCR pattern recognition
```

### Workflow 4: Discovery Session
```
1. insight-generator.js → runs daily analysis
2. connection-finder.js → identifies new cross-references
3. pattern-tracker.js → detects behavior changes
4. discovery-widget.js → displays "Today I Noticed: You've been saving more coding articles after 6pm lately"
5. User can dismiss, explore, or provide feedback
6. Feedback updates learning algorithms
```

## 🛠️ Technical Implementation Details

### Tech Stack Specification
**Frontend**: Vanilla JavaScript with Web Components
**Testing**: Jest with jsdom for module isolation  
**Build Tool**: Plain ES modules (Vite if bundling needed later)
**PWA**: Service Worker + Web App Manifest
**Storage**: localStorage → IndexedDB migration path planned

### AI Implementation Approach
**Phase 1-3**: Rule-based heuristics with machine learning patterns
- Keyword matching + statistical analysis
- Pattern recognition from user behavior
- No external AI dependencies

**Phase 4+**: Plugin architecture for AI upgrades
- Abstract AI interfaces for future LLM integration
- API endpoints for cloud AI services
- Local model support when technically feasible

### Module Communication Flow
```
Event Bus (central nervous system)
    ↕️
Core Vault ← → Storage Manager ← → AI Memory
    ↕️           ↕️                    ↕️
UI Modules ← → Processing Modules ← → Learning Modules
```

### Standard Module Interface
```javascript
const ModuleTemplate = {
  name: 'module-name',
  version: '1.0.0',
  dependencies: ['core', 'other-modules'],
  
  init(core, config) {
    // Module initialization
    return Promise.resolve();
  },
  
  destroy() {
    // Cleanup on module unload
  },
  
  getAPI() {
    return {
      // Public methods other modules can call
    };
  },
  
  handleEvent(eventType, data) {
    // Handle events from event bus
  }
};
```

### Core API Methods
```javascript
// Event Bus API
EventBus.emit(event, data)
EventBus.on(event, callback)
EventBus.off(event, callback)

// Storage Manager API
Storage.save(key, data)
Storage.load(key)
Storage.getAIMemory()
Storage.updateAIMemory(section, data)

// Core Vault API
Core.addNote(noteData)
Core.updateNote(id, changes)
Core.deleteNote(id)
Core.searchNotes(query)
Core.getConnections(noteId)
```

## 🚀 Development Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Working modular system with basic functionality

**Deliverables**:
1. Core shell (index.html) with module loader
2. Event bus communication system
3. Storage manager with data schema
4. Basic note CRUD operations
5. Simple UI framework

**Success Criteria**: Can add, edit, delete, and view notes

### Phase 2: Dual AI Implementation (Week 3-4)
**Goal**: Intelligent content processing with user/content separation

**Deliverables**:
1. User Voice AI module (personal writing analysis)
2. Content Classifier AI module (external content processing)
3. AI coordinator (prevents cross-contamination)
4. Rating system with evolution tracking
5. Basic connection discovery

**Success Criteria**: AI correctly distinguishes user content vs. collected content

### Phase 3: Advanced Intelligence (Week 5-6)
**Goal**: Pattern recognition and insight generation

**Deliverables**:
1. Time-based pattern learning
2. Cross-reference connection finder
3. Personal insight generator
4. Discovery widget ("Today I Noticed...")
5. Template system with AI evolution

**Success Criteria**: System provides meaningful insights about user patterns

### Phase 4: Content Expansion (Week 7-8)
**Goal**: Handle multiple content types and sources

**Deliverables**:
1. Web capture system (URL + snapshot)
2. Enhanced image processing with OCR
3. Audio/podcast metadata extraction
4. Template evolution system
5. Advanced search with natural language

**Success Criteria**: Can capture and intelligently process diverse content types

### Phase 5: Automation Foundation (Week 9-10)
**Goal**: Prepare for browser extension and mobile integration

**Deliverables**:
1. Quick Add API for external integration
2. Export/import system for data portability
3. Browser extension architecture (preparation)
4. PWA optimization for mobile
5. Performance optimization

**Success Criteria**: System ready for external automation tools

## 🎯 Feature Requirements

### Core Features (Must Have)
- ✅ Add/edit/delete notes with rich metadata
- ✅ Dual AI system (user voice vs. content analysis)
- ✅ Smart categorization and tagging
- ✅ 5-star rating system with reasons
- ✅ Cross-reference connection discovery
- ✅ Time-based pattern learning
- ✅ Basic search and filtering
- ✅ Export to Obsidian format

### Enhanced Features (Should Have)
- 📊 Personal insight dashboard
- 🔗 Intelligent connection suggestions
- 📱 Progressive Web App (PWA) functionality
- 🎯 Dynamic template evolution
- 🔄 Auto-update of old notes with new categories
- 📈 Interest evolution tracking
- 🚀 Quick Add from any source

### Future Features (Could Have)
- 🌐 Browser extension for quick capture
- 📱 Native mobile app
- ☁️ Cloud synchronization
- 🤖 Natural language queries ("show me chicken recipes")
- 📅 Calendar/schedule integration
- 🔊 Full audio transcription
- 🤝 Multi-user collaboration

## 📋 Development Standards

### Code Standards
- **ES6+ JavaScript** for all modules
- **Async/await** for asynchronous operations
- **JSDoc comments** for all public methods
- **Error handling** with try/catch and meaningful messages
- **Console logging** for development (removable for production)

### Module Standards
- **Single responsibility** - each module handles one domain
- **Clear API contracts** - documented public methods
- **Event-driven communication** - no direct module dependencies
- **Graceful degradation** - continue working if optional modules fail
- **Version compatibility** - backwards compatible APIs

### Data Standards
- **Immutable operations** - never mutate stored data directly
- **Schema validation** - validate data structure before storage
- **Migration support** - handle data structure changes
- **Atomic operations** - all-or-nothing data updates

### UI Standards
- **Mobile-first responsive design**
- **Accessible HTML** with proper ARIA labels
- **Progressive enhancement** - works without JavaScript
- **Fast loading** - lazy load non-essential modules
- **Offline capable** - PWA functionality

## 🔍 Testing Strategy

### Unit Testing
- Each module has isolated test coverage
- Mock dependencies for independent testing
- Test both success and error conditions

### Integration Testing
- Test module communication via event bus
- Verify data flow between modules
- Test complete user workflows

### Performance Testing
- Module loading performance
- Large dataset handling
- Memory usage monitoring

## 📈 Success Metrics

### Functionality Metrics
- All Phase 1-5 deliverables completed
- Zero data loss during operations
- Sub-100ms response times for basic operations
- Works on mobile and desktop browsers

### Intelligence Metrics
- AI correctly categorizes 90%+ of content
- Discovers meaningful connections between notes
- Provides useful insights about user patterns
- Learns and improves from user feedback

### User Experience Metrics
- One-click note addition
- Intuitive search and filtering
- Seamless cross-device experience
- Quick loading and responsive interface

## 🚦 Implementation Guidelines

### For Future Claude Conversations
1. **Always refer to this master plan first**
2. **Follow the modular architecture strictly**
3. **Use the defined API contracts**
4. **Maintain code standards throughout**
5. **Test module independence after changes**
6. **Update this plan if architectural changes needed**

### Development Workflow
1. **Start with Phase 1** - establish foundation before advanced features
2. **Complete each phase fully** before moving to next
3. **Test module communication** after each module addition
4. **Maintain backwards compatibility** when updating modules
5. **Document any deviations** from this plan

## 🌐 Deployment Configuration

### Development Setup
- **Local Development**: Open index.html directly in browser (file:// protocol)
- **GitHub Pages**: Repository can be deployed directly to GitHub Pages
- **Web Server**: Any static file server (Python: `python -m http.server`)

### Production Deployment
- **Current**: GitHub Pages at `https://[username].github.io/personal-vault/`
- **Alternative**: Netlify, Vercel, or any static hosting
- **Requirements**: HTTPS required for PWA features (camera, notifications, etc.)

### File Structure for Deployment
```
/personal-vault/
├── index.html          # Entry point
├── manifest.json       # PWA configuration  
├── core/              # Core system files
├── modules/           # Feature modules
├── styles/            # Stylesheets
└── data/             # Schema and config files
```

### PWA Configuration Details
- **App Name**: "Recall" 
- **Theme**: Dark mode primary, system UI fallback
- **Color Scheme**: Dark theme with system preference detection
- **Icons**: Generated from simple logo (to be created)

### External APIs
- **Phase 1-3**: No external APIs (fully local processing)
- **Future Phases**: Plugin architecture ready for API integration
- **Extensible Design**: Easy to add services later without architecture changes

### Development Environment
- **Browser Support**: Modern browsers with ES6+ support
- **Primary Testing**: Chrome/Firefox desktop + mobile
- **PWA Features**: Require HTTPS for full functionality
- **Fallback**: Graceful degradation for older browsers

---

**This specification serves as the single source of truth for Personal Vault v2.0 development. Any future development should reference and follow this plan to ensure consistency and prevent architectural conflicts.**
