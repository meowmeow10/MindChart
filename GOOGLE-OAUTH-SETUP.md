# Google OAuth Setup for Netlify Deployment

## Step 1: Find Your Netlify Domain
Your Netlify site URL should look like: `https://amazing-site-123456.netlify.app`

## Step 2: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Sign in with your Google account

2. **Create or Select Project**
   - Click "Select a project" → "New Project"
   - Name: "MindMapper" (or your choice)
   - Click "Create"

3. **Enable APIs**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
   - Also enable "People API" (recommended)

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - If prompted, configure OAuth consent screen first:
     - Choose "External" user type
     - Fill in app name: "MindMapper"
     - Add your email as developer contact
     - Save and continue through all steps

5. **Configure OAuth Client**
   - Application type: "Web application"
   - Name: "MindMapper Web Client"
   - **Authorized JavaScript origins**:
     ```
     https://your-actual-netlify-domain.netlify.app
     ```
   - **Authorized redirect URIs**:
     ```
     https://your-actual-netlify-domain.netlify.app/api/auth/google/callback
     ```

## Step 3: Get Your Credentials
After creating, you'll see:
- **Client ID**: `123456789-abcdef.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-your_secret_here`

## Step 4: Add to Netlify Environment Variables
In your Netlify site settings → Environment variables:
```
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
URL=https://your-actual-netlify-domain.netlify.app
```

## Common Issues & Solutions

### "redirect_uri_mismatch" Error
- **Cause**: The redirect URI doesn't match exactly
- **Solution**: 
  1. Check your Netlify domain is correct
  2. Ensure you're using `https://` not `http://`
  3. Make sure there's no trailing slash
  4. Verify the callback path is exactly `/api/auth/google/callback`

### "Access blocked" Error
- **Cause**: OAuth consent screen not properly configured
- **Solution**:
  1. Go back to OAuth consent screen
  2. Add test users (your email)
  3. Or publish the app (for production)

### "Invalid client" Error
- **Cause**: Wrong client ID or secret
- **Solution**: Double-check the credentials in Netlify match Google Console

## Testing
1. Deploy your site to Netlify
2. Click the Login button
3. You should be redirected to Google sign-in
4. After authentication, you'll return to your app logged in

## Example Configuration
If your Netlify site is: `https://mindmapper-demo.netlify.app`

Then configure:
- **JavaScript origins**: `https://mindmapper-demo.netlify.app`
- **Redirect URIs**: `https://mindmapper-demo.netlify.app/api/auth/google/callback`
- **Netlify ENV**: `URL=https://mindmapper-demo.netlify.app`