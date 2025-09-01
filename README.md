# Recall - Personal Knowledge Vault v2.0

An intelligent, modular personal knowledge repository that learns user patterns, discovers connections between data, and evolves into a comprehensive personal assistant.

## 🎯 Vision
- **Repository-focused**: Collect and organize information about your interests
- **Dual AI tracking**: Separate learning for user-created vs. collected content  
- **Pattern recognition**: Discover connections and insights you'd never think of
- **Cross-platform ready**: Web-first, PWA-enabled for mobile, future native apps

## 🏗️ Architecture
Modular system with clean API contracts enabling independent development:
- **Core System**: Event bus, storage manager, module loader
- **Dual AI**: User voice analysis + content classification
- **Learning System**: Time patterns, behavior analysis, connection discovery
- **Content Processing**: Text, images, web capture, audio metadata
- **Automation Ready**: Browser extensions, mobile integration planned

## 📚 Documentation
- **Complete Development Plan**: `docs/master-project-specification.md`
- **Current Status**: Foundation phase - modular architecture implementation

## 🚀 Development Status
- **v1.0**: Monolithic prototype (index.html) ✅
- **v2.0**: Modular architecture (in development) 🔄
  - Phase 1: Foundation (Core + Storage) 
  - Phase 2: Dual AI Implementation
  - Phase 3: Advanced Intelligence  
  - Phase 4: Content Expansion
  - Phase 5: Automation Foundation

## 🛠️ Tech Stack
- **Frontend**: Vanilla JavaScript with Web Components
- **Storage**: localStorage → IndexedDB migration path
- **Testing**: Jest with module isolation
- **Deployment**: GitHub Pages, PWA-ready
- **Build**: Plain ES modules (Vite if needed later)

## 📱 Features
### Current (v1.0)
- Add/edit/delete notes with AI categorization
- Image upload with manual OCR
- Voice input support  
- Search and filtering
- Obsidian export compatibility

### Planned (v2.0)
- Dual AI system (user voice vs. content analysis)
- Smart connection discovery
- Personal insights dashboard
- Web content capture
- Time-based pattern learning
- Dynamic template evolution
- Browser extension integration

## 🔧 Installation
1. Clone repository
2. Open `index.html` in browser for current version
3. HTTPS required for full PWA features

---

*This project follows a modular architecture designed for maintainability, extensibility, and cross-platform deployment.*
