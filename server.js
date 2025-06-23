const express = require('express');
const http = require('http');
const path = require('path');
const { setupAuth, isAuthenticated } = require('./server/replitAuth');
const { storage } = require('./server/storage');
const CollaborationManager = require('./server/collaboration');

const app = express();
const server = http.createServer(app);
const collaborationManager = new CollaborationManager();

// Setup middleware
app.use(express.json());
app.use(express.static('.'));

// Initialize WebSocket for collaboration
collaborationManager.setupWebSocket(server);

// Initialize authentication
setupAuth(app).then(() => {
  console.log('Authentication setup complete');
}).catch(err => {
  console.error('Authentication setup failed:', err);
});

// API Routes
app.get('/api/auth/user', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Mind map routes
app.post('/api/mindmaps', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const { title, data, isPublic } = req.body;
    
    const mindMap = await storage.createMindMap(userId, title, data, isPublic);
    res.json(mindMap);
  } catch (error) {
    console.error('Error creating mind map:', error);
    res.status(500).json({ message: 'Failed to create mind map' });
  }
});

app.get('/api/mindmaps', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const mindMaps = await storage.getUserMindMaps(userId);
    res.json(mindMaps);
  } catch (error) {
    console.error('Error fetching mind maps:', error);
    res.status(500).json({ message: 'Failed to fetch mind maps' });
  }
});

app.get('/api/mindmaps/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const mindMapId = parseInt(req.params.id);
    
    const access = await storage.hasAccess(mindMapId, userId);
    if (!access.access) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const mindMap = await storage.getMindMap(mindMapId);
    if (!mindMap) {
      return res.status(404).json({ message: 'Mind map not found' });
    }
    
    const collaborators = await storage.getCollaborators(mindMapId);
    
    res.json({
      ...mindMap,
      permission: access.permission,
      collaborators
    });
  } catch (error) {
    console.error('Error fetching mind map:', error);
    res.status(500).json({ message: 'Failed to fetch mind map' });
  }
});

app.put('/api/mindmaps/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const mindMapId = parseInt(req.params.id);
    const { data } = req.body;
    
    const access = await storage.hasAccess(mindMapId, userId);
    if (!access.access || access.permission === 'view') {
      return res.status(403).json({ message: 'Edit permission denied' });
    }
    
    const mindMap = await storage.updateMindMap(mindMapId, data);
    res.json(mindMap);
  } catch (error) {
    console.error('Error updating mind map:', error);
    res.status(500).json({ message: 'Failed to update mind map' });
  }
});

// Share mind map by code
app.get('/api/mindmaps/share/:shareCode', async (req, res) => {
  try {
    const { shareCode } = req.params;
    const mindMap = await storage.getMindMapByShareCode(shareCode);
    
    if (!mindMap) {
      return res.status(404).json({ message: 'Mind map not found' });
    }
    
    res.json({
      id: mindMap.id,
      title: mindMap.title,
      shareCode: mindMap.shareCode,
      isPublic: mindMap.isPublic
    });
  } catch (error) {
    console.error('Error fetching shared mind map:', error);
    res.status(500).json({ message: 'Failed to fetch mind map' });
  }
});

// Add collaborator
app.post('/api/mindmaps/:id/collaborators', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.claims.sub;
    const mindMapId = parseInt(req.params.id);
    const { collaboratorId, permission } = req.body;
    
    const access = await storage.hasAccess(mindMapId, userId);
    if (!access.access || access.permission !== 'owner') {
      return res.status(403).json({ message: 'Owner permission required' });
    }
    
    const collaborator = await storage.addCollaborator(mindMapId, collaboratorId, permission);
    res.json(collaborator);
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ message: 'Failed to add collaborator' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
});
