import { Controller, Post, Body, Get } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('qrcode')
  async getQRCode() {
    return this.whatsappService.getQRCode();
  }

  @Post('send')
  async sendMessage(
    @Body('phone') phone: string,
    @Body('message') message: string,
  ) {
    return this.whatsappService.sendMessage(phone, message);
  }
}
