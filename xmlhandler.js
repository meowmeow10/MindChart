class XMLHandler {
    constructor() {
        this.version = '1.0';
    }

    serialize(data) {
        try {
            // Create XML document
            const xmlDoc = document.implementation.createDocument(null, 'mindmap');
            const root = xmlDoc.documentElement;
            
            // Add version attribute
            root.setAttribute('version', this.version);
            root.setAttribute('created', new Date().toISOString());

            // Add view information
            if (data.view) {
                const viewElement = xmlDoc.createElement('view');
                viewElement.setAttribute('zoom', data.view.zoom.toString());
                viewElement.setAttribute('panX', data.view.panX.toString());
                viewElement.setAttribute('panY', data.view.panY.toString());
                root.appendChild(viewElement);
            }

            // Add nodes
            if (data.nodes && data.nodes.length > 0) {
                const nodesElement = xmlDoc.createElement('nodes');
                
                for (const node of data.nodes) {
                    const nodeElement = xmlDoc.createElement('node');
                    nodeElement.setAttribute('id', node.id.toString());
                    nodeElement.setAttribute('x', node.x.toString());
                    nodeElement.setAttribute('y', node.y.toString());
                    nodeElement.setAttribute('width', node.width.toString());
                    nodeElement.setAttribute('height', node.height.toString());
                    nodeElement.setAttribute('color', node.color);
                    
                    // Add text content
                    const textElement = xmlDoc.createElement('text');
                    textElement.textContent = node.text;
                    nodeElement.appendChild(textElement);
                    
                    nodesElement.appendChild(nodeElement);
                }
                
                root.appendChild(nodesElement);
            }

            // Add connections
            if (data.connections && data.connections.length > 0) {
                const connectionsElement = xmlDoc.createElement('connections');
                
                for (const connection of data.connections) {
                    const connectionElement = xmlDoc.createElement('connection');
                    connectionElement.setAttribute('id', connection.id.toString());
                    connectionElement.setAttribute('fromId', connection.fromId.toString());
                    connectionElement.setAttribute('toId', connection.toId.toString());
                    connectionsElement.appendChild(connectionElement);
                }
                
                root.appendChild(connectionsElement);
            }

            // Serialize to string
            return this.formatXML(new XMLSerializer().serializeToString(xmlDoc));
        } catch (error) {
            throw new Error('Failed to serialize mind map: ' + error.message);
        }
    }

    deserialize(xmlString) {
        try {
            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Invalid XML format: ' + parserError.textContent);
            }

            const root = xmlDoc.documentElement;
            if (root.tagName !== 'mindmap') {
                throw new Error('Invalid mind map file: root element must be "mindmap"');
            }

            const data = {
                nodes: [],
                connections: [],
                view: { zoom: 1, panX: 0, panY: 0 }
            };

            // Parse view information
            const viewElement = root.querySelector('view');
            if (viewElement) {
                data.view = {
                    zoom: parseFloat(viewElement.getAttribute('zoom')) || 1,
                    panX: parseFloat(viewElement.getAttribute('panX')) || 0,
                    panY: parseFloat(viewElement.getAttribute('panY')) || 0
                };
            }

            // Parse nodes
            const nodesElement = root.querySelector('nodes');
            if (nodesElement) {
                const nodeElements = nodesElement.querySelectorAll('node');
                for (const nodeElement of nodeElements) {
                    const textElement = nodeElement.querySelector('text');
                    const node = {
                        id: parseInt(nodeElement.getAttribute('id')),
                        x: parseFloat(nodeElement.getAttribute('x')),
                        y: parseFloat(nodeElement.getAttribute('y')),
                        width: parseFloat(nodeElement.getAttribute('width')) || 120,
                        height: parseFloat(nodeElement.getAttribute('height')) || 60,
                        color: nodeElement.getAttribute('color') || '#e3f2fd',
                        text: textElement ? textElement.textContent : ''
                    };
                    
                    // Validate required fields
                    if (isNaN(node.id) || isNaN(node.x) || isNaN(node.y)) {
                        throw new Error('Invalid node data: missing or invalid id, x, or y coordinates');
                    }
                    
                    data.nodes.push(node);
                }
            }

            // Parse connections
            const connectionsElement = root.querySelector('connections');
            if (connectionsElement) {
                const connectionElements = connectionsElement.querySelectorAll('connection');
                for (const connectionElement of connectionElements) {
                    const connection = {
                        id: parseInt(connectionElement.getAttribute('id')),
                        fromId: parseInt(connectionElement.getAttribute('fromId')),
                        toId: parseInt(connectionElement.getAttribute('toId'))
                    };
                    
                    // Validate required fields
                    if (isNaN(connection.id) || isNaN(connection.fromId) || isNaN(connection.toId)) {
                        throw new Error('Invalid connection data: missing or invalid id, fromId, or toId');
                    }
                    
                    // Verify that referenced nodes exist
                    const fromNodeExists = data.nodes.some(node => node.id === connection.fromId);
                    const toNodeExists = data.nodes.some(node => node.id === connection.toId);
                    
                    if (!fromNodeExists || !toNodeExists) {
                        console.warn(`Connection ${connection.id} references non-existent nodes, skipping`);
                        continue;
                    }
                    
                    data.connections.push(connection);
                }
            }

            // Ensure at least one node exists
            if (data.nodes.length === 0) {
                data.nodes.push({
                    id: 1,
                    x: 400,
                    y: 300,
                    width: 120,
                    height: 60,
                    color: '#ffeb3b',
                    text: 'Central Idea'
                });
            }

            return data;
        } catch (error) {
            throw new Error('Failed to load mind map: ' + error.message);
        }
    }

    formatXML(xmlString) {
        // Simple XML formatting for better readability
        let formatted = xmlString;
        let indent = '';
        const indentChar = '  ';
        
        // Add line breaks and indentation
        formatted = formatted.replace(/></g, '>\n<');
        
        const lines = formatted.split('\n');
        let result = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('</')) {
                // Closing tag - decrease indent
                indent = indent.substring(indentChar.length);
                result += indent + line + '\n';
            } else if (line.includes('</')) {
                // Self-closing or opening/closing on same line
                result += indent + line + '\n';
            } else if (line.startsWith('<')) {
                // Opening tag - add current indent then increase
                result += indent + line + '\n';
                if (!line.endsWith('/>') && !line.includes('</')) {
                    indent += indentChar;
                }
            } else if (line.length > 0) {
                // Text content
                result += indent + line + '\n';
            }
        }
        
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + result.trim();
    }

    // Utility method to validate XML structure
    validateXML(xmlString) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            const parserError = xmlDoc.querySelector('parsererror');
            return !parserError;
        } catch (error) {
            return false;
        }
    }

    // Create a sample mind map for testing
    createSampleMindMap() {
        return {
            nodes: [
                {
                    id: 1,
                    x: 400,
                    y: 300,
                    width: 120,
                    height: 60,
                    color: '#ffeb3b',
                    text: 'Central Idea'
                },
                {
                    id: 2,
                    x: 250,
                    y: 200,
                    width: 120,
                    height: 60,
                    color: '#e3f2fd',
                    text: 'Branch 1'
                },
                {
                    id: 3,
                    x: 550,
                    y: 200,
                    width: 120,
                    height: 60,
                    color: '#e8f5e8',
                    text: 'Branch 2'
                }
            ],
            connections: [
                {
                    id: 1,
                    fromId: 1,
                    toId: 2
                },
                {
                    id: 2,
                    fromId: 1,
                    toId: 3
                }
            ],
            view: {
                zoom: 1,
                panX: 0,
                panY: 0
            }
        };
    }
}
