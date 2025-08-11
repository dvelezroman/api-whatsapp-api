import { Controller, Post, Body, Get } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendDto } from './dtos/send.dto';
import { SaveContactDto } from './dtos/save-contact.dto';
import { GroupsResponseDto } from './dtos/group.dto';
import { DiffusionGroupsResponseDto } from './dtos/diffusion-group.dto';

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

  @Post('contacts')
  @ApiOperation({ summary: 'Save a new WhatsApp contact' })
  @ApiBody({ type: SaveContactDto })
  @ApiResponse({ status: 201, description: 'Contact saved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async saveContact(@Body() body: SaveContactDto) {
    const { phone, name, description } = body;
    return this.whatsappService.saveContact(phone, name, description);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all WhatsApp groups' })
  @ApiResponse({
    status: 200,
    description: 'Groups retrieved successfully',
    type: GroupsResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllGroups() {
    return this.whatsappService.getAllGroups();
  }

  @Get('diffusion-groups')
  @ApiOperation({
    summary: 'Get all WhatsApp diffusion groups (broadcast lists)',
  })
  @ApiResponse({
    status: 200,
    description: 'Diffusion groups retrieved successfully',
    type: DiffusionGroupsResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllDiffusionGroups() {
    return this.whatsappService.getAllDiffusionGroups();
  }
}
