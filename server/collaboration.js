const WebSocket = require('ws');
const { storage } = require('./storage');

class CollaborationManager {
  constructor() {
    this.rooms = new Map(); // mindMapId -> Set of websockets
    this.userSockets = new Map(); // websocket -> { userId, mindMapId, permission }
  }

  setupWebSocket(server) {
    const wss = new WebSocket.Server({ 
      server, 
      path: '/ws',
      verifyClient: (info) => {
        // Basic verification - in production, you'd want to verify the session
        return true;
      }
    });

    wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    return wss;
  }

  async handleMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case 'join_room':
        await this.handleJoinRoom(ws, data);
        break;
      case 'leave_room':
        this.handleLeaveRoom(ws);
        break;
      case 'mind_map_change':
        await this.handleMindMapChange(ws, data);
        break;
      case 'cursor_move':
        this.handleCursorMove(ws, data);
        break;
      case 'user_activity':
        this.handleUserActivity(ws, data);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  async handleJoinRoom(ws, data) {
    const { mindMapId, userId, shareCode } = data;
    
    try {
      let mindMap;
      
      // Get mind map by ID or share code
      if (mindMapId) {
        mindMap = await storage.getMindMap(mindMapId);
      } else if (shareCode) {
        mindMap = await storage.getMindMapByShareCode(shareCode);
      }

      if (!mindMap) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Mind map not found'
        }));
        return;
      }

      // Check access permissions
      const access = await storage.hasAccess(mindMap.id, userId);
      if (!access.access) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Access denied'
        }));
        return;
      }

      // Store user info for this connection
      this.userSockets.set(ws, {
        userId,
        mindMapId: mindMap.id,
        permission: access.permission
      });

      // Add to room
      if (!this.rooms.has(mindMap.id)) {
        this.rooms.set(mindMap.id, new Set());
      }
      this.rooms.get(mindMap.id).add(ws);

      // Send current mind map data
      ws.send(JSON.stringify({
        type: 'mind_map_data',
        data: {
          mindMap: mindMap,
          permission: access.permission
        }
      }));

      // Get collaborators info
      const collaborators = await storage.getCollaborators(mindMap.id);
      
      // Notify room about new user
      this.broadcastToRoom(mindMap.id, {
        type: 'user_joined',
        data: {
          userId,
          collaborators
        }
      }, ws);

      // Send active users to new user
      const activeUsers = Array.from(this.rooms.get(mindMap.id))
        .map(socket => this.userSockets.get(socket))
        .filter(user => user && user.userId !== userId);

      ws.send(JSON.stringify({
        type: 'active_users',
        data: activeUsers
      }));

      console.log(`User ${userId} joined room ${mindMap.id}`);

    } catch (error) {
      console.error('Error joining room:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to join room'
      }));
    }
  }

  handleLeaveRoom(ws) {
    const userInfo = this.userSockets.get(ws);
    if (!userInfo) return;

    const { userId, mindMapId } = userInfo;
    
    // Remove from room
    if (this.rooms.has(mindMapId)) {
      this.rooms.get(mindMapId).delete(ws);
      
      // Clean up empty rooms
      if (this.rooms.get(mindMapId).size === 0) {
        this.rooms.delete(mindMapId);
      } else {
        // Notify others about user leaving
        this.broadcastToRoom(mindMapId, {
          type: 'user_left',
          data: { userId }
        });
      }
    }

    this.userSockets.delete(ws);
    console.log(`User ${userId} left room ${mindMapId}`);
  }

  async handleMindMapChange(ws, data) {
    const userInfo = this.userSockets.get(ws);
    if (!userInfo) return;

    const { userId, mindMapId, permission } = userInfo;
    
    // Check edit permission
    if (permission === 'view') {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'No edit permission'
      }));
      return;
    }

    try {
      // Update mind map in database
      await storage.updateMindMap(mindMapId, data.mindMapData);
      
      // Log activity
      await storage.logActivity(mindMapId, userId, data.action, data);

      // Broadcast change to other users in room
      this.broadcastToRoom(mindMapId, {
        type: 'mind_map_change',
        data: {
          ...data,
          userId,
          timestamp: Date.now()
        }
      }, ws);

    } catch (error) {
      console.error('Error handling mind map change:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to save changes'
      }));
    }
  }

  handleCursorMove(ws, data) {
    const userInfo = this.userSockets.get(ws);
    if (!userInfo) return;

    const { userId, mindMapId } = userInfo;

    // Broadcast cursor position to other users
    this.broadcastToRoom(mindMapId, {
      type: 'cursor_move',
      data: {
        userId,
        x: data.x,
        y: data.y,
        timestamp: Date.now()
      }
    }, ws);
  }

  handleUserActivity(ws, data) {
    const userInfo = this.userSockets.get(ws);
    if (!userInfo) return;

    const { userId, mindMapId } = userInfo;

    // Broadcast user activity (typing, selecting, etc.)
    this.broadcastToRoom(mindMapId, {
      type: 'user_activity',
      data: {
        userId,
        activity: data.activity,
        nodeId: data.nodeId,
        timestamp: Date.now()
      }
    }, ws);
  }

  handleDisconnect(ws) {
    this.handleLeaveRoom(ws);
  }

  broadcastToRoom(mindMapId, message, excludeSocket = null) {
    if (!this.rooms.has(mindMapId)) return;

    const sockets = this.rooms.get(mindMapId);
    const messageStr = JSON.stringify(message);

    sockets.forEach(socket => {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
      }
    });
  }

  getRoomUsers(mindMapId) {
    if (!this.rooms.has(mindMapId)) return [];
    
    return Array.from(this.rooms.get(mindMapId))
      .map(socket => this.userSockets.get(socket))
      .filter(user => user);
  }
}

module.exports = CollaborationManager;