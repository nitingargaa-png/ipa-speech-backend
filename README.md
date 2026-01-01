# IPA Mastery - Speech Token Server (Railway)

## Quick Deploy to Railway

### Option A: Deploy via GitHub

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo
5. Add environment variables (see below)
6. Deploy!

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Add environment variables
railway variables set AZURE_SPEECH_KEY=your-key-here
railway variables set AZURE_SPEECH_REGION=eastus
railway variables set PRODUCTION_ORIGIN=https://your-frontend.com
```

## Environment Variables

Set these in Railway dashboard → Variables:

| Variable | Value |
|----------|-------|
| `AZURE_SPEECH_KEY` | Your Azure Speech KEY 1 |
| `AZURE_SPEECH_REGION` | `eastus` |
| `PRODUCTION_ORIGIN` | Your frontend URL |

## After Deployment

1. Copy your Railway URL (e.g., `https://ipa-mastery-backend-production.up.railway.app`)
2. Update your frontend:

```javascript
configureSpeechService({ 
  tokenEndpoint: 'https://your-app.up.railway.app/api/speech-token' 
})
```

## Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health check
- `POST /api/speech-token` - Get speech token
