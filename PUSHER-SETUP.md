# Pusher Setup Guide for Real-time Collaboration

## Step 1: Create Pusher Account
1. Go to [pusher.com](https://pusher.com) and sign up for free
2. Click "Create app" on your dashboard
3. Choose:
   - **Name**: MindMapper (or your preferred name)
   - **Cluster**: Choose closest to your users (us2, eu, ap3, etc.)
   - **Tech stack**: Vanilla JS (frontend) + Node.js (backend)

## Step 2: Get Your App Credentials
After creating the app, you'll see these credentials in your Pusher dashboard:

### Required Environment Variables for Netlify:
```
PUSHER_APP_ID=123456
PUSHER_KEY=abcdef123456789
PUSHER_SECRET=secret_key_here
PUSHER_CLUSTER=us2
```

### Required Frontend Configuration:
Add these to your HTML or as Netlify environment variables:
```javascript
window.PUSHER_APP_KEY = 'abcdef123456789';  // Same as PUSHER_KEY
window.PUSHER_CLUSTER = 'us2';              // Same as PUSHER_CLUSTER
```

## Step 3: Where to Find These in Pusher Dashboard
1. **App ID**: Found on the "App Keys" tab of your app
2. **Key**: Found on the "App Keys" tab (this is your public key)
3. **Secret**: Found on the "App Keys" tab (keep this private!)
4. **Cluster**: Shown when you created the app (e.g., us2, eu, ap3)

## Step 4: Add to Netlify
1. In your Netlify site dashboard, go to **Site settings** → **Environment variables**
2. Add each variable:
   - `PUSHER_APP_ID` = your app ID
   - `PUSHER_KEY` = your key
   - `PUSHER_SECRET` = your secret
   - `PUSHER_CLUSTER` = your cluster

## Step 5: Frontend Configuration
You have two options:

### Option A: Environment Variables (Recommended)
In Netlify, also add:
- `PUSHER_APP_KEY` = same value as `PUSHER_KEY`
- `PUSHER_CLUSTER` = your cluster

### Option B: Direct Configuration
Add directly to your `index.html` before the closing `</head>` tag:
```html
<script>
  window.PUSHER_APP_KEY = 'your_actual_key_here';
  window.PUSHER_CLUSTER = 'your_cluster_here';
</script>
```

## Free Tier Limits
Pusher's free tier includes:
- 200,000 messages per day
- 100 concurrent connections
- Unlimited channels

This is perfect for testing and small teams!

## Example Configuration
If your Pusher app shows:
- App ID: `1234567`
- Key: `abc123def456`
- Secret: `secret789xyz`
- Cluster: `us2`

Then set these in Netlify:
```
PUSHER_APP_ID=1234567
PUSHER_KEY=abc123def456
PUSHER_SECRET=secret789xyz
PUSHER_CLUSTER=us2
```

And add to your frontend:
```javascript
window.PUSHER_APP_KEY = 'abc123def456';
window.PUSHER_CLUSTER = 'us2';
```

## Test Your Setup
After deployment, check the browser console. You should see:
- "Pusher: Connecting to wss://ws-us2.pusher.com..."
- "Connected to real-time collaboration"

If you see errors, double-check your keys and cluster settings.