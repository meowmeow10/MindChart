// Real-time collaboration using Pusher for Netlify deployment
class PusherCollaborationClient {
  constructor(mindMapApp) {
    this.app = mindMapApp;
    this.pusher = null;
    this.channel = null;
    this.isConnected = false;
    this.currentUser = null;
    this.currentMindMapId = null;
    this.activeCursors = new Map();
    this.userColors = new Map();
    this.colorPalette = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14', '#e83e8c'];
  }

  async connect(mindMapId, userId, shareCode = null) {
    if (!window.Pusher) {
      console.error('Pusher library not loaded');
      this.app.updateStatus('Pusher library required for real-time collaboration');
      return;
    }

    this.currentUser = userId;
    this.currentMindMapId = mindMapId;

    try {
      // Initialize Pusher with your app key
      this.pusher = new window.Pusher(window.PUSHER_APP_KEY || 'demo-key', {
        cluster: window.PUSHER_CLUSTER || 'us2',
        encrypted: true,
        authEndpoint: '/api/pusher/auth',
        auth: {
          headers: {
            'X-User-ID': userId
          }
        }
      });

      // Subscribe to the mind map channel
      const channelName = `private-mindmap-${mindMapId}`;
      this.channel = this.pusher.subscribe(channelName);

      this.channel.bind('pusher:subscription_succeeded', () => {
        this.isConnected = true;
        this.app.updateStatus('Connected to real-time collaboration');
        
        // Announce user presence
        this.channel.trigger('client-user-joined', {
          userId: this.currentUser,
          timestamp: Date.now()
        });
      });

      this.channel.bind('pusher:subscription_error', (error) => {
        console.error('Pusher subscription error:', error);
        this.app.updateStatus('Failed to connect to collaboration server');
      });

      // Listen for events
      this.setupEventListeners();

    } catch (error) {
      console.error('Failed to connect to Pusher:', error);
      this.app.updateStatus('Collaboration connection failed');
    }
  }

  setupEventListeners() {
    if (!this.channel) return;

    // Mind map changes
    this.channel.bind('client-mind-map-change', (data) => {
      if (data.userId !== this.currentUser) {
        this.handleRemoteChange(data);
      }
    });

    // User presence
    this.channel.bind('client-user-joined', (data) => {
      if (data.userId !== this.currentUser) {
        this.handleUserJoined(data);
      }
    });

    this.channel.bind('client-user-left', (data) => {
      this.handleUserLeft(data);
    });

    // Cursor movements
    this.channel.bind('client-cursor-move', (data) => {
      if (data.userId !== this.currentUser) {
        this.handleCursorMove(data);
      }
    });

    // User activities
    this.channel.bind('client-user-activity', (data) => {
      if (data.userId !== this.currentUser) {
        this.handleUserActivity(data);
      }
    });
  }

  disconnect() {
    if (this.channel) {
      this.channel.trigger('client-user-left', {
        userId: this.currentUser,
        timestamp: Date.now()
      });
      this.pusher.unsubscribe(this.channel.name);
    }

    if (this.pusher) {
      this.pusher.disconnect();
    }

    this.isConnected = false;
    this.clearActiveCursors();
    this.app.updateStatus('Disconnected from collaboration');
  }

  // Send local changes to other users
  broadcastChange(action, data) {
    if (!this.isConnected || !this.channel) return;

    this.channel.trigger('client-mind-map-change', {
      action,
      userId: this.currentUser,
      timestamp: Date.now(),
      ...data
    });
  }

  broadcastCursorMove(x, y) {
    if (!this.isConnected || !this.channel) return;

    this.channel.trigger('client-cursor-move', {
      userId: this.currentUser,
      x,
      y,
      timestamp: Date.now()
    });
  }

  broadcastUserActivity(activity, nodeId = null) {
    if (!this.isConnected || !this.channel) return;

    this.channel.trigger('client-user-activity', {
      userId: this.currentUser,
      activity,
      nodeId,
      timestamp: Date.now()
    });
  }

  // Handle remote events
  handleRemoteChange(data) {
    const { action } = data;

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
    }

    this.app.updateDebugInfo(`Remote ${action} by ${data.userId}`);
  }

  handleUserJoined(data) {
    const { userId } = data;
    this.createCursor(userId);
    this.app.updateDebugInfo(`${userId} joined collaboration`);
  }

  handleUserLeft(data) {
    const { userId } = data;
    this.removeCursor(userId);
    this.userColors.delete(userId);
    this.app.updateDebugInfo(`${userId} left collaboration`);
  }

  handleCursorMove(data) {
    const { userId, x, y } = data;
    this.updateCursor(userId, x, y);
  }

  handleUserActivity(data) {
    const { userId, activity, nodeId } = data;
    this.showUserActivity(userId, activity, nodeId);
  }

  // Apply remote changes to local mind map
  applyNodeAdd(data) {
    const { nodeData } = data;
    if (nodeData && this.app.mindMap) {
      this.app.mindMap.addNode(nodeData.x, nodeData.y, nodeData.text, nodeData.color);
    }
  }

  applyNodeUpdate(data) {
    const { nodeId, updates } = data;
    if (this.app.mindMap && this.app.mindMap.nodes.has(nodeId)) {
      this.app.mindMap.updateNode(nodeId, updates);
    }
  }

  applyNodeDelete(data) {
    const { nodeId } = data;
    if (this.app.mindMap && this.app.mindMap.nodes.has(nodeId)) {
      this.app.mindMap.deleteNode(nodeId);
    }
  }

  applyConnectionAdd(data) {
    const { fromId, toId } = data;
    if (this.app.mindMap) {
      this.app.mindMap.addConnection(fromId, toId);
    }
  }

  applyConnectionDelete(data) {
    const { connectionId } = data;
    if (this.app.mindMap && this.app.mindMap.connections.has(connectionId)) {
      this.app.mindMap.deleteConnection(connectionId);
    }
  }

  // Cursor management
  getUserColor(userId) {
    if (!this.userColors.has(userId)) {
      const colorIndex = this.userColors.size % this.colorPalette.length;
      this.userColors.set(userId, this.colorPalette[colorIndex]);
    }
    return this.userColors.get(userId);
  }

  createCursor(userId) {
    if (this.activeCursors.has(userId)) return;

    const color = this.getUserColor(userId);
    const cursor = document.createElement('div');
    cursor.className = 'collaboration-cursor';
    cursor.innerHTML = `
      <div class="cursor-pointer" style="border-left-color: ${color}"></div>
      <div class="cursor-label" style="background: ${color}">${userId}</div>
    `;
    cursor.style.position = 'absolute';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '1000';
    cursor.style.transform = 'translate(-50%, -50%)';
    cursor.style.display = 'none';

    const canvas = document.getElementById('mindmap-canvas');
    if (canvas) {
      canvas.appendChild(cursor);
      this.activeCursors.set(userId, cursor);
    }
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

  showUserActivity(userId, activity, nodeId) {
    // Show activity indicators
    const color = this.getUserColor(userId);
    const indicator = document.createElement('div');
    indicator.className = 'user-activity-indicator';
    indicator.style.cssText = `
      position: absolute;
      background: ${color};
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      z-index: 1001;
      pointer-events: none;
    `;
    indicator.textContent = `${userId} ${activity}`;

    if (nodeId && this.app.mindMap && this.app.mindMap.nodes.has(nodeId)) {
      const node = this.app.mindMap.nodes.get(nodeId);
      indicator.style.left = (node.x + 50) + 'px';
      indicator.style.top = (node.y - 30) + 'px';
    } else {
      indicator.style.left = '20px';
      indicator.style.top = '20px';
    }

    const canvas = document.getElementById('mindmap-canvas');
    if (canvas) {
      canvas.appendChild(indicator);
      setTimeout(() => indicator.remove(), 2000);
    }
  }
}

// Export for use in main app
window.PusherCollaborationClient = PusherCollaborationClient;