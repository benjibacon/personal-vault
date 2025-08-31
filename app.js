class PersonalVault {
    constructor() {
        this.notes = [];
        this.categories = ['Recipes', 'Coding', 'Music', 'Games', 'Hobbies', 'Learning', 'Misc'];
        this.isRecording = false;
        this.mediaRecorder = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadNotes();
        this.registerServiceWorker();
    }

    setupEventListeners() {
        // Add button
        document.getElementById('addBtn').addEventListener('click', () => this.openAddModal());
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.closeAddModal());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveNote());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeAddModal());
        
        // Voice recording
        document.getElementById('voiceBtn').addEventListener('click', () => this.toggleVoiceRecording());
        
        // Image upload
        document.getElementById('imageInput').addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', (e) => this.filterNotes(e.target.value));
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchNotes(e.target.value));
        
        // Close modal when clicking outside
        document.getElementById('addModal').addEventListener('click', (e) => {
            if (e.target.id === 'addModal') this.closeAddModal();
        });
    }

    openAddModal() {
        document.getElementById('addModal').style.display = 'block';
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('noteCategory').value = '';
        document.getElementById('imageInput').value = '';
        document.getElementById('noteTitle').focus();
    }

    closeAddModal() {
        document.getElementById('addModal').style.display = 'none';
        this.stopVoiceRecording();
    }

    async saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const manualCategory = document.getElementById('noteCategory').value;
        const imageFile = document.getElementById('imageInput').files[0];

        if (!title && !content && !imageFile) {
            this.showToast('Please add some content', 'error');
            return;
        }

        // Create note object
        const note = {
            id: Date.now(),
            title: title || 'Untitled Note',
            content: content,
            category: manualCategory || await this.categorizeContent(title + ' ' + content),
            timestamp: new Date().toISOString(),
            tags: this.generateTags(title + ' ' + content),
            type: 'text'
        };

        // Handle image if present
        if (imageFile) {
            note.type = 'image';
            note.imageData = await this.processImage(imageFile);
            // Re-categorize with OCR text if available
            if (note.imageData.ocrText) {
                note.category = manualCategory || await this.categorizeContent(note.imageData.ocrText);
                note.tags = [...note.tags, ...this.generateTags(note.imageData.ocrText)];
            }
        }

        // Save note
        await this.saveNoteToDB(note);
        this.loadNotes();
        this.closeAddModal();
        this.showToast('Note saved successfully!', 'success');
    }

    async saveNoteToDB(note) {
        // Get existing notes
        let notes = JSON.parse(localStorage.getItem('vault_notes')) || [];
        
        // Add new note
        notes.push(note);
        
        // Save back to localStorage
        localStorage.setItem('vault_notes', JSON.stringify(notes));
        
        return Promise.resolve(note.id);
    }

    async loadNotes() {
        const notes = JSON.parse(localStorage.getItem('vault_notes')) || [];
        this.notes = notes;
        this.displayNotes(notes);
        this.updateStats(notes);
    }

    displayNotes(notes) {
        const notesContainer = document.getElementById('notesContainer');
        
        if (notes.length === 0) {
            notesContainer.innerHTML = '<div class="no-notes">No notes yet. Click + to add your first note!</div>';
            return;
        }

        notesContainer.innerHTML = notes.map(note => `
            <div class="note-card" data-category="${note.category}">
                <div class="note-header">
                    <h3>${note.title}</h3>
                    <span class="category-badge ${note.category.toLowerCase()}">${note.category}</span>
                </div>
                <div class="note-content">
                    ${note.type === 'image' && note.imageData ? 
                        `<img src="${note.imageData.dataUrl}" alt="Note image" class="note-image">` : ''}
                    <p>${note.content || 'No text content'}</p>
                </div>
                <div class="note-footer">
                    <div class="note-tags">
                        ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <small class="note-timestamp">${new Date(note.timestamp).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }

    updateStats(notes) {
        const totalNotes = notes.length;
        const categoryCounts = {};
        
        notes.forEach(note => {
            categoryCounts[note.category] = (categoryCounts[note.category] || 0) + 1;
        });

        document.getElementById('totalNotes').textContent = totalNotes;
        
        // Update category filter options
        const categoryFilter = document.getElementById('categoryFilter');
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        Object.keys(categoryCounts).forEach(category => {
            categoryFilter.innerHTML += `<option value="${category}">${category} (${categoryCounts[category]})</option>`;
        });
    }

    async categorizeContent(text) {
        const content = text.toLowerCase();
        
        // Recipe keywords
        if (content.match(/\b(recipe|cook|bake|ingredient|cup|tablespoon|oven|flour|sugar|salt|pepper|chicken|beef|pasta|sauce|meal|dinner|lunch|breakfast|food)\b/)) {
            return 'Recipes';
        }
        
        // Coding keywords
        if (content.match(/\b(code|programming|javascript|python|html|css|function|variable|array|object|debug|api|database|server|client)\b/)) {
            return 'Coding';
        }
        
        // Music keywords
        if (content.match(/\b(music|song|guitar|piano|drum|chord|melody|rhythm|album|artist|concert|band|lyrics|note|scale)\b/)) {
            return 'Music';
        }
        
        // Games keywords
        if (content.match(/\b(game|gaming|play|player|level|score|quest|character|strategy|puzzle|arcade|console|pc|mobile)\b/)) {
            return 'Games';
        }
        
        // Learning keywords
        if (content.match(/\b(learn|study|course|tutorial|lesson|education|knowledge|skill|practice|training|research|book|article)\b/)) {
            return 'Learning';
        }
        
        // Hobbies keywords
        if (content.match(/\b(hobby|craft|art|draw|paint|photography|garden|collect|build|make|create|diy|project)\b/)) {
            return 'Hobbies';
        }
        
        return 'Misc';
    }

    generateTags(text) {
        const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
        const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'end', 'few', 'got', 'man', 'own', 'say', 'she', 'too', 'use'];
        
        const tags = [...new Set(words)]
            .filter(word => !commonWords.includes(word))
            .slice(0, 5);
            
        return tags;
    }

    async processImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = {
                    dataUrl: e.target.result,
                    fileName: file.name,
                    fileSize: file.size,
                    ocrText: null // OCR not implemented yet
                };
                
                // TODO: Implement OCR here
                // For now, return basic image data
                resolve(imageData);
            };
            reader.readAsDataURL(file);
        });
    }

    filterNotes(category) {
        const filteredNotes = category ? 
            this.notes.filter(note => note.category === category) : 
            this.notes;
        this.displayNotes(filteredNotes);
    }

    searchNotes(query) {
        if (!query) {
            this.displayNotes(this.notes);
            return;
        }
        
        const searchResults = this.notes.filter(note => 
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.content.toLowerCase().includes(query.toLowerCase()) ||
            note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
        
        this.displayNotes(searchResults);
    }

    async toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    }

    async startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            
            let audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                await this.processVoiceRecording(audioBlob);
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            const voiceBtn = document.getElementById('voiceBtn');
            voiceBtn.textContent = '🔴 Recording...';
            voiceBtn.style.background = '#ff4444';
            
        } catch (error) {
            console.error('Error starting voice recording:', error);
            this.showToast('Could not access microphone', 'error');
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            const voiceBtn = document.getElementById('voiceBtn');
            voiceBtn.textContent = '🎤 Voice';
            voiceBtn.style.background = '';
        }
    }

    async processVoiceRecording(audioBlob) {
        // Simple implementation - just add a placeholder
        // In a real app, you'd send this to a speech-to-text service
        const noteContent = document.getElementById('noteContent');
        const currentContent = noteContent.value;
        const transcription = '[Voice recording - transcription not implemented yet]';
        
        noteContent.value = currentContent + (currentContent ? '\n\n' : '') + transcription;
        
        this.showToast('Voice recording added (transcription pending)', 'info');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./service-worker.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.personalVault = new PersonalVault();
});
