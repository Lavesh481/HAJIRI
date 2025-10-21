# Docker Deployment Guide for Hajiri Attendance Bot

This guide will help you deploy the Hajiri WhatsApp Attendance Bot using Docker.

## Prerequisites

- Docker installed on your system ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed ([Install Docker Compose](https://docs.docker.com/compose/install/))

## Quick Start

### 1. Build and Run with Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs to see the QR code for WhatsApp authentication
docker-compose logs -f

# Scan the QR code with your WhatsApp to authenticate
```

### 2. Build and Run with Docker Commands

```bash
# Build the Docker image
docker build -t hajiri-bot .

# Run the container
docker run -d \
  --name hajiri-attendance-bot \
  --restart unless-stopped \
  -v $(pwd)/.wwebjs_auth:/app/.wwebjs_auth \
  -v $(pwd)/.wwebjs_cache:/app/.wwebjs_cache \
  -v $(pwd)/attendance.json:/app/attendance.json \
  hajiri-bot

# View logs to see the QR code
docker logs -f hajiri-attendance-bot
```

## Important Notes

### WhatsApp Authentication

1. When you first run the container, you'll need to scan a QR code
2. View the logs to see the QR code:
   ```bash
   docker-compose logs -f
   # or
   docker logs -f hajiri-attendance-bot
   ```
3. Scan the QR code with WhatsApp on your phone
4. The session will be saved in `.wwebjs_auth` folder and persisted

### Data Persistence

The following data is persisted using Docker volumes:
- **WhatsApp Session**: `.wwebjs_auth/` - Your WhatsApp login session
- **WhatsApp Cache**: `.wwebjs_cache/` - Browser cache data
- **Attendance Data**: `attendance.json` - All attendance records

## Useful Commands

### View Logs
```bash
# With docker-compose
docker-compose logs -f

# With docker
docker logs -f hajiri-attendance-bot
```

### Stop the Bot
```bash
# With docker-compose
docker-compose down

# With docker
docker stop hajiri-attendance-bot
```

### Restart the Bot
```bash
# With docker-compose
docker-compose restart

# With docker
docker restart hajiri-attendance-bot
```

### Remove Everything (Clean Start)
```bash
# Stop and remove containers
docker-compose down

# Remove session data (you'll need to scan QR again)
rm -rf .wwebjs_auth .wwebjs_cache

# Start fresh
docker-compose up -d
```

### Update the Bot
```bash
# Pull latest code changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Environment Variables

You can set environment variables in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - BOT_GROUP_ID=your_group_id_here@g.us
```

Or create a `.env` file in the project root:

```env
NODE_ENV=production
BOT_GROUP_ID=your_group_id_here@g.us
```

Then update `docker-compose.yml`:

```yaml
env_file:
  - .env
```

## Troubleshooting

### QR Code Not Showing
- Make sure the container is running: `docker ps`
- Check logs: `docker-compose logs -f`
- Try restarting: `docker-compose restart`

### WhatsApp Session Expired
- Remove session data: `rm -rf .wwebjs_auth .wwebjs_cache`
- Restart container: `docker-compose restart`
- Scan QR code again

### Container Keeps Restarting
- Check logs: `docker-compose logs`
- Verify Node.js dependencies are installed correctly
- Ensure no port conflicts

### Permission Issues
```bash
# Fix permissions for volume directories
sudo chown -R $USER:$USER .wwebjs_auth .wwebjs_cache attendance.json
```

## Production Deployment

### Deploy on a VPS/Cloud Server

1. **SSH into your server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Hajiri
   ```

3. **Start the bot**
   ```bash
   docker-compose up -d
   ```

4. **View logs and scan QR code**
   ```bash
   docker-compose logs -f
   ```

### Auto-start on Server Reboot

Docker Compose with `restart: unless-stopped` will automatically restart the container when the server reboots.

### Monitor the Bot

```bash
# Check if container is running
docker ps

# Check resource usage
docker stats hajiri-attendance-bot

# View recent logs
docker-compose logs --tail=100
```

## Security Best Practices

1. **Don't commit sensitive data**
   - `.wwebjs_auth/` is in `.dockerignore`
   - `attendance.json` is in `.dockerignore`

2. **Use environment variables** for sensitive configuration

3. **Keep Docker updated**
   ```bash
   docker --version
   docker-compose --version
   ```

4. **Regular backups**
   ```bash
   # Backup attendance data
   cp attendance.json attendance.backup.json
   
   # Backup WhatsApp session
   tar -czf wwebjs_auth_backup.tar.gz .wwebjs_auth
   ```

## Support

If you encounter any issues:
1. Check the logs: `docker-compose logs -f`
2. Verify Docker is running: `docker ps`
3. Ensure all volumes are properly mounted
4. Check the main README.md for bot-specific commands

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [WhatsApp Web.js Documentation](https://wwebjs.dev/)
