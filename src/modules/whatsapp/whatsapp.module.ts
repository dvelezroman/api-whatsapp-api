import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { SpamProtectionService } from './spam-protection.service';

@Module({
  providers: [WhatsAppService, SpamProtectionService],
  exports: [WhatsAppService, SpamProtectionService],
})
export class WhatsAppModule {}
