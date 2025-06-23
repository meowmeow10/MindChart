class MindMapApp {
    constructor() {
        this.currentPage = 'landing';
        this.mindMap = null;
        this.xmlHandler = new XMLHandler();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showLandingPage();
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
        });

        this.mindMap.on('nodeDoubleClick', (node) => {
            this.editNode(node);
        });

        this.mindMap.on('statusUpdate', (message) => {
            document.getElementById('status-text').textContent = message;
        });

        this.mindMap.on('zoomChange', (zoomLevel) => {
            document.getElementById('zoom-level').textContent = `${Math.round(zoomLevel * 100)}%`;
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
            const xmlContent = this.xmlHandler.serialize(this.mindMap.getData());
            this.downloadFile(xmlContent, 'mindmap.xml', 'application/xml');
            this.updateStatus('Mind map saved successfully');
        } catch (error) {
            this.updateStatus('Error saving mind map: ' + error.message);
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
            } catch (error) {
                this.updateStatus('Error loading mind map: ' + error.message);
                console.error('Load error:', error);
            }
        };
        reader.readAsText(file);
    }

    addNode() {
        const node = this.mindMap.addNode();
        this.editNode(node);
    }

    deleteSelectedNode() {
        if (this.mindMap.deleteSelectedNode()) {
            this.updateStatus('Node deleted');
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
                }
                break;
            case 'Enter':
                this.addNode();
                e.preventDefault();
                break;
            case 'Escape':
                if (!document.getElementById('node-editor').classList.contains('hidden')) {
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MindMapApp();
});
