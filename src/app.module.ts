import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { WhatsAppController } from './modules/whatsapp/whatsapp.controller';
import { WhatsAppService } from './modules/whatsapp/whatsapp.service';

@Module({
  imports: [WhatsAppModule],
  controllers: [AppController, WhatsAppController],
  providers: [AppService, WhatsAppService],
})
export class AppModule {}
