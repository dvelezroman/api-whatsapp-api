import { Controller, Post, Body, Get } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendDto } from './dtos/send.dto';
import { SaveContactDto } from './dtos/save-contact.dto';
import { GroupsResponseDto } from './dtos/group.dto';
import { DiffusionGroupsResponseDto } from './dtos/diffusion-group.dto';
import { SendGroupMessageDto } from './dtos/send-group-message.dto';
import { SendDiffusionMessageDto } from './dtos/send-diffusion-message.dto';
import { GetGroupContactsDto } from './dtos/get-group-contacts.dto';
import { GetDiffusionContactsDto } from './dtos/get-diffusion-contacts.dto';
import { GetContactDto } from './dtos/get-contact.dto';
import {
  GroupContactsResponseDto,
  DiffusionContactsResponseDto,
  ContactResponseDto,
} from './dtos/contact.dto';

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
  @ApiOperation({
    summary:
      'Validate a WhatsApp contact (must be manually created in your phone first)',
    description:
      "Validates that a contact exists and was manually created in your phone's contact list. Does not create new contacts.",
  })
  @ApiBody({ type: SaveContactDto })
  @ApiResponse({ status: 201, description: 'Contact validated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid phone number',
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found or not manually created',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async saveContact(@Body() body: SaveContactDto) {
    const { phone, description } = body;
    return this.whatsappService.saveContact(phone, undefined, description);
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

  @Post('send-group')
  @ApiOperation({ summary: 'Send a message to a WhatsApp group' })
  @ApiBody({ type: SendGroupMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent to group successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid group name or message',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendMessageToGroup(@Body() body: SendGroupMessageDto) {
    const { groupName, message, searchById } = body;
    return this.whatsappService.sendMessageToGroup(
      groupName,
      message,
      searchById,
    );
  }

  @Post('send-diffusion')
  @ApiOperation({
    summary: 'Send a message to a WhatsApp diffusion group (broadcast list)',
  })
  @ApiBody({ type: SendDiffusionMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent to diffusion group successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid diffusion name or message',
  })
  @ApiResponse({ status: 404, description: 'Diffusion group not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendMessageToDiffusion(@Body() body: SendDiffusionMessageDto) {
    const { diffusionName, message, searchById } = body;
    return this.whatsappService.sendMessageToDiffusion(
      diffusionName,
      message,
      searchById,
    );
  }

  @Post('group-contacts')
  @ApiOperation({ summary: 'Get all contacts from a WhatsApp group' })
  @ApiBody({ type: GetGroupContactsDto })
  @ApiResponse({
    status: 200,
    description: 'Group contacts retrieved successfully',
    type: GroupContactsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid group name',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getGroupContacts(@Body() body: GetGroupContactsDto) {
    const { groupName, searchById } = body;
    return this.whatsappService.getGroupContacts(groupName, searchById);
  }

  @Post('diffusion-contacts')
  @ApiOperation({ summary: 'Get all contacts from a WhatsApp diffusion group' })
  @ApiBody({ type: GetDiffusionContactsDto })
  @ApiResponse({
    status: 200,
    description: 'Diffusion contacts retrieved successfully',
    type: DiffusionContactsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid diffusion name',
  })
  @ApiResponse({ status: 404, description: 'Diffusion group not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDiffusionContacts(@Body() body: GetDiffusionContactsDto) {
    const { diffusionName, searchById } = body;
    return this.whatsappService.getDiffusionContacts(diffusionName, searchById);
  }

  @Post('contact')
  @ApiOperation({ summary: 'Get a specific contact by name or ID' })
  @ApiBody({ type: GetContactDto })
  @ApiResponse({
    status: 200,
    description: 'Contact retrieved successfully',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid contact identifier',
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getContact(@Body() body: GetContactDto) {
    const { contactIdentifier, searchById } = body;
    return this.whatsappService.getContact(contactIdentifier, searchById);
  }
}
