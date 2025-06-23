class MindMapApp {
    constructor() {
        this.currentPage = 'landing';
        this.mindMap = null;
        this.xmlHandler = new XMLHandler();
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.showLandingPage();
        await this.checkAuthStatus();
    }

    setupEventListeners() {
        // Landing page
        document.getElementById('go-to-app').addEventListener('click', () => {
            this.showAppPage();
        });

        // Navigation
        document.getElementById('back-to-home').addEventListener('click', () => {
            this.showLandingPage();
        });

        // Mind map controls
        document.getElementById('new-mindmap').addEventListener('click', () => {
            this.newMindMap();
        });

        document.getElementById('save-mindmap').addEventListener('click', () => {
            this.saveMindMap();
        });

        document.getElementById('load-btn').addEventListener('click', () => {
            document.getElementById('load-mindmap').click();
        });

        document.getElementById('load-mindmap').addEventListener('change', (e) => {
            this.loadMindMap(e.target.files[0]);
        });

        document.getElementById('add-node').addEventListener('click', () => {
            this.addNode();
        });

        document.getElementById('delete-node').addEventListener('click', () => {
            this.deleteSelectedNode();
        });

        document.getElementById('connect-mode').addEventListener('click', () => {
            this.toggleConnectMode();
        });

        document.getElementById('help-shortcuts').addEventListener('click', () => {
            this.showShortcutsHelp();
        });

        document.getElementById('close-shortcuts').addEventListener('click', () => {
            this.hideShortcutsHelp();
        });

        document.getElementById('templates-btn').addEventListener('click', () => {
            this.showTemplatesModal();
        });

        document.getElementById('cancel-template').addEventListener('click', () => {
            this.hideTemplatesModal();
        });

        // Template selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.template-item')) {
                const templateType = e.target.closest('.template-item').dataset.template;
                this.createFromTemplate(templateType);
            }
        });

        // Collaboration event listeners
        document.getElementById('login-btn').addEventListener('click', () => {
            this.showAuthModal();
        });

        // Auth modal handlers
        document.getElementById('login-tab').addEventListener('click', () => {
            this.switchAuthTab('login');
        });

        document.getElementById('signup-tab').addEventListener('click', () => {
            this.switchAuthTab('signup');
        });

        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailAuth();
        });

        document.getElementById('auth-cancel').addEventListener('click', () => {
            this.hideAuthModal();
        });

        document.getElementById('google-auth').addEventListener('click', () => {
            this.handleGoogleAuth();
        });

        // Collaboration handlers
        document.getElementById('save-cloud').addEventListener('click', () => {
            this.saveToCloud();
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            this.showShareModal();
        });

        document.getElementById('collaborate-btn').addEventListener('click', () => {
            this.showJoinRoomModal();
        });

        document.getElementById('save-cloud').addEventListener('click', () => {
            this.saveToCloud();
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            this.showShareModal();
        });

        document.getElementById('collaborate-btn').addEventListener('click', () => {
            this.showJoinRoomModal();
        });

        document.getElementById('close-share-modal').addEventListener('click', () => {
            this.hideShareModal();
        });

        document.getElementById('copy-share-code').addEventListener('click', () => {
            this.copyShareCode();
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.joinCollaborationRoom();
        });

        document.getElementById('cancel-join-room').addEventListener('click', () => {
            this.hideJoinRoomModal();
        });

        // Initialize collaboration properties
        this.collaboration = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.currentMindMapId = null;
        this.currentMindMapTitle = null;

        document.getElementById('templates-btn').addEventListener('click', () => {
            this.showTemplates();
        });

        document.getElementById('cancel-template').addEventListener('click', () => {
            this.hideTemplates();
        });

        // Template selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.template-card')) {
                const templateType = e.target.closest('.template-card').dataset.template;
                this.loadTemplate(templateType);
            }
        });

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.mindMap?.zoomIn();
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.mindMap?.zoomOut();
        });

        document.getElementById('reset-view').addEventListener('click', () => {
            this.mindMap?.resetView();
        });

        // Modal controls
        document.getElementById('save-node').addEventListener('click', () => {
            this.saveNodeEdit();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.cancelNodeEdit();
        });

        // File operation handlers
        document.getElementById('save-mindmap').addEventListener('click', () => {
            this.saveMindMap();
        });

        document.getElementById('load-btn').addEventListener('click', () => {
            document.getElementById('load-mindmap').click();
        });

        document.getElementById('load-mindmap').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadMindMap(e.target.files[0]);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // Prevent default drag behavior on the page
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    showLandingPage() {
        document.getElementById('landing-page').classList.remove('hidden');
        document.getElementById('app-page').classList.add('hidden');
        this.currentPage = 'landing';
    }

    showAppPage() {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('app-page').classList.remove('hidden');
        this.currentPage = 'app';
        
        if (!this.mindMap) {
            this.mindMap = new MindMap('mindmap-canvas');
            this.setupMindMapEvents();
        }
    }

    setupMindMapEvents() {
        this.mindMap.on('nodeSelected', (node) => {
            document.getElementById('delete-node').disabled = !node;
            if (node) {
                this.updateDebugInfo(`Selected: Node ${node.id} at (${Math.round(node.x)}, ${Math.round(node.y)})`);
            } else {
                this.updateDebugInfo('');
            }
        });

        this.mindMap.on('nodeDoubleClick', (node) => {
            this.editNode(node);
            this.updateDebugInfo(`Editing: Node ${node.id} - "${node.text}"`);
        });

        this.mindMap.on('statusUpdate', (message) => {
            document.getElementById('status-text').textContent = message;
        });

        this.mindMap.on('zoomChange', (zoomLevel) => {
            document.getElementById('zoom-level').textContent = `${Math.round(zoomLevel * 100)}%`;
        });

        this.mindMap.on('debugInfo', (info) => {
            this.updateDebugInfo(info);
        });

        this.mindMap.on('connectionModeChange', (isActive) => {
            const btn = document.getElementById('connect-mode');
            if (isActive) {
                btn.classList.add('active');
                btn.textContent = 'Exit Connect';
            } else {
                btn.classList.remove('active');
                btn.textContent = 'Connect Mode';
            }
        });

        this.mindMap.on('connectionSelected', (connection) => {
            if (connection) {
                this.updateDebugInfo(`Connection selected: ${connection.fromId} → ${connection.toId}`);
            }
        });
    }

    newMindMap() {
        if (confirm('Create a new mind map? This will clear the current one.')) {
            this.mindMap.clear();
            this.updateStatus('New mind map created');
        }
    }

    saveMindMap() {
        try {
            const data = this.mindMap.getData();
            const xmlContent = this.xmlHandler.serialize(data);
            this.downloadFile(xmlContent, 'mindmap.xml', 'application/xml');
            this.updateStatus('Mind map saved successfully');
            this.updateDebugInfo(`Saved: ${data.nodes.length} nodes, ${data.connections.length} connections`);
        } catch (error) {
            this.updateStatus('Error saving mind map: ' + error.message);
            this.updateDebugInfo(`Save error: ${error.message}`);
            console.error('Save error:', error);
        }
    }

    loadMindMap(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = this.xmlHandler.deserialize(e.target.result);
                this.mindMap.loadData(data);
                this.updateStatus(`Mind map loaded: ${file.name}`);
                this.updateDebugInfo(`Loaded: ${data.nodes.length} nodes, ${data.connections.length} connections from ${file.name}`);
            } catch (error) {
                this.updateStatus('Error loading mind map: ' + error.message);
                this.updateDebugInfo(`Load error: ${error.message}`);
                console.error('Load error:', error);
            }
        };
        reader.readAsText(file);
    }

    addNode() {
        const node = this.mindMap.addNode();
        this.updateDebugInfo(`Added: Node ${node.id} at (${Math.round(node.x)}, ${Math.round(node.y)})`);
        this.editNode(node);
    }

    deleteSelectedNode() {
        const selectedNode = this.mindMap.selectedNode;
        if (this.mindMap.deleteSelectedNode()) {
            this.updateStatus('Node deleted');
            this.updateDebugInfo(`Deleted: Node ${selectedNode.id}`);
        }
    }

    editNode(node) {
        const modal = document.getElementById('node-editor');
        const textArea = document.getElementById('node-text');
        const colorInput = document.getElementById('node-color');

        textArea.value = node.text || '';
        colorInput.value = node.color || '#e3f2fd';
        
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
        textArea.focus();

        this.editingNode = node;
    }

    saveNodeEdit() {
        if (!this.editingNode) return;

        const text = document.getElementById('node-text').value.trim();
        const color = document.getElementById('node-color').value;

        if (text) {
            this.mindMap.updateNode(this.editingNode.id, { text, color });
            this.updateStatus('Node updated');
        } else {
            this.updateStatus('Node text cannot be empty');
            return;
        }

        this.cancelNodeEdit();
    }

    cancelNodeEdit() {
        document.getElementById('node-editor').classList.add('hidden');
        this.editingNode = null;
    }

    handleKeyboard(e) {
        if (this.currentPage !== 'app') return;

        // Don't handle shortcuts when typing in modal
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (this.mindMap.selectedNode) {
                    this.deleteSelectedNode();
                    e.preventDefault();
                } else if (this.mindMap.selectedConnection) {
                    this.mindMap.deleteSelectedConnection();
                    e.preventDefault();
                }
                break;
            case 'Enter':
                this.addNode();
                e.preventDefault();
                break;
            case 'Escape':
                if (!document.getElementById('templates-modal').classList.contains('hidden')) {
                    this.hideTemplates();
                } else if (!document.getElementById('shortcuts-modal').classList.contains('hidden')) {
                    this.hideShortcutsHelp();
                } else if (!document.getElementById('node-editor').classList.contains('hidden')) {
                    this.cancelNodeEdit();
                } else {
                    this.mindMap.clearSelection();
                }
                e.preventDefault();
                break;
            case '=':
            case '+':
                if (e.ctrlKey || e.metaKey) {
                    this.mindMap.zoomIn();
                    e.preventDefault();
                }
                break;
            case '-':
                if (e.ctrlKey || e.metaKey) {
                    this.mindMap.zoomOut();
                    e.preventDefault();
                }
                break;
            case '0':
                if (e.ctrlKey || e.metaKey) {
                    this.mindMap.resetView();
                    e.preventDefault();
                }
                break;
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    this.saveMindMap();
                    e.preventDefault();
                }
                break;
            case 'o':
                if (e.ctrlKey || e.metaKey) {
                    document.getElementById('load-mindmap').click();
                    e.preventDefault();
                }
                break;
            case 'n':
                if (e.ctrlKey || e.metaKey) {
                    this.newMindMap();
                    e.preventDefault();
                }
                break;
            case '?':
            case '/':
                if (!e.ctrlKey && !e.metaKey) {
                    this.showShortcutsHelp();
                    e.preventDefault();
                }
                break;
        }
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    updateStatus(message) {
        document.getElementById('status-text').textContent = message;
        setTimeout(() => {
            if (document.getElementById('status-text').textContent === message) {
                document.getElementById('status-text').textContent = 'Ready';
            }
        }, 3000);
    }

    updateDebugInfo(info) {
        document.getElementById('debug-info').textContent = info;
    }

    toggleConnectMode() {
        this.mindMap.toggleConnectMode();
    }

    showShortcutsHelp() {
        const modal = document.getElementById('shortcuts-modal');
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
        this.updateDebugInfo('Showing keyboard shortcuts help');
    }

    hideShortcutsHelp() {
        document.getElementById('shortcuts-modal').classList.add('hidden');
        this.updateDebugInfo('');
    }

    showTemplatesModal() {
        const modal = document.getElementById('templates-modal');
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
        this.updateDebugInfo('Showing templates');
    }

    hideTemplatesModal() {
        document.getElementById('templates-modal').classList.add('hidden');
        this.updateDebugInfo('');
    }

    createFromTemplate(templateType) {
        this.hideTemplatesModal();
        
        if (this.mindMap.nodes.size > 1 || (this.mindMap.nodes.size === 1 && Array.from(this.mindMap.nodes.values())[0].text !== 'Central Idea')) {
            if (!confirm('Create new mind map from template? This will replace the current mind map.')) {
                return;
            }
        }

        this.mindMap.clear();
        
        const template = this.getTemplate(templateType);
        if (template) {
            this.mindMap.loadData(template);
            this.updateStatus(`Created mind map from ${this.getTemplateName(templateType)} template`);
            this.updateDebugInfo(`Template loaded: ${templateType} - ${template.nodes.length} nodes, ${template.connections.length} connections`);
        }
    }

    getTemplateName(templateType) {
        const names = {
            'project-planning': 'Project Planning',
            'decision-making': 'Decision Making',
            'learning': 'Learning Map',
            'business-strategy': 'Business Strategy',
            'swot-analysis': 'SWOT Analysis',
            'brainstorming': 'Brainstorming',
            'meeting-notes': 'Meeting Notes',
            'problem-solving': 'Problem Solving'
        };
        return names[templateType] || 'Unknown';
    }

    getTemplate(templateType) {
        const templates = {
            'project-planning': {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Project Name', color: '#ffeb3b', width: 150, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Goals & Objectives', color: '#e3f2fd', width: 140, height: 60 },
                    { id: 3, x: 550, y: 200, text: 'Timeline', color: '#e8f5e8', width: 120, height: 60 },
                    { id: 4, x: 250, y: 400, text: 'Resources', color: '#fce4ec', width: 120, height: 60 },
                    { id: 5, x: 550, y: 400, text: 'Deliverables', color: '#fff3e0', width: 120, height: 60 },
                    { id: 6, x: 150, y: 150, text: 'Phase 1', color: '#f3e5f5', width: 100, height: 50 },
                    { id: 7, x: 150, y: 250, text: 'Phase 2', color: '#f3e5f5', width: 100, height: 50 },
                    { id: 8, x: 650, y: 150, text: 'Milestones', color: '#e0f2f1', width: 100, height: 50 },
                    { id: 9, x: 650, y: 250, text: 'Deadlines', color: '#e0f2f1', width: 100, height: 50 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 },
                    { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 3, toId: 9 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            'decision-making': {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Decision to Make', color: '#ffeb3b', width: 150, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Pros', color: '#e8f5e8', width: 120, height: 60 },
                    { id: 3, x: 550, y: 200, text: 'Cons', color: '#ffebee', width: 120, height: 60 },
                    { id: 4, x: 400, y: 450, text: 'Criteria', color: '#e3f2fd', width: 120, height: 60 },
                    { id: 5, x: 150, y: 150, text: 'Benefit 1', color: '#f1f8e9', width: 100, height: 50 },
                    { id: 6, x: 150, y: 250, text: 'Benefit 2', color: '#f1f8e9', width: 100, height: 50 },
                    { id: 7, x: 650, y: 150, text: 'Risk 1', color: '#fce4ec', width: 100, height: 50 },
                    { id: 8, x: 650, y: 250, text: 'Risk 2', color: '#fce4ec', width: 100, height: 50 },
                    { id: 9, x: 300, y: 500, text: 'Cost', color: '#e1f5fe', width: 80, height: 50 },
                    { id: 10, x: 400, y: 520, text: 'Time', color: '#e1f5fe', width: 80, height: 50 },
                    { id: 11, x: 500, y: 500, text: 'Impact', color: '#e1f5fe', width: 80, height: 50 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 },
                    { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 2, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 3, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 4, toId: 9 },
                    { id: 9, fromId: 4, toId: 10 },
                    { id: 10, fromId: 4, toId: 11 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            'learning': {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Learning Topic', color: '#ffeb3b', width: 150, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Prerequisites', color: '#e3f2fd', width: 120, height: 60 },
                    { id: 3, x: 550, y: 200, text: 'Core Concepts', color: '#e8f5e8', width: 120, height: 60 },
                    { id: 4, x: 250, y: 400, text: 'Resources', color: '#fff3e0', width: 120, height: 60 },
                    { id: 5, x: 550, y: 400, text: 'Practice', color: '#fce4ec', width: 120, height: 60 },
                    { id: 6, x: 150, y: 150, text: 'Basic Math', color: '#e1f5fe', width: 100, height: 50 },
                    { id: 7, x: 150, y: 250, text: 'Fundamentals', color: '#e1f5fe', width: 100, height: 50 },
                    { id: 8, x: 650, y: 150, text: 'Key Principle 1', color: '#f1f8e9', width: 110, height: 50 },
                    { id: 9, x: 650, y: 250, text: 'Key Principle 2', color: '#f1f8e9', width: 110, height: 50 },
                    { id: 10, x: 150, y: 450, text: 'Books', color: '#fff8e1', width: 80, height: 50 },
                    { id: 11, x: 250, y: 480, text: 'Videos', color: '#fff8e1', width: 80, height: 50 },
                    { id: 12, x: 650, y: 450, text: 'Exercises', color: '#fce4ec', width: 80, height: 50 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 },
                    { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 3, toId: 9 },
                    { id: 9, fromId: 4, toId: 10 },
                    { id: 10, fromId: 4, toId: 11 },
                    { id: 11, fromId: 5, toId: 12 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            'business-strategy': {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Business Strategy', color: '#ffeb3b', width: 160, height: 60 },
                    { id: 2, x: 250, y: 180, text: 'Vision & Mission', color: '#e3f2fd', width: 140, height: 60 },
                    { id: 3, x: 550, y: 180, text: 'Market Analysis', color: '#e8f5e8', width: 140, height: 60 },
                    { id: 4, x: 200, y: 420, text: 'Operations', color: '#fff3e0', width: 120, height: 60 },
                    { id: 5, x: 400, y: 450, text: 'Financial Goals', color: '#fce4ec', width: 140, height: 60 },
                    { id: 6, x: 600, y: 420, text: 'Marketing', color: '#f3e5f5', width: 120, height: 60 },
                    { id: 7, x: 150, y: 130, text: 'Values', color: '#e1f5fe', width: 90, height: 50 },
                    { id: 8, x: 350, y: 130, text: 'Goals', color: '#e1f5fe', width: 90, height: 50 },
                    { id: 9, x: 650, y: 130, text: 'Competitors', color: '#f1f8e9', width: 100, height: 50 },
                    { id: 10, x: 550, y: 100, text: 'Target Market', color: '#f1f8e9', width: 110, height: 50 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 },
                    { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 1, toId: 6 },
                    { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 2, toId: 8 },
                    { id: 8, fromId: 3, toId: 9 },
                    { id: 9, fromId: 3, toId: 10 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            'swot-analysis': {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'SWOT Analysis', color: '#ffeb3b', width: 150, height: 60 },
                    { id: 2, x: 250, y: 180, text: 'Strengths', color: '#e8f5e8', width: 120, height: 60 },
                    { id: 3, x: 550, y: 180, text: 'Weaknesses', color: '#ffebee', width: 120, height: 60 },
                    { id: 4, x: 250, y: 420, text: 'Opportunities', color: '#e3f2fd', width: 140, height: 60 },
                    { id: 5, x: 550, y: 420, text: 'Threats', color: '#fff3e0', width: 120, height: 60 },
                    { id: 6, x: 150, y: 130, text: 'Advantage 1', color: '#f1f8e9', width: 100, height: 50 },
                    { id: 7, x: 350, y: 130, text: 'Advantage 2', color: '#f1f8e9', width: 100, height: 50 },
                    { id: 8, x: 650, y: 130, text: 'Limitation 1', color: '#fce4ec', width: 100, height: 50 },
                    { id: 9, x: 450, y: 130, text: 'Limitation 2', color: '#fce4ec', width: 100, height: 50 },
                    { id: 10, x: 150, y: 470, text: 'Market Gap', color: '#e1f5fe', width: 100, height: 50 },
                    { id: 11, x: 350, y: 470, text: 'Growth Area', color: '#e1f5fe', width: 100, height: 50 },
                    { id: 12, x: 650, y: 470, text: 'Competition', color: '#fff8e1', width: 100, height: 50 },
                    { id: 13, x: 450, y: 470, text: 'Risk Factor', color: '#fff8e1', width: 100, height: 50 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 },
                    { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 3, toId: 9 },
                    { id: 9, fromId: 4, toId: 10 },
                    { id: 10, fromId: 4, toId: 11 },
                    { id: 11, fromId: 5, toId: 12 },
                    { id: 12, fromId: 5, toId: 13 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            'brainstorming': {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Brainstorming Topic', color: '#ffeb3b', width: 170, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Ideas Category 1', color: '#e3f2fd', width: 140, height: 60 },
                    { id: 3, x: 550, y: 200, text: 'Ideas Category 2', color: '#e8f5e8', width: 140, height: 60 },
                    { id: 4, x: 250, y: 400, text: 'Wild Ideas', color: '#fce4ec', width: 120, height: 60 },
                    { id: 5, x: 550, y: 400, text: 'Practical Ideas', color: '#fff3e0', width: 130, height: 60 },
                    { id: 6, x: 150, y: 150, text: 'Idea A', color: '#e1f5fe', width: 80, height: 50 },
                    { id: 7, x: 150, y: 250, text: 'Idea B', color: '#e1f5fe', width: 80, height: 50 },
                    { id: 8, x: 650, y: 150, text: 'Idea C', color: '#f1f8e9', width: 80, height: 50 },
                    { id: 9, x: 650, y: 250, text: 'Idea D', color: '#f1f8e9', width: 80, height: 50 },
                    { id: 10, x: 150, y: 450, text: 'Creative Solution', color: '#fce4ec', width: 120, height: 50 },
                    { id: 11, x: 650, y: 450, text: 'Actionable Item', color: '#fff8e1', width: 120, height: 50 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 },
                    { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 3, toId: 9 },
                    { id: 9, fromId: 4, toId: 10 },
                    { id: 10, fromId: 5, toId: 11 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            'meeting-notes': {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Meeting Topic', color: '#ffeb3b', width: 140, height: 60 },
                    { id: 2, x: 250, y: 180, text: 'Agenda Items', color: '#e3f2fd', width: 120, height: 60 },
                    { id: 3, x: 550, y: 180, text: 'Key Decisions', color: '#e8f5e8', width: 130, height: 60 },
                    { id: 4, x: 250, y: 420, text: 'Action Items', color: '#fff3e0', width: 120, height: 60 },
                    { id: 5, x: 550, y: 420, text: 'Follow-up', color: '#fce4ec', width: 120, height: 60 },
                    { id: 6, x: 150, y: 130, text: 'Topic 1', color: '#e1f5fe', width: 80, height: 50 },
                    { id: 7, x: 350, y: 130, text: 'Topic 2', color: '#e1f5fe', width: 80, height: 50 },
                    { id: 8, x: 650, y: 130, text: 'Decision A', color: '#f1f8e9', width: 90, height: 50 },
                    { id: 9, x: 450, y: 130, text: 'Decision B', color: '#f1f8e9', width: 90, height: 50 },
                    { id: 10, x: 150, y: 470, text: 'Task 1 - Owner', color: '#fff8e1', width: 120, height: 50 },
                    { id: 11, x: 350, y: 470, text: 'Task 2 - Owner', color: '#fff8e1', width: 120, height: 50 },
                    { id: 12, x: 650, y: 470, text: 'Next Meeting', color: '#fce4ec', width: 100, height: 50 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 },
                    { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 3, toId: 9 },
                    { id: 9, fromId: 4, toId: 10 },
                    { id: 10, fromId: 4, toId: 11 },
                    { id: 11, fromId: 5, toId: 12 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            'problem-solving': {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Problem Statement', color: '#ffeb3b', width: 160, height: 60 },
                    { id: 2, x: 250, y: 180, text: 'Root Causes', color: '#ffebee', width: 120, height: 60 },
                    { id: 3, x: 550, y: 180, text: 'Potential Solutions', color: '#e8f5e8', width: 150, height: 60 },
                    { id: 4, x: 250, y: 420, text: 'Impact Analysis', color: '#e3f2fd', width: 130, height: 60 },
                    { id: 5, x: 550, y: 420, text: 'Implementation', color: '#fff3e0', width: 130, height: 60 },
                    { id: 6, x: 150, y: 130, text: 'Cause 1', color: '#fce4ec', width: 80, height: 50 },
                    { id: 7, x: 350, y: 130, text: 'Cause 2', color: '#fce4ec', width: 80, height: 50 },
                    { id: 8, x: 650, y: 130, text: 'Solution A', color: '#f1f8e9', width: 90, height: 50 },
                    { id: 9, x: 450, y: 130, text: 'Solution B', color: '#f1f8e9', width: 90, height: 50 },
                    { id: 10, x: 150, y: 470, text: 'Risks', color: '#e1f5fe', width: 80, height: 50 },
                    { id: 11, x: 350, y: 470, text: 'Benefits', color: '#e1f5fe', width: 80, height: 50 },
                    { id: 12, x: 650, y: 470, text: 'Action Plan', color: '#fff8e1', width: 100, height: 50 },
                    { id: 13, x: 450, y: 470, text: 'Timeline', color: '#fff8e1', width: 80, height: 50 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 },
                    { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 3, toId: 9 },
                    { id: 9, fromId: 4, toId: 10 },
                    { id: 10, fromId: 4, toId: 11 },
                    { id: 11, fromId: 5, toId: 12 },
                    { id: 12, fromId: 5, toId: 13 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            }
        };

        return templates[templateType] || null;
    }

    // Authentication methods
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/user');
            if (response.ok) {
                this.currentUser = await response.json();
                this.isAuthenticated = true;
                this.updateAuthUI();
            }
        } catch (error) {
            console.log('Not authenticated');
        }
    }

    showAuthModal() {
        if (this.isAuthenticated) {
            // Logout
            window.location.href = '/api/logout';
            return;
        }

        const modal = document.getElementById('auth-modal');
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        modal.classList.add('hidden');
        modal.classList.remove('fade-in');
    }

    switchAuthTab(mode) {
        const loginTab = document.getElementById('login-tab');
        const signupTab = document.getElementById('signup-tab');
        const title = document.getElementById('auth-modal-title');
        const submitBtn = document.getElementById('auth-submit');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const nameGroup = document.getElementById('name-group');

        if (mode === 'signup') {
            loginTab.classList.remove('active');
            signupTab.classList.add('active');
            title.textContent = 'Sign Up';
            submitBtn.textContent = 'Sign Up';
            confirmPasswordGroup.style.display = 'block';
            nameGroup.style.display = 'block';
            document.getElementById('auth-confirm-password').required = true;
            document.getElementById('auth-name').required = true;
        } else {
            signupTab.classList.remove('active');
            loginTab.classList.add('active');
            title.textContent = 'Login';
            submitBtn.textContent = 'Login';
            confirmPasswordGroup.style.display = 'none';
            nameGroup.style.display = 'none';
            document.getElementById('auth-confirm-password').required = false;
            document.getElementById('auth-name').required = false;
        }
    }

    async handleEmailAuth() {
        const isSignup = document.getElementById('signup-tab').classList.contains('active');
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const confirmPassword = document.getElementById('auth-confirm-password').value;
        const name = document.getElementById('auth-name').value;

        if (isSignup && password !== confirmPassword) {
            this.updateStatus('Passwords do not match');
            return;
        }

        try {
            const endpoint = isSignup ? '/api/register' : '/api/login';
            const body = isSignup 
                ? { email, password, firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') }
                : { email, password };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData;
                this.isAuthenticated = true;
                this.updateAuthUI();
                this.hideAuthModal();
                this.updateStatus(`Welcome, ${userData.firstName || userData.email}!`);
            } else {
                const error = await response.text();
                this.updateStatus(`Authentication failed: ${error}`);
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.updateStatus('Authentication failed');
        }
    }

    handleGoogleAuth() {
        this.hideAuthModal();
        window.location.href = '/api/login';
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const saveCloudBtn = document.getElementById('save-cloud');
        const shareBtn = document.getElementById('share-btn');
        const collaborateBtn = document.getElementById('collaborate-btn');

        if (this.isAuthenticated) {
            loginBtn.textContent = 'Logout';
            loginBtn.classList.remove('primary');
            saveCloudBtn.disabled = false;
            shareBtn.disabled = false;
            collaborateBtn.disabled = false;
            
            this.updateStatus(`Logged in as ${this.currentUser.firstName || this.currentUser.email}`);
        } else {
            loginBtn.textContent = 'Login';
            loginBtn.classList.add('primary');
            saveCloudBtn.disabled = true;
            shareBtn.disabled = true;
            collaborateBtn.disabled = true;
        }
    }

    // Cloud storage methods
    async saveToCloud() {
        if (!this.isAuthenticated) {
            this.updateStatus('Please login to save to cloud');
            return;
        }

        try {
            const mindMapData = this.mindMap.getData();
            const title = prompt('Enter mind map title:', 'My Mind Map');
            if (!title) return;

            const response = await fetch('/api/mindmaps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    data: mindMapData,
                    isPublic: false
                })
            });

            if (response.ok) {
                const mindMap = await response.json();
                this.currentMindMapId = mindMap.id;
                this.updateStatus(`Saved to cloud: ${title}`);
                this.updateDebugInfo(`Mind map saved with ID: ${mindMap.id}`);
            } else {
                throw new Error('Failed to save to cloud');
            }
        } catch (error) {
            console.error('Error saving to cloud:', error);
            this.updateStatus('Failed to save to cloud');
        }
    }

    // Collaboration methods
    showShareModal() {
        if (!this.currentMindMapId) {
            this.updateStatus('Please save to cloud first');
            return;
        }

        // Generate share code (this would come from the server)
        const shareCode = 'DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        document.getElementById('share-code').value = shareCode;
        
        const modal = document.getElementById('share-modal');
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
    }

    hideShareModal() {
        document.getElementById('share-modal').classList.add('hidden');
    }

    copyShareCode() {
        const shareCodeInput = document.getElementById('share-code');
        shareCodeInput.select();
        document.execCommand('copy');
        this.updateStatus('Share code copied to clipboard');
    }

    showJoinRoomModal() {
        const modal = document.getElementById('join-room-modal');
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
    }

    hideJoinRoomModal() {
        document.getElementById('join-room-modal').classList.add('hidden');
        document.getElementById('room-code').value = '';
    }

    async joinCollaborationRoom() {
        const roomCode = document.getElementById('room-code').value.trim();
        if (!roomCode) {
            this.updateStatus('Please enter a room code');
            return;
        }

        if (!this.isAuthenticated) {
            this.updateStatus('Please login to join collaboration');
            return;
        }

        try {
            // Verify the share code exists
            const response = await fetch(`/api/mindmaps/share/${roomCode}`);
            if (!response.ok) {
                throw new Error('Invalid share code');
            }

            const mindMapInfo = await response.json();
            
            // Initialize collaboration
            if (!this.collaboration) {
                this.collaboration = new CollaborationClient(this);
            }

            await this.collaboration.connect(mindMapInfo.id, this.currentUser.id, roomCode);
            this.hideJoinRoomModal();
            this.updateStatus(`Joined collaboration: ${mindMapInfo.title}`);
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.updateStatus('Failed to join collaboration room');
        }
    }

    setupCollaborationEvents() {
        if (!this.collaboration) return;

        // Listen for mind map changes and broadcast them
        this.mindMap.on('nodeAdded', (data) => {
            this.collaboration.broadcastChange('node_add', { nodeData: data });
        });

        this.mindMap.on('nodeUpdated', (data) => {
            this.collaboration.broadcastChange('node_update', data);
        });

        this.mindMap.on('nodeDeleted', (data) => {
            this.collaboration.broadcastChange('node_delete', data);
        });

        this.mindMap.on('connectionAdded', (data) => {
            this.collaboration.broadcastChange('connection_add', data);
        });

        this.mindMap.on('connectionDeleted', (data) => {
            this.collaboration.broadcastChange('connection_delete', data);
        });

        // Broadcast cursor movements
        document.getElementById('mindmap-canvas').addEventListener('mousemove', (e) => {
            if (this.collaboration && this.collaboration.isConnected) {
                const rect = e.target.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.collaboration.broadcastCursorMove(x, y);
            }
        });
    }

    // Authentication methods
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/user');
            if (response.ok) {
                this.currentUser = await response.json();
                this.isAuthenticated = true;
                this.updateAuthUI();
            }
        } catch (error) {
            console.log('Not authenticated');
        }
    }

    handleLogin() {
        if (this.isAuthenticated) {
            console.log('Logging out...');
            window.location.href = '/api/logout';
        } else {
            console.log('Logging in...');
            window.location.href = '/api/login';
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const saveCloudBtn = document.getElementById('save-cloud');
        const shareBtn = document.getElementById('share-btn');
        const collaborateBtn = document.getElementById('collaborate-btn');

        if (this.isAuthenticated) {
            loginBtn.textContent = 'Logout';
            loginBtn.classList.remove('primary');
            saveCloudBtn.disabled = false;
            shareBtn.disabled = false;
            collaborateBtn.disabled = false;
            
            this.updateStatus(`Logged in as ${this.currentUser.firstName || this.currentUser.email}`);
        } else {
            loginBtn.textContent = 'Login';
            loginBtn.classList.add('primary');
            saveCloudBtn.disabled = true;
            shareBtn.disabled = true;
            collaborateBtn.disabled = true;
        }
    }

    // Cloud storage methods
    async saveToCloud() {
        if (!this.isAuthenticated) {
            this.updateStatus('Please login to save to cloud');
            return;
        }

        try {
            const mindMapData = this.mindMap.getData();
            const title = prompt('Enter mind map title:', 'My Mind Map');
            if (!title) return;

            const response = await fetch('/api/mindmaps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    data: mindMapData,
                    isPublic: false
                })
            });

            if (response.ok) {
                const mindMap = await response.json();
                this.currentMindMapId = mindMap.id;
                this.updateStatus(`Saved to cloud: ${title}`);
                this.updateDebugInfo(`Mind map saved with ID: ${mindMap.id}`);
            } else {
                throw new Error('Failed to save to cloud');
            }
        } catch (error) {
            console.error('Error saving to cloud:', error);
            this.updateStatus('Failed to save to cloud');
        }
    }

    // Collaboration methods
    async showShareModal() {
        if (!this.currentMindMapId) {
            // Auto-save first if not saved
            await this.saveToCloud();
            if (!this.currentMindMapId) {
                this.updateStatus('Failed to save mind map - cannot share');
                return;
            }
        }

        // Generate a proper share code based on mind map ID
        const shareCode = 'MM-' + this.currentMindMapId.toString().padStart(6, '0');
        document.getElementById('share-code').value = shareCode;
        
        const modal = document.getElementById('share-modal');
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
        
        this.updateStatus('Room created! Share the code with collaborators');
    }

    hideShareModal() {
        document.getElementById('share-modal').classList.add('hidden');
    }

    copyShareCode() {
        const shareCodeInput = document.getElementById('share-code');
        shareCodeInput.select();
        document.execCommand('copy');
        this.updateStatus('Share code copied to clipboard');
    }

    showJoinRoomModal() {
        const modal = document.getElementById('join-room-modal');
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
    }

    hideJoinRoomModal() {
        document.getElementById('join-room-modal').classList.add('hidden');
        document.getElementById('room-code').value = '';
    }

    async joinCollaborationRoom() {
        const roomCode = document.getElementById('room-code').value.trim();
        if (!roomCode) {
            this.updateStatus('Please enter a room code');
            return;
        }

        if (!this.isAuthenticated) {
            this.updateStatus('Please login to join collaboration');
            return;
        }

        try {
            const response = await fetch(`/api/mindmaps/share/${roomCode}`);
            if (!response.ok) {
                throw new Error('Invalid share code');
            }

            const mindMapInfo = await response.json();
            
            if (!this.collaboration) {
                this.collaboration = new CollaborationClient(this);
            }

            await this.collaboration.connect(mindMapInfo.id, this.currentUser.id, roomCode);
            this.hideJoinRoomModal();
            this.updateStatus(`Joined collaboration: ${mindMapInfo.title}`);
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.updateStatus('Failed to join collaboration room');
        }
    }

    showTemplates() {
        const modal = document.getElementById('templates-modal');
        modal.classList.remove('hidden');
        modal.classList.add('fade-in');
        this.updateDebugInfo('Showing templates selection');
    }

    hideTemplates() {
        document.getElementById('templates-modal').classList.add('hidden');
        this.updateDebugInfo('');
    }

    loadTemplate(templateType) {
        this.hideTemplates();
        
        if (this.mindMap.nodes.size > 1) {
            if (!confirm('Load template? This will replace your current mind map.')) {
                return;
            }
        }

        const templateData = this.getTemplateData(templateType);
        this.mindMap.loadData(templateData);
        this.updateStatus(`Template loaded: ${this.getTemplateName(templateType)}`);
        this.updateDebugInfo(`Loaded template: ${templateType}`);
    }

    getTemplateName(templateType) {
        const names = {
            blank: 'Blank Canvas',
            project: 'Project Planning',
            brainstorm: 'Brainstorming',
            study: 'Study Notes',
            meeting: 'Meeting Notes',
            decision: 'Decision Making',
            swot: 'SWOT Analysis',
            problem: 'Problem Solving'
        };
        return names[templateType] || 'Unknown Template';
    }

    getTemplateData(templateType) {
        const templates = {
            blank: {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Central Idea', color: '#ffeb3b', width: 120, height: 60 }
                ],
                connections: [],
                view: { zoom: 1, panX: 0, panY: 0 }
            },
            
            project: {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Project Name', color: '#2196f3', width: 140, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Goals', color: '#4caf50', width: 100, height: 50 },
                    { id: 3, x: 550, y: 200, text: 'Tasks', color: '#ff9800', width: 100, height: 50 },
                    { id: 4, x: 250, y: 400, text: 'Resources', color: '#9c27b0', width: 100, height: 50 },
                    { id: 5, x: 550, y: 400, text: 'Timeline', color: '#f44336', width: 100, height: 50 },
                    { id: 6, x: 150, y: 150, text: 'Objective 1', color: '#e8f5e8', width: 90, height: 40 },
                    { id: 7, x: 150, y: 250, text: 'Objective 2', color: '#e8f5e8', width: 90, height: 40 },
                    { id: 8, x: 650, y: 150, text: 'Task 1', color: '#fff3e0', width: 80, height: 40 },
                    { id: 9, x: 650, y: 250, text: 'Task 2', color: '#fff3e0', width: 80, height: 40 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 }, { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 }, { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 }, { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 }, { id: 8, fromId: 3, toId: 9 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            brainstorm: {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Topic', color: '#ffeb3b', width: 120, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Ideas', color: '#4caf50', width: 100, height: 50 },
                    { id: 3, x: 550, y: 200, text: 'Pros', color: '#2196f3', width: 100, height: 50 },
                    { id: 4, x: 400, y: 450, text: 'Cons', color: '#f44336', width: 100, height: 50 },
                    { id: 5, x: 250, y: 400, text: 'Actions', color: '#9c27b0', width: 100, height: 50 },
                    { id: 6, x: 150, y: 150, text: 'Idea 1', color: '#e8f5e8', width: 80, height: 40 },
                    { id: 7, x: 150, y: 250, text: 'Idea 2', color: '#e8f5e8', width: 80, height: 40 },
                    { id: 8, x: 650, y: 150, text: 'Benefit 1', color: '#e3f2fd', width: 80, height: 40 },
                    { id: 9, x: 650, y: 250, text: 'Benefit 2', color: '#e3f2fd', width: 80, height: 40 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 }, { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 }, { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 }, { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 }, { id: 8, fromId: 3, toId: 9 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            study: {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Subject', color: '#9c27b0', width: 120, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Chapter 1', color: '#2196f3', width: 100, height: 50 },
                    { id: 3, x: 550, y: 200, text: 'Chapter 2', color: '#2196f3', width: 100, height: 50 },
                    { id: 4, x: 400, y: 450, text: 'Key Terms', color: '#ff9800', width: 100, height: 50 },
                    { id: 5, x: 150, y: 150, text: 'Key Points', color: '#e3f2fd', width: 90, height: 40 },
                    { id: 6, x: 150, y: 250, text: 'Examples', color: '#e3f2fd', width: 90, height: 40 },
                    { id: 7, x: 650, y: 150, text: 'Concepts', color: '#e3f2fd', width: 90, height: 40 },
                    { id: 8, x: 650, y: 250, text: 'Practice', color: '#e3f2fd', width: 90, height: 40 },
                    { id: 9, x: 300, y: 500, text: 'Term 1', color: '#fff3e0', width: 80, height: 35 },
                    { id: 10, x: 500, y: 500, text: 'Term 2', color: '#fff3e0', width: 80, height: 35 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 }, { id: 2, fromId: 1, toId: 3 }, { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 2, toId: 5 }, { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 3, toId: 7 }, { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 4, toId: 9 }, { id: 9, fromId: 4, toId: 10 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            meeting: {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Meeting Topic', color: '#607d8b', width: 140, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Agenda', color: '#2196f3', width: 100, height: 50 },
                    { id: 3, x: 550, y: 200, text: 'Discussion', color: '#4caf50', width: 100, height: 50 },
                    { id: 4, x: 400, y: 450, text: 'Action Items', color: '#f44336', width: 120, height: 50 },
                    { id: 5, x: 150, y: 150, text: 'Item 1', color: '#e3f2fd', width: 80, height: 40 },
                    { id: 6, x: 150, y: 250, text: 'Item 2', color: '#e3f2fd', width: 80, height: 40 },
                    { id: 7, x: 650, y: 150, text: 'Point 1', color: '#e8f5e8', width: 80, height: 40 },
                    { id: 8, x: 650, y: 250, text: 'Point 2', color: '#e8f5e8', width: 80, height: 40 },
                    { id: 9, x: 300, y: 520, text: 'Action 1', color: '#ffebee', width: 90, height: 40 },
                    { id: 10, x: 500, y: 520, text: 'Action 2', color: '#ffebee', width: 90, height: 40 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 }, { id: 2, fromId: 1, toId: 3 }, { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 2, toId: 5 }, { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 3, toId: 7 }, { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 4, toId: 9 }, { id: 9, fromId: 4, toId: 10 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            decision: {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Decision', color: '#795548', width: 120, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Option A', color: '#2196f3', width: 100, height: 50 },
                    { id: 3, x: 550, y: 200, text: 'Option B', color: '#2196f3', width: 100, height: 50 },
                    { id: 4, x: 400, y: 450, text: 'Criteria', color: '#9c27b0', width: 100, height: 50 },
                    { id: 5, x: 150, y: 120, text: 'Pros', color: '#4caf50', width: 80, height: 40 },
                    { id: 6, x: 150, y: 280, text: 'Cons', color: '#f44336', width: 80, height: 40 },
                    { id: 7, x: 650, y: 120, text: 'Pros', color: '#4caf50', width: 80, height: 40 },
                    { id: 8, x: 650, y: 280, text: 'Cons', color: '#f44336', width: 80, height: 40 },
                    { id: 9, x: 300, y: 520, text: 'Cost', color: '#e1bee7', width: 80, height: 35 },
                    { id: 10, x: 500, y: 520, text: 'Time', color: '#e1bee7', width: 80, height: 35 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 }, { id: 2, fromId: 1, toId: 3 }, { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 2, toId: 5 }, { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 3, toId: 7 }, { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 4, toId: 9 }, { id: 9, fromId: 4, toId: 10 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            swot: {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'SWOT Analysis', color: '#607d8b', width: 140, height: 60 },
                    { id: 2, x: 250, y: 180, text: 'Strengths', color: '#4caf50', width: 110, height: 50 },
                    { id: 3, x: 550, y: 180, text: 'Weaknesses', color: '#f44336', width: 110, height: 50 },
                    { id: 4, x: 250, y: 420, text: 'Opportunities', color: '#2196f3', width: 130, height: 50 },
                    { id: 5, x: 550, y: 420, text: 'Threats', color: '#ff9800', width: 100, height: 50 },
                    { id: 6, x: 150, y: 120, text: 'Strength 1', color: '#e8f5e8', width: 90, height: 40 },
                    { id: 7, x: 150, y: 240, text: 'Strength 2', color: '#e8f5e8', width: 90, height: 40 },
                    { id: 8, x: 650, y: 120, text: 'Weakness 1', color: '#ffebee', width: 90, height: 40 },
                    { id: 9, x: 650, y: 240, text: 'Weakness 2', color: '#ffebee', width: 90, height: 40 },
                    { id: 10, x: 150, y: 480, text: 'Opportunity 1', color: '#e3f2fd', width: 100, height: 40 },
                    { id: 11, x: 650, y: 480, text: 'Threat 1', color: '#fff3e0', width: 80, height: 40 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 }, { id: 2, fromId: 1, toId: 3 },
                    { id: 3, fromId: 1, toId: 4 }, { id: 4, fromId: 1, toId: 5 },
                    { id: 5, fromId: 2, toId: 6 }, { id: 6, fromId: 2, toId: 7 },
                    { id: 7, fromId: 3, toId: 8 }, { id: 8, fromId: 3, toId: 9 },
                    { id: 9, fromId: 4, toId: 10 }, { id: 10, fromId: 5, toId: 11 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            },

            problem: {
                nodes: [
                    { id: 1, x: 400, y: 300, text: 'Problem', color: '#ff5722', width: 120, height: 60 },
                    { id: 2, x: 250, y: 200, text: 'Root Causes', color: '#f44336', width: 110, height: 50 },
                    { id: 3, x: 550, y: 200, text: 'Solutions', color: '#4caf50', width: 100, height: 50 },
                    { id: 4, x: 400, y: 450, text: 'Next Steps', color: '#2196f3', width: 110, height: 50 },
                    { id: 5, x: 150, y: 150, text: 'Cause 1', color: '#ffebee', width: 80, height: 40 },
                    { id: 6, x: 150, y: 250, text: 'Cause 2', color: '#ffebee', width: 80, height: 40 },
                    { id: 7, x: 650, y: 150, text: 'Solution 1', color: '#e8f5e8', width: 90, height: 40 },
                    { id: 8, x: 650, y: 250, text: 'Solution 2', color: '#e8f5e8', width: 90, height: 40 },
                    { id: 9, x: 300, y: 520, text: 'Action 1', color: '#e3f2fd', width: 80, height: 35 },
                    { id: 10, x: 500, y: 520, text: 'Action 2', color: '#e3f2fd', width: 80, height: 35 }
                ],
                connections: [
                    { id: 1, fromId: 1, toId: 2 }, { id: 2, fromId: 1, toId: 3 }, { id: 3, fromId: 1, toId: 4 },
                    { id: 4, fromId: 2, toId: 5 }, { id: 5, fromId: 2, toId: 6 },
                    { id: 6, fromId: 3, toId: 7 }, { id: 7, fromId: 3, toId: 8 },
                    { id: 8, fromId: 4, toId: 9 }, { id: 9, fromId: 4, toId: 10 }
                ],
                view: { zoom: 1, panX: 0, panY: 0 }
            }
        };

        return templates[templateType] || templates.blank;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MindMapApp();
});
