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
        this.connectMode = false;
        this.connectingFrom = null;
        this.tempConnection = null;

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

        // Add canvas title for tooltip
        this.canvas.setAttribute('title', 'Double-click nodes to edit • Drag to move • Scroll to zoom • Drag empty space to pan');
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;

        const clickedNode = this.getNodeAt(x, y);

        if (clickedNode) {
            if (this.connectMode) {
                this.handleConnectModeClick(clickedNode);
            } else {
                this.selectNode(clickedNode);
                this.isDragging = true;
                this.dragOffset = {
                    x: x - clickedNode.x,
                    y: y - clickedNode.y
                };
                this.emit('debugInfo', `Dragging: Node ${clickedNode.id}`);
            }
        } else {
            // Check if clicking on a connection
            const clickedConnection = this.getConnectionAt(x, y);
            if (clickedConnection) {
                this.selectConnection(clickedConnection);
                this.emit('debugInfo', `Connection selected: ${clickedConnection.fromId} → ${clickedConnection.toId}`);
            } else {
                this.clearSelection();
                if (!this.connectMode) {
                    this.isPanning = true;
                    this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
                    this.canvas.style.cursor = 'grabbing';
                    this.emit('debugInfo', 'Panning canvas');
                }
            }
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
        } else if (this.connectMode && this.connectingFrom) {
            // Update temporary connection line
            this.updateTempConnection(x, y);
        } else {
            // Update cursor based on what's under the mouse
            const nodeUnderMouse = this.getNodeAt(x, y);
            const connectionUnderMouse = this.getConnectionAt(x, y);

            if (this.connectMode) {
                this.canvas.style.cursor = nodeUnderMouse ? 'crosshair' : 'default';
            } else {
                this.canvas.style.cursor = nodeUnderMouse ? 'move' : connectionUnderMouse ? 'pointer' : 'grab';
            }

            if (nodeUnderMouse) {
                this.emit('debugInfo', `Hover: Node ${nodeUnderMouse.id} - "${nodeUnderMouse.text}"`);
            } else if (connectionUnderMouse) {
                this.emit('debugInfo', `Hover: Connection ${connectionUnderMouse.fromId} → ${connectionUnderMouse.toId}`);
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

        if (this.connectMode) {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'grab';
        }
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

    parseMarkdown(text) {
        // Simple markdown parser for basic formatting
        if (typeof marked !== 'undefined') {
            try {
                const html = marked.parse(text, { 
                    breaks: true, 
                    gfm: true,
                    sanitize: false 
                });
                return this.htmlToPlainText(html);
            } catch (error) {
                console.warn('Markdown parsing failed, using plain text:', error);
                return text;
            }
        }
        return text;
    }

    htmlToPlainText(html) {
        // Convert basic HTML tags to plain text for dimension calculation
        return html
            .replace(/<strong>|<b>/g, '')
            .replace(/<\/strong>|<\/b>/g, '')
            .replace(/<em>|<i>/g, '')
            .replace(/<\/em>|<\/i>/g, '')
            .replace(/<code>/g, '')
            .replace(/<\/code>/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    calculateTextDimensions(text) {
        // Parse markdown for display but use plain text for calculations
        const plainText = this.htmlToPlainText(this.parseMarkdown(text));
        
        // Create temporary SVG text element to measure dimensions
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.style.position = 'absolute';
        tempSvg.style.visibility = 'hidden';
        tempSvg.style.width = '0';
        tempSvg.style.height = '0';

        const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tempText.classList.add('node-text');
        tempText.style.fontSize = '14px';
        tempText.style.fontFamily = 'Segoe UI, sans-serif';

        // More conservative character limit for better text fitting
        const maxLineLength = 15; // Reduced from 20 to prevent overflow
        const allLines = [];
        
        plainText.split('\n').forEach(line => {
            if (line.length <= maxLineLength) {
                allLines.push(line);
            } else {
                // Wrap long lines by words
                const words = line.split(' ');
                let currentLine = '';
                
                words.forEach(word => {
                    // Check if adding this word would exceed the limit
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    if (testLine.length <= maxLineLength) {
                        currentLine = testLine;
                    } else {
                        // If current line has content, save it and start new line
                        if (currentLine) {
                            allLines.push(currentLine);
                            currentLine = word;
                        } else {
                            // If single word is too long, force break it
                            if (word.length > maxLineLength) {
                                for (let i = 0; i < word.length; i += maxLineLength) {
                                    allLines.push(word.slice(i, i + maxLineLength));
                                }
                                currentLine = '';
                            } else {
                                currentLine = word;
                            }
                        }
                    }
                });
                
                if (currentLine) {
                    allLines.push(currentLine);
                }
            }
        });

        // Measure actual text width for each line
        let maxWidth = 0;
        allLines.forEach((line, index) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.textContent = line;
            tspan.setAttribute('x', '0');
            tspan.setAttribute('dy', index === 0 ? '0' : '1.2em');
            tempText.appendChild(tspan);
        });

        tempSvg.appendChild(tempText);
        document.body.appendChild(tempSvg);

        const bbox = tempText.getBBox();
        maxWidth = bbox.width;
        const totalHeight = bbox.height;

        document.body.removeChild(tempSvg);

        // Ensure minimum dimensions and add generous padding
        const padding = 50; // Increased padding
        const minWidth = 140; // Increased minimum width
        const minHeight = 70; // Increased minimum height

        return {
            width: Math.max(maxWidth + padding, minWidth),
            height: Math.max(totalHeight + padding, minHeight),
            wrappedLines: allLines
        };
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

        const newId = Math.max(...this.nodes.keys(), 0) + 1;
        const dimensions = this.calculateTextDimensions(text);
        const node = {
            id: newId,
            x: x,
            y: y,
            text: text,
            color: color,
            width: dimensions.width,
            height: dimensions.height
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

        // If text is being updated, recalculate dimensions
        if (updates.text !== undefined) {
            const dimensions = this.calculateTextDimensions(updates.text);
            updates.width = dimensions.width;
            updates.height = dimensions.height;
            updates.wrappedLines = dimensions.wrappedLines;
        }

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
            this.emit('statusUpdate', 'Fault: Cannot delete the last node');
            this.playErrorSound();
            return false;
        }

        const nodeId = this.selectedNode.id;
        this.clearSelection();
        return this.deleteNode(nodeId);
    }

    playErrorSound() {
        try {
            const audio = new Audio('error.mp3');
            audio.volume = 0.5; // Set volume to 50%
            audio.play().catch(error => {
                console.warn('Could not play error sound:', error);
            });
        } catch (error) {
            console.warn('Error sound not available:', error);
        }
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
        this.emit('debugInfo', `Deleted connection: ${connectionId}`);
        return this.connections.delete(connectionId);
    }

    deleteSelectedConnection() {
        if (!this.selectedConnection) return false;

        const connectionId = this.selectedConnection.id;
        this.clearSelection();
        return this.deleteConnection(connectionId);
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

    selectConnection(connection) {
        // Clear previous selection
        this.clearSelection();

        this.selectedConnection = connection;
        const connectionElement = document.getElementById(`connection-${connection.id}`);
        if (connectionElement) {
            connectionElement.classList.add('selected');
        }

        this.emit('connectionSelected', connection);
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
        this.emit('connectionSelected', null);
    }

    getNodeAt(x, y) {
        for (const node of this.nodes.values()) {
            // Use current node dimensions (which may have been updated during rendering)
            if (x >= node.x - node.width/2 && x <= node.x + node.width/2 &&
                y >= node.y - node.height/2 && y <= node.y + node.height/2) {
                return node;
            }
        }
        return null;
    }

    getConnectionAt(x, y) {
        const tolerance = 5; // pixels

        for (const connection of this.connections.values()) {
            const fromNode = this.nodes.get(connection.fromId);
            const toNode = this.nodes.get(connection.toId);

            if (!fromNode || !toNode) continue;

            // Calculate connection line points
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) continue;

            const unitX = dx / distance;
            const unitY = dy / distance;

            const fromEdgeX = fromNode.x + unitX * fromNode.width/2;
            const fromEdgeY = fromNode.y + unitY * fromNode.height/2;
            const toEdgeX = toNode.x - unitX * toNode.width/2;
            const toEdgeY = toNode.y - unitY * toNode.height/2;

            // Check if point is near the line
            const distToLine = this.distanceToLine(x, y, fromEdgeX, fromEdgeY, toEdgeX, toEdgeY);
            if (distToLine <= tolerance) {
                return connection;
            }
        }
        return null;
    }

    distanceToLine(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));

        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        const projection = { x: x1 + t * dx, y: y1 + t * dy };

        return Math.sqrt((px - projection.x) * (px - projection.x) + (py - projection.y) * (py - projection.y));
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

        // Create text with markdown support
        this.renderNodeText(nodeGroup, node);

        nodeGroup.appendChild(rect);
        this.canvasGroup.appendChild(nodeGroup);
    }

    renderNodeText(nodeGroup, node) {
        // Use wrapped lines if available, otherwise calculate them
        let lines = node.wrappedLines;
        if (!lines) {
            const dimensions = this.calculateTextDimensions(node.text);
            lines = dimensions.wrappedLines;
            // Update node with new dimensions
            node.width = dimensions.width;
            node.height = dimensions.height;
            node.wrappedLines = lines;
        }

        if (lines.length === 1) {
            this.renderFormattedText(nodeGroup, node, lines[0], node.x, node.y);
        } else {
            // Center multi-line text vertically
            const lineHeight = 16.8; // 1.2em of 14px
            const totalTextHeight = (lines.length - 1) * lineHeight;
            const startY = node.y - totalTextHeight / 2;
            
            lines.forEach((line, index) => {
                const y = startY + (index * lineHeight);
                this.renderFormattedText(nodeGroup, node, line, node.x, y);
            });
        }
    }

    renderFormattedText(nodeGroup, node, text, x, y) {
        // Check if text contains markdown-style formatting
        const hasFormatting = /(\*\*|__|\*|_|`|~~)/.test(text);
        
        if (!hasFormatting) {
            // Simple text, no formatting
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.classList.add('node-text');
            textElement.setAttribute('x', x);
            textElement.setAttribute('y', y);
            textElement.setAttribute('text-anchor', 'middle');
            textElement.setAttribute('dominant-baseline', 'middle');
            textElement.textContent = text;
            nodeGroup.appendChild(textElement);
            return;
        }

        // Parse and render formatted text
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.classList.add('node-text');
        textElement.setAttribute('x', x);
        textElement.setAttribute('y', y);
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'middle');

        // Simple markdown parsing for common formats
        const parts = this.parseTextFormatting(text);
        let currentX = x - (this.getTextWidth(text) / 2); // Start from left edge for positioning

        parts.forEach(part => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.textContent = part.text;
            tspan.setAttribute('x', currentX);
            
            // Apply formatting
            if (part.bold) {
                tspan.setAttribute('font-weight', 'bold');
            }
            if (part.italic) {
                tspan.setAttribute('font-style', 'italic');
            }
            if (part.code) {
                tspan.setAttribute('font-family', 'monospace');
                tspan.setAttribute('fill', '#d63384');
            }
            if (part.strikethrough) {
                tspan.setAttribute('text-decoration', 'line-through');
            }

            textElement.appendChild(tspan);
            currentX += this.getTextWidth(part.text);
        });

        nodeGroup.appendChild(textElement);
    }

    parseTextFormatting(text) {
        const parts = [];
        let currentPos = 0;
        
        // Simple regex patterns for basic markdown
        const patterns = [
            { regex: /\*\*(.*?)\*\*/g, type: 'bold' },
            { regex: /__(.*?)__/g, type: 'bold' },
            { regex: /\*(.*?)\*/g, type: 'italic' },
            { regex: /_(.*?)_/g, type: 'italic' },
            { regex: /`(.*?)`/g, type: 'code' },
            { regex: /~~(.*?)~~/g, type: 'strikethrough' }
        ];

        const matches = [];
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[1],
                    type: pattern.type,
                    original: match[0]
                });
            }
        });

        // Sort matches by position
        matches.sort((a, b) => a.start - b.start);

        // Build parts array
        let lastEnd = 0;
        matches.forEach(match => {
            // Add text before match
            if (match.start > lastEnd) {
                const plainText = text.substring(lastEnd, match.start);
                if (plainText) {
                    parts.push({ text: plainText });
                }
            }

            // Add formatted text
            const part = { text: match.text };
            part[match.type] = true;
            parts.push(part);

            lastEnd = match.end;
        });

        // Add remaining text
        if (lastEnd < text.length) {
            const remainingText = text.substring(lastEnd);
            if (remainingText) {
                parts.push({ text: remainingText });
            }
        }

        // If no matches found, return the whole text
        if (parts.length === 0) {
            parts.push({ text: text });
        }

        return parts;
    }

    getTextWidth(text) {
        // Simple approximation - could be improved with actual measurement
        return text.length * 8; // Rough estimate based on font size
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

    toggleConnectMode() {
        this.connectMode = !this.connectMode;
        this.connectingFrom = null;
        this.clearTempConnection();

        if (this.connectMode) {
            this.canvas.style.cursor = 'crosshair';
            this.emit('debugInfo', 'Connect mode: ON - Click nodes to connect them');
        } else {
            this.canvas.style.cursor = 'grab';
            this.emit('debugInfo', 'Connect mode: OFF');
        }

        this.emit('connectionModeChange', this.connectMode);
    }

    handleConnectModeClick(node) {
        if (!this.connectingFrom) {
            // Start connecting from this node
            this.connectingFrom = node;
            this.selectNode(node);
            this.emit('debugInfo', `Connecting from: Node ${node.id} - Click target node`);
        } else if (this.connectingFrom.id === node.id) {
            // Clicked same node - cancel connection
            this.connectingFrom = null;
            this.clearTempConnection();
            this.emit('debugInfo', 'Connection cancelled');
        } else {
            // Complete the connection
            const connection = this.addConnection(this.connectingFrom.id, node.id);
            if (connection) {
                this.emit('debugInfo', `Connected: Node ${this.connectingFrom.id} → Node ${node.id}`);
            }
            this.connectingFrom = null;
            this.clearTempConnection();
        }
    }

    updateTempConnection(x, y) {
        if (!this.connectingFrom) return;

        this.clearTempConnection();

        // Create temporary connection line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.id = 'temp-connection';
        line.classList.add('connecting-line');
        line.setAttribute('x1', this.connectingFrom.x);
        line.setAttribute('y1', this.connectingFrom.y);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y);

        this.canvasGroup.appendChild(line);
    }

    clearTempConnection() {
        const tempConnection = document.getElementById('temp-connection');
        if (tempConnection) {
            tempConnection.remove();
        }
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

    // Export functionality
    exportToPNG(filename = 'mindmap.png', backgroundColor = '#ffffff') {
        this.exportToImage(filename, 'image/png', backgroundColor);
    }

    exportToJPEG(filename = 'mindmap.jpg', backgroundColor = '#ffffff') {
        this.exportToImage(filename, 'image/jpeg', backgroundColor);
    }

    exportToImage(filename, mimeType, backgroundColor = '#ffffff') {
        // Calculate the bounding box of all nodes
        const bounds = this.calculateBounds();
        const padding = 50;

        // Create a new SVG with just the content we want to export
        const exportSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        exportSvg.setAttribute('width', bounds.width + padding * 2);
        exportSvg.setAttribute('height', bounds.height + padding * 2);
        exportSvg.setAttribute('viewBox', `0 0 ${bounds.width + padding * 2} ${bounds.height + padding * 2}`);

        // Add background
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('width', '100%');
        background.setAttribute('height', '100%');
        background.setAttribute('fill', backgroundColor);
        exportSvg.appendChild(background);

        // Create a group to hold all content with proper offset
        const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        contentGroup.setAttribute('transform', `translate(${padding - bounds.minX}, ${padding - bounds.minY})`);

        // Clone and add all connections
        this.connections.forEach(connection => {
            const connectionElement = this.renderConnection(connection);
            contentGroup.appendChild(connectionElement);
        });

        // Clone and add all nodes
        this.nodes.forEach(node => {
            const nodeElement = this.renderNode(node);
            contentGroup.appendChild(nodeElement);
        });

        exportSvg.appendChild(contentGroup);

        // Convert SVG to image
        const svgData = new XMLSerializer().serializeToString(exportSvg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = bounds.width + padding * 2;
            canvas.height = bounds.height + padding * 2;

            // Fill background
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the SVG
            ctx.drawImage(img, 0, 0);

            // Convert to desired format and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                URL.revokeObjectURL(svgUrl);
            }, mimeType, 0.9);
        };

        img.src = svgUrl;
    }

    calculateBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x - node.width/2);
            minY = Math.min(minY, node.y - node.height/2);
            maxX = Math.max(maxX, node.x + node.width/2);
            maxY = Math.max(maxY, node.y + node.height/2);
        });

        // If no nodes, use default bounds
        if (minX === Infinity) {
            return { minX: 0, minY: 0, width: 800, height: 600 };
        }

        return {
            minX,
            minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    updateNodeText(nodeId, newText) {
        if (this.nodes.has(nodeId)) {
            const node = this.nodes.get(nodeId);
            const dimensions = this.calculateTextDimensions(newText);
            node.text = newText;
            node.width = dimensions.width;
            node.height = dimensions.height;
            node.wrappedLines = dimensions.wrappedLines;
            this.renderNode(node);
            this.emit('statusUpdate', `Updated node ${nodeId} text`);
        }
    }
}