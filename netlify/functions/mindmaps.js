// Database setup for Netlify serverless functions
let db;

async function getDatabase() {
  if (!db && process.env.DATABASE_URL) {
    const { Pool, neonConfig } = require('@neondatabase/serverless');
    const { drizzle } = require('drizzle-orm/neon-serverless');
    
    neonConfig.webSocketConstructor = require("ws");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool });
  }
  return db;
}

// Simple storage functions for serverless
const storage = {
  async createMindMap(ownerId, title, data, isPublic = false) {
    const database = await getDatabase();
    const shareCode = Math.random().toString(36).substring(2, 14).toUpperCase();
    
    if (database) {
      // Use actual database if available
      const result = await database.execute(`
        INSERT INTO mind_maps (title, owner_id, data, is_public, share_code, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [title, ownerId, JSON.stringify(data), isPublic, shareCode]);
      
      return result.rows[0];
    } else {
      // Fallback for development
      return {
        id: Date.now(),
        title,
        owner_id: ownerId,
        data,
        is_public: isPublic,
        share_code: shareCode,
        created_at: new Date(),
        updated_at: new Date()
      };
    }
  },

  async getMindMapByShareCode(shareCode) {
    const database = await getDatabase();
    
    if (database) {
      const result = await database.execute(`
        SELECT * FROM mind_maps WHERE share_code = $1
      `, [shareCode]);
      
      return result.rows[0] || null;
    } else {
      // Fallback for development - extract ID from share code
      const idMatch = shareCode.match(/MM-(\d+)/);
      if (idMatch) {
        const id = parseInt(idMatch[1]);
        return {
          id,
          title: 'Demo Mind Map',
          share_code: shareCode,
          is_public: true
        };
      }
      return null;
    }
  },

  async getUserMindMaps(userId) {
    // Simplified - return empty array for now
    return [];
  }
};

exports.handler = async (event, context) => {
  const { httpMethod, path, body, headers } = event;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const pathParts = path.split('/').filter(p => p);
    
    if (httpMethod === 'POST' && pathParts[0] === 'mindmaps') {
      const { title, data, isPublic } = JSON.parse(body);
      // For demo - you'd need proper auth here
      const userId = 'demo-user';
      
      const mindMap = await storage.createMindMap(userId, title, data, isPublic);
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(mindMap)
      };
    }

    if (httpMethod === 'GET' && pathParts[0] === 'mindmaps' && pathParts[1] === 'share') {
      const shareCode = pathParts[2];
      const mindMap = await storage.getMindMapByShareCode(shareCode);
      
      if (!mindMap) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Mind map not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(mindMap)
      };
    }

    if (httpMethod === 'GET' && pathParts[0] === 'mindmaps') {
      // For demo - you'd need proper auth here
      const userId = 'demo-user';
      const mindMaps = await storage.getUserMindMaps(userId);
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(mindMaps)
      };
    }

    return {
      statusCode: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Not found' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};