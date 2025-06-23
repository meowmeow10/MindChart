class CollaborationClient {
  constructor(mindMapApp) {
    this.app = mindMapApp;
    this.ws = null;
    this.isConnected = false;
    this.currentUser = null;
    this.currentMindMapId = null;
    this.activeCursors = new Map(); // userId -> cursor element
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async connect(mindMapId, userId, shareCode = null) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.currentUser = userId;
      this.currentMindMapId = mindMapId;

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Join the room
        this.send({
          type: 'join_room',
          data: { mindMapId, userId, shareCode }
        });

        this.app.updateStatus('Connected to collaboration server');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.app.updateStatus('Disconnected from collaboration server');
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`Reconnection attempt ${this.reconnectAttempts}`);
            this.connect(mindMapId, userId, shareCode);
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.app.updateStatus('Collaboration connection error');
      };

    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      this.app.updateStatus('Failed to connect to collaboration server');
    }
  }

  disconnect() {
    if (this.ws) {
      this.send({ type: 'leave_room' });
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.clearActiveCursors();
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  handleMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'mind_map_data':
        this.handleMindMapData(data);
        break;
      case 'mind_map_change':
        this.handleMindMapChange(data);
        break;
      case 'user_joined':
        this.handleUserJoined(data);
        break;
      case 'user_left':
        this.handleUserLeft(data);
        break;
      case 'active_users':
        this.handleActiveUsers(data);
        break;
      case 'cursor_move':
        this.handleCursorMove(data);
        break;
      case 'user_activity':
        this.handleUserActivity(data);
        break;
      case 'error':
        this.handleError(data);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }

  handleMindMapData(data) {
    const { mindMap, permission } = data;
    
    // Load the mind map data
    if (mindMap.data) {
      this.app.mindMap.loadData(mindMap.data);
      this.app.updateStatus(`Loaded shared mind map: ${mindMap.title}`);
    }

    // Update UI based on permissions
    this.updateUIForPermission(permission);
  }

  handleMindMapChange(data) {
    const { action, userId, timestamp } = data;
    
    // Don't apply our own changes
    if (userId === this.currentUser) return;

    // Apply the change to the mind map
    switch (action) {
      case 'node_add':
        this.applyNodeAdd(data);
        break;
      case 'node_update':
        this.applyNodeUpdate(data);
        break;
      case 'node_delete':
        this.applyNodeDelete(data);
        break;
      case 'connection_add':
        this.applyConnectionAdd(data);
        break;
      case 'connection_delete':
        this.applyConnectionDelete(data);
        break;
      default:
        console.log('Unknown change action:', action);
    }

    this.app.updateDebugInfo(`Remote change: ${action} by user ${userId}`);
  }

  handleUserJoined(data) {
    const { userId, collaborators } = data;
    this.app.updateStatus(`User ${userId} joined collaboration`);
    this.updateCollaboratorsList(collaborators);
  }

  handleUserLeft(data) {
    const { userId } = data;
    this.app.updateStatus(`User ${userId} left collaboration`);
    this.removeCursor(userId);
  }

  handleActiveUsers(data) {
    // Initialize cursors for active users
    data.forEach(user => {
      if (user.userId !== this.currentUser) {
        this.createCursor(user.userId);
      }
    });
  }

  handleCursorMove(data) {
    const { userId, x, y } = data;
    if (userId !== this.currentUser) {
      this.updateCursor(userId, x, y);
    }
  }

  handleUserActivity(data) {
    const { userId, activity, nodeId } = data;
    // Show user activity indicators (e.g., typing, selecting)
    this.showUserActivity(userId, activity, nodeId);
  }

  handleError(data) {
    console.error('Collaboration error:', data);
    this.app.updateStatus(`Error: ${data.message || data}`);
  }

  // Apply remote changes
  applyNodeAdd(data) {
    const { nodeData } = data;
    if (nodeData) {
      this.app.mindMap.addNode(nodeData.x, nodeData.y, nodeData.text, nodeData.color);
    }
  }

  applyNodeUpdate(data) {
    const { nodeId, updates } = data;
    if (this.app.mindMap.nodes.has(nodeId)) {
      this.app.mindMap.updateNode(nodeId, updates);
    }
  }

  applyNodeDelete(data) {
    const { nodeId } = data;
    if (this.app.mindMap.nodes.has(nodeId)) {
      this.app.mindMap.deleteNode(nodeId);
    }
  }

  applyConnectionAdd(data) {
    const { fromId, toId } = data;
    this.app.mindMap.addConnection(fromId, toId);
  }

  applyConnectionDelete(data) {
    const { connectionId } = data;
    if (this.app.mindMap.connections.has(connectionId)) {
      this.app.mindMap.deleteConnection(connectionId);
    }
  }

  // Send local changes to other users
  broadcastChange(action, data) {
    if (!this.isConnected) return;

    this.send({
      type: 'mind_map_change',
      data: {
        action,
        ...data,
        mindMapData: this.app.mindMap.getData()
      }
    });
  }

  broadcastCursorMove(x, y) {
    if (!this.isConnected) return;

    this.send({
      type: 'cursor_move',
      data: { x, y }
    });
  }

  broadcastUserActivity(activity, nodeId = null) {
    if (!this.isConnected) return;

    this.send({
      type: 'user_activity',
      data: { activity, nodeId }
    });
  }

  // Cursor management
  createCursor(userId) {
    if (this.activeCursors.has(userId)) return;

    const cursor = document.createElement('div');
    cursor.className = 'collaboration-cursor';
    cursor.innerHTML = `
      <div class="cursor-pointer"></div>
      <div class="cursor-label">${userId}</div>
    `;
    cursor.style.position = 'absolute';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '1000';
    cursor.style.transform = 'translate(-50%, -50%)';

    document.getElementById('mindmap-canvas').appendChild(cursor);
    this.activeCursors.set(userId, cursor);
  }

  updateCursor(userId, x, y) {
    const cursor = this.activeCursors.get(userId);
    if (cursor) {
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
      cursor.style.display = 'block';
      
      // Hide cursor after inactivity
      clearTimeout(cursor.hideTimer);
      cursor.hideTimer = setTimeout(() => {
        cursor.style.display = 'none';
      }, 3000);
    } else {
      this.createCursor(userId);
      this.updateCursor(userId, x, y);
    }
  }

  removeCursor(userId) {
    const cursor = this.activeCursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.activeCursors.delete(userId);
    }
  }

  clearActiveCursors() {
    this.activeCursors.forEach(cursor => cursor.remove());
    this.activeCursors.clear();
  }

  updateUIForPermission(permission) {
    const isReadOnly = permission === 'view';
    
    // Disable edit controls for view-only users
    document.getElementById('add-node').disabled = isReadOnly;
    document.getElementById('delete-node').disabled = isReadOnly;
    document.getElementById('connect-mode').disabled = isReadOnly;
    
    if (isReadOnly) {
      this.app.updateStatus('View-only access - changes cannot be saved');
    }
  }

  updateCollaboratorsList(collaborators) {
    // Update UI to show current collaborators
    // This could be implemented as a sidebar or status indicator
    console.log('Current collaborators:', collaborators);
  }

  showUserActivity(userId, activity, nodeId) {
    // Show visual indicators for user activities
    // E.g., show typing indicator, selection highlight, etc.
    console.log(`User ${userId} is ${activity}${nodeId ? ` on node ${nodeId}` : ''}`);
  }
}

// Export for use in main app
window.CollaborationClient = CollaborationClient;