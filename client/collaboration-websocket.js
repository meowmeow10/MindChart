// Alternative WebSocket implementation using third-party services for Netlify
class NetlifyCollaborationClient {
  constructor(mindMapApp) {
    this.app = mindMapApp;
    this.isConnected = false;
    this.currentUser = null;
    this.currentMindMapId = null;
    this.activeCursors = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // For Netlify deployment, we'll use a WebSocket service like Pusher or Socket.io
    // For demo purposes, we'll simulate collaboration with periodic polling
    this.isPolling = false;
    this.pollInterval = null;
  }

  async connect(mindMapId, userId, shareCode = null) {
    console.log('Connecting to collaboration service...');
    this.currentUser = userId;
    this.currentMindMapId = mindMapId;
    
    // Simulate connection for demo
    setTimeout(() => {
      this.isConnected = true;
      this.app.updateStatus('Connected to collaboration service (demo mode)');
      
      // Start polling for changes (in production, use real WebSocket service)
      this.startPolling();
    }, 1000);
  }

  disconnect() {
    this.isConnected = false;
    this.stopPolling();
    this.clearActiveCursors();
  }

  startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.pollInterval = setInterval(() => {
      // In production, this would poll for changes from your backend
      this.checkForUpdates();
    }, 2000);
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async checkForUpdates() {
    // In production, this would check for new changes from other users
    // For demo, we'll just update the status periodically
    if (Math.random() < 0.1) { // 10% chance
      this.app.updateDebugInfo('Checking for collaboration updates...');
    }
  }

  // Send local changes to other users
  broadcastChange(action, data) {
    if (!this.isConnected) return;
    
    // In production, this would send to your WebSocket service
    console.log('Broadcasting change:', action, data);
  }

  broadcastCursorMove(x, y) {
    if (!this.isConnected) return;
    
    // In production, this would broadcast cursor position
    console.log('Broadcasting cursor move:', x, y);
  }

  broadcastUserActivity(activity, nodeId = null) {
    if (!this.isConnected) return;
    
    // In production, this would broadcast user activity
    console.log('Broadcasting user activity:', activity, nodeId);
  }

  // Cursor management (simplified for demo)
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
    cursor.style.display = 'none';

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
}

// Export for use in main app
window.NetlifyCollaborationClient = NetlifyCollaborationClient;