class MindMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.canvasGroup = document.getElementById('canvas-group');
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedNode = null;
        this.selectedConnection = null;
        this.isDragging = false;
        this.isPanning = false;
        this.dragOffset = { x: 0, y: 0 };
        this.panStart = { x: 0, y: 0 };
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.nodeIdCounter = 1;
        this.connectionIdCounter = 1;
        this.eventHandlers = {};

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateTransform();

        // Create initial root node
        this.addNode(400, 300, 'Central Idea', '#ffeb3b');
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;

        const clickedNode = this.getNodeAt(x, y);
        
        if (clickedNode) {
            this.selectNode(clickedNode);
            this.isDragging = true;
            this.dragOffset = {
                x: x - clickedNode.x,
                y: y - clickedNode.y
            };
            this.emit('debugInfo', `Dragging: Node ${clickedNode.id}`);
        } else {
            this.clearSelection();
            this.isPanning = true;
            this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            this.canvas.style.cursor = 'grabbing';
            this.emit('debugInfo', 'Panning canvas');
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;

        if (this.isDragging && this.selectedNode) {
            const newX = x - this.dragOffset.x;
            const newY = y - this.dragOffset.y;
            this.moveNode(this.selectedNode.id, newX, newY);
            this.emit('debugInfo', `Moving: Node ${this.selectedNode.id} to (${Math.round(newX)}, ${Math.round(newY)})`);
        } else if (this.isPanning) {
            this.panX = e.clientX - this.panStart.x;
            this.panY = e.clientY - this.panStart.y;
            this.updateTransform();
            this.emit('debugInfo', `Pan: (${Math.round(this.panX)}, ${Math.round(this.panY)})`);
        } else {
            // Update cursor based on what's under the mouse
            const nodeUnderMouse = this.getNodeAt(x, y);
            this.canvas.style.cursor = nodeUnderMouse ? 'move' : 'grab';
            if (nodeUnderMouse) {
                this.emit('debugInfo', `Hover: Node ${nodeUnderMouse.id} - "${nodeUnderMouse.text}"`);
            } else {
                this.emit('debugInfo', `Mouse: (${Math.round(x)}, ${Math.round(y)})`);
            }
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.emit('debugInfo', `Drop: Node ${this.selectedNode?.id} at (${Math.round(this.selectedNode?.x)}, ${Math.round(this.selectedNode?.y)})`);
        } else if (this.isPanning) {
            this.emit('debugInfo', `Pan complete: (${Math.round(this.panX)}, ${Math.round(this.panY)})`);
        }
        this.isDragging = false;
        this.isPanning = false;
        this.canvas.style.cursor = 'grab';
    }

    handleDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;

        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            this.emit('nodeDoubleClick', clickedNode);
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, this.zoom * scaleFactor));

        if (newZoom !== this.zoom) {
            const zoomChange = newZoom / this.zoom;
            this.panX = mouseX - (mouseX - this.panX) * zoomChange;
            this.panY = mouseY - (mouseY - this.panY) * zoomChange;
            this.zoom = newZoom;
            this.updateTransform();
            this.emit('zoomChange', this.zoom);
            this.emit('debugInfo', `Zoom: ${Math.round(this.zoom * 100)}% at (${Math.round(mouseX)}, ${Math.round(mouseY)})`);
        }
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }
    }

    handleTouchEnd(e) {
        this.handleMouseUp({});
    }

    addNode(x = null, y = null, text = 'New Node', color = '#e3f2fd') {
        if (x === null || y === null) {
            // Position new node relative to selected node or center
            if (this.selectedNode) {
                x = this.selectedNode.x + 150;
                y = this.selectedNode.y;
            } else {
                x = 400;
                y = 300;
            }
        }

        const node = {
            id: this.nodeIdCounter++,
            x: x,
            y: y,
            text: text,
            color: color,
            width: 120,
            height: 60
        };

        this.nodes.set(node.id, node);
        this.renderNode(node);

        // Auto-connect to selected node
        if (this.selectedNode && this.selectedNode.id !== node.id) {
            this.addConnection(this.selectedNode.id, node.id);
        }

        this.selectNode(node);
        this.emit('statusUpdate', 'Node added');
        return node;
    }

    updateNode(nodeId, updates) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        Object.assign(node, updates);
        this.renderNode(node);
        this.renderConnections();
        return true;
    }

    moveNode(nodeId, x, y) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        node.x = x;
        node.y = y;
        this.renderNode(node);
        this.renderConnections();
        return true;
    }

    deleteNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;

        // Remove all connections involving this node
        for (const [connId, connection] of this.connections) {
            if (connection.fromId === nodeId || connection.toId === nodeId) {
                this.deleteConnection(connId);
            }
        }

        // Remove node from DOM
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
            nodeElement.remove();
        }

        this.nodes.delete(nodeId);
        return true;
    }

    deleteSelectedNode() {
        if (!this.selectedNode) return false;
        
        // Don't delete if it's the last node
        if (this.nodes.size <= 1) {
            this.emit('statusUpdate', 'Cannot delete the last node');
            return false;
        }

        const nodeId = this.selectedNode.id;
        this.clearSelection();
        return this.deleteNode(nodeId);
    }

    addConnection(fromId, toId) {
        // Don't create duplicate connections
        for (const connection of this.connections.values()) {
            if ((connection.fromId === fromId && connection.toId === toId) ||
                (connection.fromId === toId && connection.toId === fromId)) {
                this.emit('debugInfo', `Connection already exists: ${fromId} ↔ ${toId}`);
                return null;
            }
        }

        const connection = {
            id: this.connectionIdCounter++,
            fromId: fromId,
            toId: toId
        };

        this.connections.set(connection.id, connection);
        this.renderConnection(connection);
        this.emit('debugInfo', `Connected: Node ${fromId} → Node ${toId}`);
        return connection;
    }

    deleteConnection(connectionId) {
        const connectionElement = document.getElementById(`connection-${connectionId}`);
        if (connectionElement) {
            connectionElement.remove();
        }
        return this.connections.delete(connectionId);
    }

    selectNode(node) {
        // Clear previous selection
        this.clearSelection();

        this.selectedNode = node;
        const nodeElement = document.getElementById(`node-${node.id}`);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }

        this.emit('nodeSelected', node);
    }

    clearSelection() {
        if (this.selectedNode) {
            const nodeElement = document.getElementById(`node-${this.selectedNode.id}`);
            if (nodeElement) {
                nodeElement.classList.remove('selected');
            }
            this.selectedNode = null;
        }

        if (this.selectedConnection) {
            const connectionElement = document.getElementById(`connection-${this.selectedConnection.id}`);
            if (connectionElement) {
                connectionElement.classList.remove('selected');
            }
            this.selectedConnection = null;
        }

        this.emit('nodeSelected', null);
    }

    getNodeAt(x, y) {
        for (const node of this.nodes.values()) {
            if (x >= node.x - node.width/2 && x <= node.x + node.width/2 &&
                y >= node.y - node.height/2 && y <= node.y + node.height/2) {
                return node;
            }
        }
        return null;
    }

    renderNode(node) {
        // Remove existing node element
        const existingElement = document.getElementById(`node-${node.id}`);
        if (existingElement) {
            existingElement.remove();
        }

        // Create node group
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.id = `node-${node.id}`;
        nodeGroup.classList.add('node');

        // Create rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.classList.add('node-rect');
        rect.setAttribute('x', node.x - node.width/2);
        rect.setAttribute('y', node.y - node.height/2);
        rect.setAttribute('width', node.width);
        rect.setAttribute('height', node.height);
        rect.setAttribute('fill', node.color);

        // Create text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.classList.add('node-text');
        text.setAttribute('x', node.x);
        text.setAttribute('y', node.y);
        
        // Handle multi-line text
        const lines = node.text.split('\n');
        if (lines.length === 1) {
            text.textContent = node.text;
        } else {
            lines.forEach((line, index) => {
                const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                tspan.textContent = line;
                tspan.setAttribute('x', node.x);
                tspan.setAttribute('dy', index === 0 ? '0' : '1.2em');
                text.appendChild(tspan);
            });
        }

        nodeGroup.appendChild(rect);
        nodeGroup.appendChild(text);
        this.canvasGroup.appendChild(nodeGroup);
    }

    renderConnection(connection) {
        const fromNode = this.nodes.get(connection.fromId);
        const toNode = this.nodes.get(connection.toId);
        
        if (!fromNode || !toNode) return;

        // Remove existing connection element
        const existingElement = document.getElementById(`connection-${connection.id}`);
        if (existingElement) {
            existingElement.remove();
        }

        // Calculate connection points (edge of rectangles)
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;

        const unitX = dx / distance;
        const unitY = dy / distance;

        const fromEdgeX = fromNode.x + unitX * fromNode.width/2;
        const fromEdgeY = fromNode.y + unitY * fromNode.height/2;
        const toEdgeX = toNode.x - unitX * toNode.width/2;
        const toEdgeY = toNode.y - unitY * toNode.height/2;

        // Create line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.id = `connection-${connection.id}`;
        line.classList.add('connection-line');
        line.setAttribute('x1', fromEdgeX);
        line.setAttribute('y1', fromEdgeY);
        line.setAttribute('x2', toEdgeX);
        line.setAttribute('y2', toEdgeY);

        this.canvasGroup.appendChild(line);
    }

    renderConnections() {
        for (const connection of this.connections.values()) {
            this.renderConnection(connection);
        }
    }

    updateTransform() {
        this.canvasGroup.setAttribute('transform', 
            `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }

    zoomIn() {
        const newZoom = Math.min(3, this.zoom * 1.2);
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            this.updateTransform();
            this.emit('zoomChange', this.zoom);
        }
    }

    zoomOut() {
        const newZoom = Math.max(0.1, this.zoom / 1.2);
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            this.updateTransform();
            this.emit('zoomChange', this.zoom);
        }
    }

    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.emit('zoomChange', this.zoom);
        this.emit('statusUpdate', 'View reset');
    }

    clear() {
        // Clear all nodes and connections
        const nodeCount = this.nodes.size;
        const connectionCount = this.connections.size;
        
        this.nodes.clear();
        this.connections.clear();
        this.selectedNode = null;
        this.selectedConnection = null;
        
        // Clear canvas
        while (this.canvasGroup.firstChild) {
            this.canvasGroup.removeChild(this.canvasGroup.firstChild);
        }

        // Reset counters
        this.nodeIdCounter = 1;
        this.connectionIdCounter = 1;

        // Create initial root node
        this.addNode(400, 300, 'Central Idea', '#ffeb3b');
        this.resetView();
        this.emit('debugInfo', `Cleared: ${nodeCount} nodes, ${connectionCount} connections`);
    }

    getData() {
        return {
            nodes: Array.from(this.nodes.values()),
            connections: Array.from(this.connections.values()),
            view: {
                zoom: this.zoom,
                panX: this.panX,
                panY: this.panY
            }
        };
    }

    loadData(data) {
        this.clear();
        
        // Load nodes
        if (data.nodes && data.nodes.length > 0) {
            // Clear the default node first
            this.nodes.clear();
            while (this.canvasGroup.firstChild) {
                this.canvasGroup.removeChild(this.canvasGroup.firstChild);
            }

            for (const nodeData of data.nodes) {
                const node = {
                    id: nodeData.id,
                    x: nodeData.x,
                    y: nodeData.y,
                    text: nodeData.text,
                    color: nodeData.color,
                    width: nodeData.width || 120,
                    height: nodeData.height || 60
                };
                this.nodes.set(node.id, node);
                this.renderNode(node);
                
                // Update counter
                if (node.id >= this.nodeIdCounter) {
                    this.nodeIdCounter = node.id + 1;
                }
            }
        }

        // Load connections
        if (data.connections) {
            for (const connectionData of data.connections) {
                const connection = {
                    id: connectionData.id,
                    fromId: connectionData.fromId,
                    toId: connectionData.toId
                };
                this.connections.set(connection.id, connection);
                this.renderConnection(connection);
                
                // Update counter
                if (connection.id >= this.connectionIdCounter) {
                    this.connectionIdCounter = connection.id + 1;
                }
            }
        }

        // Load view state
        if (data.view) {
            this.zoom = data.view.zoom || 1;
            this.panX = data.view.panX || 0;
            this.panY = data.view.panY || 0;
            this.updateTransform();
            this.emit('zoomChange', this.zoom);
        }

        this.emit('statusUpdate', 'Mind map loaded successfully');
    }

    // Event system
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => handler(data));
        }
    }
}
