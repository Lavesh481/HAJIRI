# Quick Start - Docker Deployment

## 🚀 Deploy in 3 Steps

### Step 1: Build and Start
```bash
docker-compose up -d
```

### Step 2: View Logs & Scan QR Code
```bash
docker-compose logs -f
```
Scan the QR code with WhatsApp on your phone.

### Step 3: Done! ✅
Your bot is now running in the background.

---

## 📋 Common Commands

| Action | Command |
|--------|---------|
| **Start bot** | `docker-compose up -d` |
| **Stop bot** | `docker-compose down` |
| **View logs** | `docker-compose logs -f` |
| **Restart bot** | `docker-compose restart` |
| **Update & rebuild** | `docker-compose up -d --build` |
| **Check status** | `docker ps` |

---

## 🔧 Troubleshooting

**QR Code not showing?**
```bash
docker-compose restart
docker-compose logs -f
```

**Need to re-authenticate?**
```bash
docker-compose down
rm -rf .wwebjs_auth .wwebjs_cache
docker-compose up -d
docker-compose logs -f
```

**Check if running:**
```bash
docker ps | grep hajiri
```

---

## 📖 Full Documentation

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for complete documentation.
