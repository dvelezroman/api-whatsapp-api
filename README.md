<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# WhatsApp API

A comprehensive WhatsApp API built with NestJS that provides messaging, contact management, group management, and webhook integration capabilities.

## 🚀 Features

### **Core Functionality**
- ✅ **WhatsApp Web Integration**: Connect to WhatsApp using QR code authentication
- ✅ **Session Persistence**: Maintains authentication across deployments
- ✅ **Message Sending**: Send messages to individuals, groups, and diffusion lists
- ✅ **Contact Management**: Save, validate, and retrieve contacts
- ✅ **Group Management**: Get groups, group contacts, and send group messages
- ✅ **Diffusion Groups**: Handle broadcast lists and diffusion messages
- ✅ **Webhook Integration**: Forward messages to external APIs
- ✅ **Auto-Contact Saving**: Automatically save unknown contacts

### **Advanced Features**
- ✅ **Health Monitoring**: Built-in health check endpoints
- ✅ **Comprehensive Logging**: Detailed logging for debugging
- ✅ **Error Handling**: Robust error handling with informative messages
- ✅ **Docker Support**: Full containerization with session persistence
- ✅ **Environment Configuration**: Easy setup via environment variables
- ✅ **API Documentation**: Complete Swagger documentation

## 📋 Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose (for deployment)
- WhatsApp account for authentication

## 🛠️ Installation

### **Local Development**

```bash
# Clone the repository
git clone <your-repo-url>
cd api-whatsapp-app

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env file with your configuration
nano .env

# Start development server
npm run start:dev
```

### **Docker Deployment**

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or use the deployment script
chmod +x deploy.sh
./deploy.sh
```

## ⚙️ Configuration

### **Environment Variables**

Create a `.env` file with the following variables:

```env
# Basic Configuration
NODE_ENV=development
PORT=3005

# Webhook Configuration (External API)
WEBHOOK_URL=https://your-external-api.com/webhook/whatsapp
WEBHOOK_API_KEY=your-api-key-here
WEBHOOK_TIMEOUT=10000
```

## 🔐 Authentication

### **First Time Setup**

1. Start the API server
2. Access the QR code endpoint: `GET /whatsapp/qrcode`
3. Scan the QR code with your WhatsApp mobile app
4. The session will be automatically saved and persisted

### **Session Persistence**

- Sessions are automatically saved in the `./whatsapp-session` directory
- Docker volumes ensure session persistence across container restarts
- No need to re-authenticate after deployment updates

## 📚 API Endpoints

### **Health & Status**
- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /api` - Swagger documentation

### **WhatsApp Authentication**
- `GET /whatsapp/qrcode` - Get QR code for authentication

### **Message Sending**
- `POST /whatsapp/send` - Send message to individual contact
- `POST /whatsapp/send-group` - Send message to group
- `POST /whatsapp/send-diffusion` - Send message to diffusion group

### **Contact Management**
- `POST /whatsapp/contacts` - Validate/save contact
- `POST /whatsapp/contact` - Get specific contact by name or ID

### **Group Management**
- `GET /whatsapp/groups` - Get all groups
- `POST /whatsapp/group-contacts` - Get contacts from group

### **Diffusion Groups**
- `GET /whatsapp/diffusion-groups` - Get all diffusion groups
- `POST /whatsapp/diffusion-contacts` - Get contacts from diffusion group

### **Webhook Management**
- `POST /whatsapp/webhook/configure` - Configure webhook URL
- `GET /whatsapp/webhook/config` - Get webhook configuration
- `DELETE /whatsapp/webhook/remove` - Remove webhook configuration
- `POST /whatsapp/webhook/test` - Test webhook with sample data

## 🔄 Webhook Integration

### **Message Flow**
```
WhatsApp Message → API → External Webhook → Response → WhatsApp Reply
```

### **Webhook Data Structure**
```json
{
  "messageId": "3EB0C767D82B0A78C4",
  "from": "1234567890@c.us",
  "sender": {
    "id": "1234567890@c.us",
    "phone": "1234567890",
    "pushname": "John Doe",
    "name": "John Doe",
    "isBusiness": false,
    "isVerified": false,
    "isRegisteredContact": true
  },
  "message": {
    "body": "Hello! How are you?",
    "type": "chat",
    "timestamp": 1640995200
  },
  "chat": {
    "id": "1234567890@c.us",
    "type": "individual"
  },
  "receivedAt": "2024-01-01T12:00:00.000Z"
}
```

### **Webhook Response**
```json
{
  "reply": "Thank you for your message! We'll get back to you soon."
}
```

## 🐳 Docker Deployment

### **Quick Start**
```bash
# Deploy to VPS
./deploy.sh
```

### **Manual Deployment**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f whatsapp-api

# Stop
docker-compose down
```

### **Session Persistence**
- WhatsApp sessions are preserved in `./whatsapp-session` directory
- Docker volumes ensure data persistence
- Automatic backups before deployments

## 🔧 Development

### **Available Scripts**
```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Testing
npm run test
npm run test:e2e

# Code quality
npm run lint
npm run format
```

### **Project Structure**
```
src/
├── modules/
│   ├── whatsapp/
│   │   ├── dtos/           # Data transfer objects
│   │   ├── whatsapp.controller.ts
│   │   ├── whatsapp.service.ts
│   │   └── whatsapp.module.ts
│   └── qr/
│       ├── qr.controller.ts
│       ├── qr.service.ts
│       └── qr.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
```

## 📖 Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Complete deployment instructions
- **[Webhook API Documentation](WEBHOOK_API_DOCS.md)** - External API integration guide
- **[API Documentation](http://localhost:3005/api)** - Interactive Swagger docs

## 🚨 Error Handling

### **Common Error Types**
- `CONTACT_NOT_FOUND` - Contact not in phone's contact list
- `GROUP_NOT_FOUND` - Group name/ID not found
- `SEND_FAILED` - Message sending failed
- `WEBHOOK_ERROR` - External webhook issues

### **Error Response Format**
```json
{
  "error": "ERROR_TYPE: Detailed error message with available options"
}
```

## 🔒 Security

### **Best Practices**
- Use HTTPS in production
- Implement API key authentication for webhooks
- Validate all incoming data
- Monitor logs for suspicious activity
- Regular security updates

### **Environment Security**
- Never commit `.env` files
- Use strong API keys
- Rotate credentials regularly
- Monitor access logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- Check the [documentation](DEPLOYMENT.md) for common issues
- Review [webhook documentation](WEBHOOK_API_DOCS.md) for integration help
- Open an issue for bugs or feature requests

## 🔄 Changelog

### **Latest Features**
- ✅ Auto-contact saving for unknown contacts
- ✅ Webhook integration with environment variables
- ✅ Comprehensive group and diffusion group management
- ✅ Enhanced error handling and logging
- ✅ Docker deployment with session persistence
- ✅ Health monitoring and API documentation

---

**Built with ❤️ using NestJS**
