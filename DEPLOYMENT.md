# WhatsApp API Deployment Guide

This guide explains how to deploy the WhatsApp API to your VPS while maintaining the WhatsApp session across deployments.

## Prerequisites

- **VPS Requirements:**
  - Ubuntu 20.04+ or Debian 11+ (recommended)
  - Minimum 2GB RAM (4GB recommended)
  - Minimum 10GB free disk space
  - Root or sudo access
- **Software Requirements:**
  - Docker Engine 20.10+
  - Docker Compose v2.0+ (plugin version)
  - Git
  - Port 3005 available and open in firewall

## Initial VPS Setup

### 1. Install Docker and Docker Compose

```bash
# Update system packages
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

### 2. Configure Firewall (if using UFW)

```bash
# Allow port 3005
sudo ufw allow 3005/tcp

# If using SSH, make sure it's allowed
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

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
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to your preferred directory (e.g., /opt or ~)
cd /opt  # or cd ~

# Clone the repository
git clone <your-repo-url>
cd api-whatsapp-app

# Make deployment script executable
chmod +x deploy.sh

# Create WhatsApp session directory with proper permissions
mkdir -p whatsapp-session
chmod 755 whatsapp-session
```

### 2. Deploy the API

**Option A: Using the deployment script (Recommended)**

```bash
# Run the deployment script
./deploy.sh
```

The deployment script will:
- ✅ Backup existing session (if any)
- ✅ Stop current container
- ✅ Pull latest code changes (if using git)
- ✅ Build new Docker image
- ✅ Start container with session preserved
- ✅ Verify deployment success

**Option B: Manual deployment**

```bash
# Stop any existing containers
docker compose down

# Build the Docker image
docker compose build --no-cache

# Start the container
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f whatsapp-api
```

### 3. First Time Setup - QR Code Authentication

After the first deployment, you'll need to authenticate WhatsApp:

```bash
# Check logs for QR code (follow logs in real-time)
docker compose logs -f whatsapp-api
```

**Alternative: Get QR code via API**

```bash
# Get QR code as base64 image
curl http://localhost:3005/whatsapp/qrcode

# Or access via browser
# http://your-vps-ip:3005/whatsapp/qrcode
```

Look for the QR code in the logs or API response and scan it with your phone. Once authenticated, the session will be saved and persist across future deployments.

**Note:** The QR code expires after a few minutes. If it expires, restart the container:
```bash
docker compose restart
```

## Manual Commands

### View Logs
```bash
# View all logs (follow mode)
docker compose logs -f

# View only WhatsApp API logs
docker compose logs -f whatsapp-api

# View last 100 lines
docker compose logs --tail=100 whatsapp-api

# View logs since last 10 minutes
docker compose logs --since 10m whatsapp-api
```

### Container Management
```bash
# Check container status
docker compose ps

# Restart container
docker compose restart

# Stop container
docker compose down

# Start container
docker compose up -d

# Rebuild and Deploy
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Resource Monitoring
```bash
# Monitor container resource usage
docker stats whatsapp-api

# Check container health
docker inspect whatsapp-api | grep -A 10 Health

# Check disk usage
docker system df
```

## API Endpoints

Once deployed, the API will be available at:

- **Base URL**: `http://your-vps-ip:3005`
- **API Documentation (Swagger)**: `http://your-vps-ip:3005/docs`
- **Health Check**: `GET http://your-vps-ip:3005/health`

**Main Endpoints:**
- **QR Code**: `GET /whatsapp/qrcode`
- **Client Status**: `GET /whatsapp/status`
- **Send Message**: `POST /whatsapp/send`
- **Save Contact**: `POST /whatsapp/contacts`
- **Get Groups**: `GET /whatsapp/groups`
- **Get Diffusion Groups**: `GET /whatsapp/diffusion-groups`
- **Get Contacts**: `GET /whatsapp/contacts`
- **Restart Client**: `POST /whatsapp/restart`

**Example: Test the API**
```bash
# Check if API is running
curl http://your-vps-ip:3005/health

# Get client status
curl http://your-vps-ip:3005/whatsapp/status

# Get QR code (if not authenticated)
curl http://your-vps-ip:3005/whatsapp/qrcode
```

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
docker compose ps

# Check logs for errors
docker compose logs whatsapp-api

# Check if port 3005 is available
sudo netstat -tulpn | grep 3005
# or
sudo ss -tulpn | grep 3005

# Check if another process is using the port
sudo lsof -i :3005

# Check Docker system status
docker system df
docker system events
```

### Container Crashes on Startup
```bash
# Check for Chromium lock files
ls -la whatsapp-session/

# Clean up lock files manually
rm -rf whatsapp-session/SingletonLock
rm -rf whatsapp-session/Default/SingletonLock
rm -rf whatsapp-session/*/SingletonLock

# Check memory usage
free -h
docker stats

# Increase shared memory if needed (edit docker-compose.yml)
# shm_size: '2gb'  # Already configured
```

### Out of Memory Issues
```bash
# Check memory usage
free -h
docker stats

# If memory is low, you can reduce limits in docker-compose.yml:
# mem_limit: 1.5g
# mem_reservation: 512m
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
docker compose ps

# Monitor resource usage
docker stats whatsapp-api

# Check API health
curl http://localhost:3005/health

# Check container logs
docker compose logs --tail=50 whatsapp-api

# Monitor system resources
htop  # or top
df -h  # disk usage
```

## Updating the Application

### Update from Git Repository

```bash
# Navigate to project directory
cd /opt/api-whatsapp-app  # or wherever you cloned it

# Pull latest changes
git pull origin main  # or master

# Run deployment script
./deploy.sh
```

### Manual Update

```bash
# Stop container
docker compose down

# Pull latest code (if using git)
git pull

# Rebuild image
docker compose build --no-cache

# Start container
docker compose up -d

# Verify
docker compose ps
docker compose logs -f whatsapp-api
```

## Production Recommendations

### 1. Use a Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/whatsapp-api`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Set Up SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Set Up Automatic Backups

Create a cron job for session backups:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /opt/api-whatsapp-app && cp -r whatsapp-session whatsapp-session-backup-$(date +\%Y\%m\%d) && find . -name "whatsapp-session-backup-*" -mtime +7 -exec rm -rf {} \;
```

### 4. Set Up Log Rotation

Create `/etc/logrotate.d/whatsapp-api`:

```
/opt/api-whatsapp-app/whatsapp-session/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    missingok
}
```
