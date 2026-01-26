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
- **API Documentation**: `http://your-vps-ip:3005/docs`
- **Public Endpoints** (no authentication required):
  - `GET /` - Welcome message
  - `GET /health` - Health check
  - `GET /qr` - QR code page
  - `GET /docs` - API documentation
- **Protected Endpoints** (require `Authorization: Bearer <API_TOKEN>`):
  - `GET /whatsapp/qrcode` - Get QR code for authentication
  - `POST /whatsapp/send` - Send message
  - `POST /whatsapp/contacts` - Save contact
  - `GET /whatsapp/groups` - Get groups
  - `GET /whatsapp/diffusion-groups` - Get diffusion groups
  - All other `/whatsapp/*` endpoints

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
3. **API Authentication**: The API uses Bearer token authentication. Always set a strong `API_TOKEN` in your `.env` file
4. **Token Security**: 
   - Use a strong, randomly generated token
   - Never commit the `.env` file to version control
   - Rotate tokens periodically
   - Keep tokens secure and limit access
5. **Session Backup**: Regularly backup the `whatsapp-session` directory

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
API_TOKEN=your-secret-api-token-here
```

### Required Variables

- **API_TOKEN** (Required): Secret token for server-to-server authentication. All API endpoints (except `/`, `/health`, `/qr`, and `/docs`) require this token in the `Authorization: Bearer <token>` header.

### Setting API_TOKEN

You can set the API_TOKEN in two ways:

1. **Using .env file** (Recommended):
   ```bash
   echo "API_TOKEN=your-secret-token-here" >> .env
   ```

2. **Exporting before deployment**:
   ```bash
   export API_TOKEN=your-secret-token-here
   ./deploy.sh
   ```

**Important**: Without `API_TOKEN`, the API will not be protected and all endpoints will be accessible without authentication.

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
