# 🚀 Railway Deployment Guide

## ✅ Fixed Issues
- Added Express server for health checks
- Configured Puppeteer for Railway environment
- Added proper error handling

## 📋 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Add health check endpoint for Railway"
git push origin main
```

### 2. Deploy on Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your Hajiri repository
5. Railway will auto-detect Node.js and deploy

### 3. Monitor Deployment
- Check Railway logs for QR code
- Scan QR code with WhatsApp
- Bot will be ready in 1-2 minutes

## 🔧 Configuration

### Environment Variables (Optional)
In Railway dashboard, you can add:
```
NODE_ENV=production
```

### Health Check
- Endpoint: `https://your-app.railway.app/`
- Returns: JSON with status, uptime, timestamp
- Railway will use this to monitor your bot

## 📱 Usage After Deployment

### For Teachers:
1. Use WhatsApp normally on your phone
2. Add bot to your class group
3. Send commands: `/start`, `1`, `2a`, etc.
4. Bot responds in the group

### For Students:
1. Use normal WhatsApp on their phones
2. Receive attendance notifications automatically
3. Send `/myattendance` to check attendance

## 🎯 Benefits
- ✅ 24/7 operation
- ✅ Mobile access
- ✅ Auto-restart on failure
- ✅ Easy updates via GitHub
- ✅ Professional deployment

## 🆘 Troubleshooting

### If deployment fails:
1. Check Railway logs for errors
2. Ensure all dependencies are in package.json
3. Verify Node.js version compatibility

### If bot doesn't respond:
1. Check if QR code was scanned
2. Verify group ID in logs
3. Ensure bot is added to the correct group

## 📞 Support
- Railway logs show real-time status
- Bot logs show WhatsApp connection status
- Health endpoint shows uptime and status