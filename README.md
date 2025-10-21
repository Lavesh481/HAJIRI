# WhatsApp Attendance Bot

A powerful WhatsApp bot for teachers to manage student attendance with individual tracking and notifications.

## Features

- 📚 Multi-teacher support
- 👥 Student management
- ✅ Individual attendance marking
- 📊 Attendance reports
- 📱 Automatic student notifications
- 🔒 Teacher-only access control

## Quick Start

1. Clone this repository
2. Install dependencies: `npm install`
3. Run the bot: `npm start`
4. Scan QR code with WhatsApp
5. Start using the bot!

## Commands

- `/start` - Main menu
- `/register` - Register as teacher
- `/myattendance` - Check your attendance (students)

## Deployment

### 🐳 Docker Deployment (Recommended)

**Quick Start:**
```bash
docker-compose up -d
docker-compose logs -f  # Scan the QR code
```

See [QUICK_START_DOCKER.md](./QUICK_START_DOCKER.md) for quick reference or [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for complete documentation.

### Other Deployment Options

This bot can also be deployed on:
- Heroku
- Railway
- VPS/Cloud servers
- Local machine

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Requirements

- Node.js 16+
- WhatsApp account
- Internet connection
# HAJIRI
