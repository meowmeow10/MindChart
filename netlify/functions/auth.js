const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");

// Configure Google OAuth strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.URL || 'https://your-site.netlify.app'}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = {
        id: profile.id,
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        profileImageUrl: profile.photos[0].value
      };
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

exports.handler = async (event, context) => {
  const { httpMethod, path, headers, queryStringParameters } = event;
  
  // Get the actual path from query parameters (due to Netlify redirect)
  const actualPath = queryStringParameters?.path || path;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const pathParts = actualPath.split('/').filter(p => p);
    
    // Handle /api/login
    if (httpMethod === 'GET' && (pathParts[0] === 'login' || actualPath.includes('login'))) {
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        // Redirect to Google OAuth
        // Use the exact URL format expected by Google
        const protocol = headers['x-forwarded-proto'] || 'https';
        const host = headers.host || process.env.URL?.replace(/https?:\/\//, '');
        const baseUrl = `${protocol}://${host}`;
        const redirectUri = `${baseUrl}/api/auth/google/callback`;
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=profile email&` +
          `response_type=code&` +
          `access_type=offline`;
        
        return {
          statusCode: 302,
          headers: {
            ...corsHeaders,
            'Location': authUrl
          },
          body: ''
        };
      } else {
        // Demo mode fallback
        return {
          statusCode: 302,
          headers: {
            ...corsHeaders,
            'Location': '/?demo=true',
            'Set-Cookie': 'demo_user=true; Path=/; HttpOnly; Max-Age=86400'
          },
          body: ''
        };
      }
    }

    // Handle /api/logout
    if (httpMethod === 'GET' && (pathParts[0] === 'logout' || actualPath.includes('logout'))) {
      return {
        statusCode: 302,
        headers: {
          ...corsHeaders,
          'Location': '/',
          'Set-Cookie': [
            'demo_user=; Path=/; HttpOnly; Max-Age=0',
            'user_token=; Path=/; HttpOnly; Max-Age=0'
          ]
        },
        body: ''
      };
    }

    // Handle /api/auth/user
    if (httpMethod === 'GET' && (actualPath.includes('auth/user') || (pathParts[0] === 'auth' && pathParts[1] === 'user'))) {
      const cookies = headers.cookie || '';
      
      // Check for demo user cookie
      if (cookies.includes('demo_user=true')) {
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'demo-user',
            email: 'demo@example.com',
            firstName: 'Demo',
            lastName: 'User'
          })
        };
      }
      
      // Check for authenticated user token
      const userTokenMatch = cookies.match(/user_token=([^;]+)/);
      if (userTokenMatch) {
        try {
          const userToken = userTokenMatch[1];
          const userData = JSON.parse(Buffer.from(userToken, 'base64').toString());
          
          // Check if token is still valid
          if (userData.exp && userData.exp > Date.now()) {
            return {
              statusCode: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: userData.id,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                profileImageUrl: userData.profileImageUrl
              })
            };
          }
        } catch (error) {
          console.error('Token decode error:', error);
        }
      }
      
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Not authenticated' })
      };
    }

    // Handle Google OAuth callback
    if (httpMethod === 'GET' && (actualPath.includes('auth/google/callback') || (pathParts[0] === 'auth' && pathParts[1] === 'google' && pathParts[2] === 'callback'))) {
      const { code } = event.queryStringParameters || {};
      
      if (!code) {
        return {
          statusCode: 302,
          headers: {
            ...corsHeaders,
            'Location': '/?error=auth_failed'
          },
          body: ''
        };
      }

      try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: `${protocol}://${host}/api/auth/google/callback`
          })
        });

        const tokens = await tokenResponse.json();
        
        if (!tokens.access_token) {
          throw new Error('No access token received');
        }

        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`
          }
        });

        const userInfo = await userResponse.json();

        // Create a simple JWT-like token (in production, use proper JWT)
        const userToken = Buffer.from(JSON.stringify({
          id: userInfo.id,
          email: userInfo.email,
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          profileImageUrl: userInfo.picture,
          exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        })).toString('base64');

        return {
          statusCode: 302,
          headers: {
            ...corsHeaders,
            'Location': '/?auth=success',
            'Set-Cookie': `user_token=${userToken}; Path=/; HttpOnly; Max-Age=86400; Secure; SameSite=Strict`
          },
          body: ''
        };

      } catch (error) {
        console.error('OAuth callback error:', error);
        return {
          statusCode: 302,
          headers: {
            ...corsHeaders,
            'Location': '/?error=auth_callback_failed'
          },
          body: ''
        };
      }
    }

    return {
      statusCode: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Not found' })
    };

  } catch (error) {
    console.error('Auth function error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};