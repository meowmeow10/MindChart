# MindMapper Deployment Guide

## Netlify Deployment (Recommended for Static Hosting)

### Prerequisites
1. Neon PostgreSQL database
2. Netlify account
3. GitHub repository

### Setup Steps

1. **Prepare Your Neon Database**
   - Create tables using the SQL provided below
   - Copy your Neon database connection string

2. **Set up Pusher for Real-time Collaboration**
   - Create a free account at [pusher.com](https://pusher.com)
   - Create a new app and get your credentials
   - Choose a cluster closest to your users

3. **Environment Variables in Netlify**
   Set these in your Netlify site settings:
   ```
   DATABASE_URL=your_neon_database_url
   NODE_ENV=production
   PUSHER_APP_ID=your_pusher_app_id
   PUSHER_KEY=your_pusher_key
   PUSHER_SECRET=your_pusher_secret
   PUSHER_CLUSTER=your_pusher_cluster
   ```

4. **Add Pusher Configuration to Your Site**
   Add these as environment variables in your frontend (or directly in index.html):
   ```javascript
   window.PUSHER_APP_KEY = 'your_pusher_key';
   window.PUSHER_CLUSTER = 'your_pusher_cluster';
   ```

2. **Deploy to Netlify**
   - Connect your GitHub repository to Netlify
   - The `netlify.toml` file will handle the build configuration
   - Serverless functions will handle API endpoints

3. **Collaboration Options for Netlify**

   **Option A: Simplified Collaboration (Current)**
   - Uses periodic polling instead of real-time WebSockets
   - Works entirely on Netlify without additional services
   - Good for basic collaboration needs

   **Option B: Real-time WebSocket Service**
   - Integrate with Pusher, Socket.io, or Ably
   - Requires API keys for third-party service
   - Provides true real-time collaboration

   **Option C: Hybrid Approach**
   - Keep mind map data on Netlify functions
   - Use WebSocket service only for real-time events
   - Best of both worlds

### Database Setup
Your Neon database should have these tables:
```sql
-- Users table
CREATE TABLE users (
    id varchar PRIMARY KEY,
    email varchar UNIQUE,
    first_name varchar,
    last_name varchar,
    profile_image_url varchar,
    created_at timestamp DEFAULT NOW(),
    updated_at timestamp DEFAULT NOW()
);

-- Mind maps table
CREATE TABLE mind_maps (
    id serial PRIMARY KEY,
    title varchar(255) NOT NULL DEFAULT 'Untitled Mind Map',
    owner_id varchar NOT NULL REFERENCES users(id),
    data jsonb NOT NULL,
    is_public boolean DEFAULT false,
    share_code varchar(12) UNIQUE,
    created_at timestamp DEFAULT NOW(),
    updated_at timestamp DEFAULT NOW()
);

-- Collaborators table
CREATE TABLE collaborators (
    id serial PRIMARY KEY,
    mind_map_id integer NOT NULL REFERENCES mind_maps(id),
    user_id varchar NOT NULL REFERENCES users(id),
    permission varchar(20) NOT NULL DEFAULT 'edit',
    joined_at timestamp DEFAULT NOW()
);
```

## Alternative: Full Server Deployment

If you need full WebSocket support, consider:

1. **Railway** - Supports WebSocket servers
2. **Heroku** - Traditional deployment with WebSocket support
3. **DigitalOcean App Platform** - Good for Node.js applications
4. **Vercel** - Similar to Netlify but with better server support

## Current Features Working on Netlify
- ✅ Mind map creation and editing
- ✅ Template system with 8 professional layouts
- ✅ XML import/export for local files
- ✅ Cloud storage via Neon database
- ✅ Share codes for collaboration rooms
- ✅ Real-time collaboration via Pusher
- ✅ Live cursor tracking and user presence
- ✅ Collaborative editing with conflict resolution

## Production Architecture

1. **Frontend**: Netlify static hosting with CDN
2. **API**: Netlify serverless functions
3. **Database**: Neon PostgreSQL (serverless, auto-scaling)
4. **Real-time**: Pusher for WebSocket collaboration
5. **Auth**: Replit Auth for development, Auth0 for production

## Costs (Monthly)
- **Netlify**: Free tier for most apps, $19/month for pro features
- **Neon**: Free tier up to 3GB, $19/month for larger databases
- **Pusher**: Free tier for 200k messages/day, $49/month for higher usage
- **Total**: Can start completely free, scale to ~$100/month for large teams

This setup provides enterprise-grade scalability, reliability, and cost-effectiveness.