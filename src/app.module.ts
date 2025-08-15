import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { WhatsAppController } from './modules/whatsapp/whatsapp.controller';
import { WhatsAppService } from './modules/whatsapp/whatsapp.service';
import { QrModule } from './modules/qr/qr.module';
import { QRController } from './modules/qr/qr.controller';
import { QrService } from './modules/qr/qr.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WhatsAppModule,
    QrModule,
  ],
  controllers: [AppController, WhatsAppController, QRController],
  providers: [AppService, WhatsAppService, QrService],
})
export class AppModule {}
