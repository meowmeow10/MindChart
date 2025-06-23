// Pusher authentication endpoint for private channels
exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { socket_id, channel_name } = JSON.parse(event.body || '{}');
    const userId = event.headers['x-user-id'] || 'anonymous';

    // Validate that user has access to the requested channel
    if (!channel_name.startsWith('private-mindmap-')) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized channel' })
      };
    }

    // In production, you'd validate user permissions here
    // For now, allow all authenticated users
    
    const Pusher = require('pusher');
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || 'us2',
      useTLS: true
    });

    const presenceData = {
      user_id: userId,
      user_info: {
        name: userId,
        joined_at: new Date().toISOString()
      }
    };

    const authResponse = pusher.authorizeChannel(socket_id, channel_name, presenceData);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(authResponse)
    };

  } catch (error) {
    console.error('Pusher auth error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};