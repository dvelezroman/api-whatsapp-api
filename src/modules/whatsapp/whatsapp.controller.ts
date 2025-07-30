import { Controller, Post, Body, Get } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendDto } from './dtos/send.dto';

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
  @ApiBody({ type: SendDto })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendMessage(@Body() body: SendDto) {
    const { phone, message } = body;
    return this.whatsappService.sendMessage(phone, message);
  }
}
