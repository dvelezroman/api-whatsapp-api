import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('WhatsApp API')
    .setDescription(
      `
      A comprehensive API for managing WhatsApp messaging using whatsapp-web.js.
      
      ## Features
      - Send messages to individual contacts
      - Send messages to groups and broadcast lists
      - Manage contacts and groups
      - Webhook integration for incoming messages
      - QR code authentication
      
      ## Authentication
      This API uses WhatsApp Web authentication. You need to scan a QR code to connect your WhatsApp account.
      
      ## Webhook Integration
      Configure webhooks to receive and process incoming messages from unknown contacts automatically.
    `,
    )
    .setVersion('1.0.0')
    .addTag('WhatsApp', 'Core WhatsApp messaging functionality')
    .addTag('Qr', 'QR code authentication endpoints')
    .addServer('http://localhost:3005', 'Development server')
    .addServer('https://your-domain.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // available at /docs

  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
