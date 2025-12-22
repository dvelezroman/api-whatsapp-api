# WhatsApp API Deployment Guide

This guide explains how to deploy the WhatsApp API to your VPS while maintaining the WhatsApp session across deployments.

## Prerequisites

- Docker and Docker Compose installed on your VPS
- Git access to the repository
- Port 3005 available on your VPS

## Session Persistence

The WhatsApp session is automatically preserved through Docker volumes. The `docker-compose.yml` file includes:

```yaml
volumes:
  - ./whatsapp-session:/app/whatsapp-session
```

This maps the local `whatsapp-session` directory to the container, ensuring your WhatsApp authentication persists across container restarts and updates.

## Deployment Steps

### 1. Initial Setup (First Time Only)

```bash
# Clone the repository
git clone <your-repo-url>
cd api-whatsapp-app

# Make deployment script executable
chmod +x deploy.sh

# Create WhatsApp session directory
mkdir -p whatsapp-session
```

### 2. Deploy/Update the API

```bash
# Run the deployment script
./deploy.sh
```

The deployment script will:
- ✅ Backup existing session (if any)
- ✅ Stop current container
- ✅ Pull latest code changes
- ✅ Build new Docker image
- ✅ Start container with session preserved
- ✅ Verify deployment success

### 3. First Time Setup - QR Code Authentication

After the first deployment, you'll need to authenticate WhatsApp:

```bash
# Check logs for QR code
docker-compose logs -f whatsapp-api
```

Look for the QR code in the logs and scan it with your phone. Once authenticated, the session will be saved and persist across future deployments.

## Manual Commands

### View Logs
```bash
# View all logs
docker-compose logs -f

# View only WhatsApp API logs
docker-compose logs -f whatsapp-api
```

### Restart Container
```bash
docker-compose restart
```

### Stop Container
```bash
docker-compose down
```

### Start Container
```bash
docker-compose up -d
```

### Rebuild and Deploy
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## API Endpoints

Once deployed, the API will be available at:

- **Base URL**: `http://your-vps-ip:3005`
- **API Documentation**: `http://your-vps-ip:3005/api`
- **QR Code**: `GET /whatsapp/qrcode`
- **Send Message**: `POST /whatsapp/send`
- **Save Contact**: `POST /whatsapp/contacts`
- **Get Groups**: `GET /whatsapp/groups`
- **Get Diffusion Groups**: `GET /whatsapp/diffusion-groups`

## Troubleshooting

### Session Lost
If you lose your WhatsApp session:

1. Check if the `whatsapp-session` directory exists and has content
2. Restart the container: `docker-compose restart`
3. Check logs for QR code: `docker-compose logs -f whatsapp-api`
4. Scan the QR code again

### Container Won't Start
```bash
# Check container status
docker-compose ps

# Check logs for errors
docker-compose logs whatsapp-api

# Check if port 3005 is available
netstat -tulpn | grep 3005
```

### Permission Issues
```bash
# Fix session directory permissions
sudo chown -R $USER:$USER whatsapp-session
chmod -R 755 whatsapp-session
```

### Update Failed
```bash
# Clean up and retry
docker-compose down
docker system prune -f
./deploy.sh
```

## Security Considerations

1. **Firewall**: Ensure only necessary ports are open
2. **HTTPS**: Consider using a reverse proxy with SSL
3. **Authentication**: Add API authentication if needed
4. **Session Backup**: Regularly backup the `whatsapp-session` directory

## Backup and Restore

### Backup Session
```bash
# Create backup
cp -r whatsapp-session whatsapp-session-backup-$(date +%Y%m%d-%H%M%S)
```

### Restore Session
```bash
# Stop container
docker-compose down

# Restore from backup
cp -r whatsapp-session-backup-YYYYMMDD-HHMMSS whatsapp-session

# Start container
docker-compose up -d
```

## Environment Variables

You can customize the deployment by creating a `.env` file:

```env
NODE_ENV=production
PORT=3005
```

## Monitoring

Monitor your deployment with:

```bash
# Check container health
docker-compose ps

# Monitor resource usage
docker stats

# Check API health
curl http://localhost:3005/health
```
