import { Controller, Post, Body, Get } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('qrcode')
  @ApiOperation({ summary: 'Get QR Code for WhatsApp Web login' })
  @ApiResponse({
    status: 200,
    description: 'Returns QR code image as Base64 or URL.',
  })
  async getQRCode() {
    return this.whatsappService.getQRCode();
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendMessage(
    @Body('phone') phone: string,
    @Body('message') message: string,
  ) {
    return this.whatsappService.sendMessage(phone, message);
  }
}
