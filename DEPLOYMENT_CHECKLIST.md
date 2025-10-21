# 🚀 Docker Deployment Checklist

## Pre-Deployment Checklist

### ✅ Prerequisites
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)
- [ ] Project files cloned/downloaded
- [ ] WhatsApp account ready for scanning QR code

### ✅ Files Verified
- [ ] `Dockerfile` exists
- [ ] `docker-compose.yml` exists
- [ ] `.dockerignore` exists
- [ ] `.env.docker` exists
- [ ] `package.json` exists
- [ ] `index.js` exists

## Deployment Steps

### Step 1: Prepare Environment
```bash
# Navigate to project directory
cd /home/lavesh/Hajiri

# Optional: Review environment variables
cat .env.docker
```

### Step 2: Build and Start
```bash
# Build and start the container
docker-compose up -d
```

**Expected Output:**
```
Creating network "hajiri_default" with the default driver
Building hajiri-bot
...
Creating hajiri-attendance-bot ... done
```

### Step 3: View Logs
```bash
# View logs to see QR code
docker-compose logs -f
```

**What to Look For:**
- QR code displayed in terminal
- "Loading session..." or "Authenticated" message
- No error messages

### Step 4: Authenticate
- [ ] QR code visible in logs
- [ ] Scanned QR code with WhatsApp
- [ ] Received "Authenticated" message
- [ ] Bot shows as online in WhatsApp

### Step 5: Verify Running
```bash
# Check container status
docker ps | grep hajiri

# Should show: hajiri-attendance-bot with status "Up"
```

### Step 6: Test Bot
- [ ] Send `/start` in WhatsApp group
- [ ] Bot responds with menu
- [ ] Commands work correctly

## Post-Deployment Verification

### ✅ Container Health
```bash
# Check if container is running
docker ps

# Check resource usage
docker stats hajiri-attendance-bot

# Check logs for errors
docker-compose logs --tail=50
```

### ✅ Data Persistence
```bash
# Verify session data exists
ls -la .wwebjs_auth/

# Verify attendance data
cat attendance.json
```

### ✅ Auto-Restart Test
```bash
# Restart container
docker-compose restart

# Verify it comes back up
docker ps | grep hajiri

# Check logs - should not require QR scan again
docker-compose logs -f
```

## Troubleshooting Checklist

### Container Won't Start
- [ ] Check Docker is running: `docker ps`
- [ ] Check logs: `docker-compose logs`
- [ ] Verify Dockerfile syntax
- [ ] Check port conflicts
- [ ] Ensure sufficient disk space

### QR Code Not Showing
- [ ] Container is running: `docker ps`
- [ ] Check logs: `docker-compose logs -f`
- [ ] Wait 30-60 seconds for initialization
- [ ] Restart: `docker-compose restart`

### Authentication Fails
- [ ] QR code is fresh (regenerates every ~20 seconds)
- [ ] WhatsApp app is up to date
- [ ] Internet connection is stable
- [ ] Try removing session: `rm -rf .wwebjs_auth .wwebjs_cache`

### Bot Not Responding
- [ ] Container is running: `docker ps`
- [ ] Check logs for errors: `docker-compose logs`
- [ ] Verify WhatsApp session is active
- [ ] Check attendance.json permissions
- [ ] Restart bot: `docker-compose restart`

## Production Deployment Checklist

### Server Setup
- [ ] Server has Docker installed
- [ ] Server has Docker Compose installed
- [ ] Firewall configured (if needed)
- [ ] SSH access configured
- [ ] Sufficient resources (RAM, CPU, Disk)

### Security
- [ ] Running as non-root user (configured in Dockerfile)
- [ ] Environment variables secured
- [ ] `.wwebjs_auth` not in git
- [ ] `attendance.json` backed up
- [ ] Server firewall configured

### Monitoring
- [ ] Set up log monitoring
- [ ] Configure alerts for container crashes
- [ ] Set up backup schedule for attendance data
- [ ] Document restart procedures

### Backup Strategy
```bash
# Backup attendance data
cp attendance.json attendance.backup.$(date +%Y%m%d).json

# Backup WhatsApp session
tar -czf wwebjs_auth_backup.$(date +%Y%m%d).tar.gz .wwebjs_auth

# Backup to remote location (optional)
# scp attendance.json user@backup-server:/backups/
```

## Maintenance Checklist

### Daily
- [ ] Check container status: `docker ps`
- [ ] Review logs for errors: `docker-compose logs --tail=100`

### Weekly
- [ ] Backup attendance data
- [ ] Check disk space: `df -h`
- [ ] Review resource usage: `docker stats`

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Rebuild image: `docker-compose up -d --build`
- [ ] Test backup restoration
- [ ] Review and clean old logs

## Quick Commands Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# Logs
docker-compose logs -f

# Status
docker ps

# Rebuild
docker-compose up -d --build

# Clean restart
docker-compose down
rm -rf .wwebjs_auth .wwebjs_cache
docker-compose up -d
```

## Success Criteria

✅ **Deployment is successful when:**
1. Container shows "Up" status in `docker ps`
2. QR code appears in logs
3. WhatsApp authentication completes
4. Bot responds to `/start` command
5. Attendance tracking works
6. Container survives restart without re-authentication
7. Data persists across restarts

---

**Need help?** See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed documentation.
