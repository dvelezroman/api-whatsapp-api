# WhatsApp API - Quick Start Guide

Get your WhatsApp API up and running in minutes!

## 🚀 Quick Setup (5 minutes)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd api-whatsapp-app
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
```

Edit `.env` file:
```env
NODE_ENV=development
PORT=3005
WEBHOOK_URL=https://your-external-api.com/webhook/whatsapp
WEBHOOK_API_KEY=your-api-key-here
WEBHOOK_TIMEOUT=10000
```

### 3. Start the API
```bash
npm run start:dev
```

### 4. Authenticate WhatsApp
```bash
curl http://localhost:3005/whatsapp/qrcode
```

Scan the QR code with your WhatsApp mobile app.

### 5. Test the API
```bash
# Health check
curl http://localhost:3005/health

# Send a test message
curl -X POST http://localhost:3005/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "message": "Hello from API!"
  }'
```

## 🐳 Docker Quick Start

### 1. Deploy with Docker
```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy
./deploy.sh
```

### 2. Check Status
```bash
# View logs
docker-compose logs -f whatsapp-api

# Check health
curl http://localhost:3005/health
```

## 📱 First Steps

### 1. Get Your Groups
```bash
curl http://localhost:3005/whatsapp/groups
```

### 2. Send Group Message
```bash
curl -X POST http://localhost:3005/whatsapp/send-group \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "Your Group Name",
    "message": "Hello from API!"
  }'
```

### 3. Configure Webhook (Optional)
```bash
curl -X POST http://localhost:3005/whatsapp/webhook/configure \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-api.com/webhook",
    "apiKey": "your-secret-key"
  }'
```

## 🔧 Common Commands

### Development
```bash
# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Docker
```bash
# Start containers
docker-compose up -d

# View logs
docker-compose logs -f whatsapp-api

# Stop containers
docker-compose down

# Restart
docker-compose restart
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test
```

## 📚 Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/whatsapp/qrcode` | GET | Get QR code |
| `/whatsapp/send` | POST | Send message |
| `/whatsapp/groups` | GET | Get all groups |
| `/whatsapp/send-group` | POST | Send group message |
| `/whatsapp/webhook/configure` | POST | Configure webhook |

## 🚨 Troubleshooting

### QR Code Issues
```bash
# Check if WhatsApp is ready
curl http://localhost:3005/health

# Get QR code
curl http://localhost:3005/whatsapp/qrcode

# Check logs
docker-compose logs whatsapp-api | grep -i "qr\|ready"
```

### Permission Issues
```bash
# Fix session permissions
./fix-permissions.sh
```

### Webhook Issues
```bash
# Test webhook
curl -X POST http://localhost:3005/whatsapp/webhook/test

# Check webhook config
curl http://localhost:3005/whatsapp/webhook/config
```

### Contact Issues
```bash
# Validate contact
curl -X POST http://localhost:3005/whatsapp/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "description": "Test contact"
  }'
```

## 📖 Next Steps

1. **Read the full documentation**: [API Documentation](API_DOCUMENTATION.md)
2. **Set up webhook integration**: [Webhook Guide](WEBHOOK_API_DOCS.md)
3. **Deploy to production**: [Deployment Guide](DEPLOYMENT.md)
4. **Explore all endpoints**: Visit `http://localhost:3005/api`

## 🆘 Need Help?

- Check the [full documentation](README.md)
- Review [error handling](API_DOCUMENTATION.md#error-handling)
- Check [deployment guide](DEPLOYMENT.md) for VPS setup
- Open an issue for bugs or questions

---

**You're all set! 🎉 Your WhatsApp API is ready to use.**
