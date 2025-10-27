import { Controller, Post, Body, Get, Delete } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { SendDto } from './dtos/send.dto';
import { SendMessageResponseDto } from './dtos/send-message-response.dto';
import { SaveContactDto } from './dtos/save-contact.dto';
import { SaveContactResponseDto } from './dtos/save-contact-response.dto';
import { GroupsResponseDto } from './dtos/group.dto';
import { DiffusionGroupsResponseDto } from './dtos/diffusion-group.dto';
import { SendGroupMessageDto } from './dtos/send-group-message.dto';
import { SendGroupMessageResponseDto } from './dtos/send-group-message-response.dto';
import { SendDiffusionMessageDto } from './dtos/send-diffusion-message.dto';
import { SendDiffusionMessageResponseDto } from './dtos/send-diffusion-message-response.dto';
import { GetGroupContactsDto } from './dtos/get-group-contacts.dto';
import { GetDiffusionContactsDto } from './dtos/get-diffusion-contacts.dto';
import { GetContactDto } from './dtos/get-contact.dto';
import {
  GroupContactsResponseDto,
  DiffusionContactsResponseDto,
  ContactResponseDto,
} from './dtos/contact.dto';
import { ContactsResponseDto } from './dtos/contacts-response.dto';
import { CreateGroupDto } from './dtos/create-group.dto';
import { CreateGroupResponseDto } from './dtos/create-group-response.dto';
import { CreateDiffusionGroupDto } from './dtos/create-diffusion-group.dto';
import { CreateDiffusionGroupResponseDto } from './dtos/create-diffusion-group-response.dto';
import { SendMediaMessageDto } from './dtos/send-media-message.dto';
import { SendMediaMessageResponseDto } from './dtos/send-media-message-response.dto';
import { SendGroupMediaMessageDto } from './dtos/send-group-media-message.dto';
import { SendGroupMediaMessageResponseDto } from './dtos/send-group-media-message-response.dto';
import { SendDiffusionMediaMessageDto } from './dtos/send-diffusion-media-message.dto';
import { SendDiffusionMediaMessageResponseDto } from './dtos/send-diffusion-media-message-response.dto';
import { WebhookConfigDto } from './dtos/webhook-config.dto';
import { WebhookConfigResponseDto } from './dtos/webhook-config-response.dto';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('qrcode')
  @ApiOperation({
    summary: 'Get QR Code for WhatsApp Web login',
    description:
      'Retrieves the QR code for WhatsApp Web authentication. Scan this QR code with your phone to connect WhatsApp Web.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns QR code image as Base64 or status message.',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['qr', 'no_qr'],
          description: 'Status of the QR code',
        },
        qr: {
          type: 'string',
          description:
            'Base64 encoded QR code image (only present when status is "qr")',
          example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        },
        message: {
          type: 'string',
          description: 'Status message (only present when status is "no_qr")',
          example: 'No QR code available at this moment',
        },
      },
    },
  })
  @ApiProduces('application/json')
  async getQRCode() {
    return this.whatsappService.getQRCode();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get WhatsApp client status',
    description:
      'Retrieves the current status and connection state of the WhatsApp client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the current status of the WhatsApp client.',
    schema: {
      type: 'object',
      properties: {
        isClientInitialized: {
          type: 'boolean',
          description: 'Whether the client has been initialized',
        },
        isClientAuthenticated: {
          type: 'boolean',
          description: 'Whether the client is authenticated',
        },
        isClientReady: {
          type: 'boolean',
          description: 'Whether the client is ready to send messages',
        },
        webHelpersInjected: {
          type: 'boolean',
          description: 'Whether WhatsApp Web helpers are properly injected',
        },
        hasQRCode: {
          type: 'boolean',
          description: 'Whether a QR code is currently available',
        },
        status: {
          type: 'string',
          enum: [
            'initializing',
            'waiting_for_qr_scan',
            'authenticated_but_not_ready',
            'ready',
          ],
          description: 'Current status of the client',
        },
      },
    },
  })
  @ApiProduces('application/json')
  async getClientStatus() {
    return this.whatsappService.getClientStatus();
  }

  @Post('restart')
  @ApiOperation({
    summary: 'Restart WhatsApp client',
    description:
      'Restarts the WhatsApp client. This will disconnect and reconnect the WhatsApp Web session.',
  })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp client restarted successfully.',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'success',
          description: 'Operation status',
        },
        message: {
          type: 'string',
          example: 'WhatsApp client restarted successfully',
          description: 'Success message',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-12T10:30:00.000Z',
          description: 'Timestamp when the restart was initiated',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to restart WhatsApp client.',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'Failed to restart WhatsApp client',
        },
        error: {
          type: 'string',
          example: 'Client restart failed due to internal error',
        },
      },
    },
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async restartClient() {
    await this.whatsappService.restartClient();
    return {
      status: 'success',
      message: 'WhatsApp client restarted successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('send')
  @ApiOperation({
    summary: 'Send a WhatsApp message',
    description:
      'Sends a text message to any WhatsApp number. No need to add contacts manually.',
  })
  @ApiBody({ type: SendDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: SendMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid phone number or message',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'Invalid phone number format',
        },
        error: {
          type: 'string',
          example:
            'CONTACT_NOT_FOUND: Contact with phone +1234567890 not found',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or client not ready',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'CLIENT_NOT_READY: WhatsApp client is not ready yet',
        },
      },
    },
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async sendMessage(@Body() body: SendDto) {
    const { phone, message } = body;
    return this.whatsappService.sendMessage(phone, message);
  }

  @Post('contacts')
  @ApiOperation({
    summary: 'Validate a WhatsApp contact',
    description:
      'Validates that a contact exists in WhatsApp. Does not require manual contact creation.',
  })
  @ApiBody({ type: SaveContactDto })
  @ApiResponse({
    status: 201,
    description: 'Contact validated successfully',
    type: SaveContactResponseDto,
  })
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

  @Get('contacts')
  @ApiOperation({ summary: 'Get all WhatsApp contacts' })
  @ApiResponse({
    status: 200,
    description: 'Contacts retrieved successfully',
    type: ContactsResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllContacts() {
    return this.whatsappService.getAllContacts();
  }

  @Post('send-group')
  @ApiOperation({ summary: 'Send a message to a WhatsApp group' })
  @ApiBody({ type: SendGroupMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent to group successfully',
    type: SendGroupMessageResponseDto,
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
    type: SendDiffusionMessageResponseDto,
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

  // Webhook management endpoints
  @Post('webhook/configure')
  @ApiOperation({
    summary: 'Configure webhook for handling messages from unknown contacts',
    description:
      'Sets up a webhook URL to forward messages from non-registered contacts to an external API. When a message is received from an unknown contact, it will be forwarded to this webhook URL.',
  })
  @ApiBody({ type: WebhookConfigDto })
  @ApiResponse({
    status: 201,
    description: 'Webhook configured successfully',
    type: WebhookConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid webhook configuration',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'Invalid webhook URL format',
        },
        error: {
          type: 'string',
          example: 'WEBHOOK_URL_INVALID: The provided URL is not valid',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'Failed to configure webhook',
        },
      },
    },
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async configureWebhook(@Body() body: WebhookConfigDto) {
    return this.whatsappService.configureWebhook(body);
  }

  @Get('webhook/config')
  @ApiOperation({
    summary: 'Get current webhook configuration',
    description:
      'Retrieves the current webhook configuration including URL, method, and authentication settings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook configuration retrieved successfully',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            config: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  example: 'https://api.example.com/webhook',
                },
                method: {
                  type: 'string',
                  example: 'POST',
                },
                apiKey: {
                  type: 'string',
                  example: 'your-api-key-here',
                },
                timeout: {
                  type: 'number',
                  example: 10000,
                },
              },
            },
          },
        },
        {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'not_configured',
            },
            message: {
              type: 'string',
              example: 'No webhook configured',
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'Failed to retrieve webhook configuration',
        },
      },
    },
  })
  @ApiProduces('application/json')
  async getWebhookConfig() {
    return this.whatsappService.getWebhookConfig();
  }

  @Delete('webhook/remove')
  @ApiOperation({
    summary: 'Remove webhook configuration',
    description:
      'Removes the current webhook configuration. Messages from unknown contacts will no longer be forwarded.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook configuration removed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'success',
        },
        message: {
          type: 'string',
          example: 'Webhook configuration removed successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'Failed to remove webhook configuration',
        },
      },
    },
  })
  @ApiProduces('application/json')
  async removeWebhook() {
    return this.whatsappService.removeWebhook();
  }

  @Post('webhook/test')
  @ApiOperation({
    summary: 'Test webhook configuration with sample data',
    description:
      'Sends a test message to the configured webhook URL to verify the configuration is working correctly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook test completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'success',
        },
        message: {
          type: 'string',
          example: 'Webhook test successful',
        },
        response: {
          type: 'object',
          properties: {
            status: {
              type: 'number',
              example: 200,
            },
            data: {
              type: 'object',
              description: 'Response data from the webhook',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - No webhook configured',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'No webhook configured',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'error',
        },
        message: {
          type: 'string',
          example: 'Webhook test failed: Connection timeout',
        },
      },
    },
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async testWebhook() {
    const testData = {
      messageId: 'test-message-id',
      from: '1234567890@c.us',
      sender: {
        id: '1234567890@c.us',
        phone: '1234567890',
        pushname: 'Test User',
        isBusiness: false,
        isVerified: false,
      },
      message: {
        body: 'This is a test message from webhook',
        type: 'chat',
        timestamp: Date.now(),
      },
      chat: {
        id: '1234567890@c.us',
        type: 'individual',
      },
      receivedAt: new Date().toISOString(),
    };

    return this.whatsappService.testWebhook(testData);
  }

  @Post('create-group')
  @ApiOperation({ summary: 'Create a new WhatsApp group' })
  @ApiBody({ type: CreateGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: CreateGroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid group data or participants',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more participants not found on WhatsApp',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createGroup(@Body() body: CreateGroupDto) {
    const { name, participants, description } = body;
    return this.whatsappService.createGroup(name, participants, description);
  }

  @Post('create-diffusion-group')
  @ApiOperation({
    summary: 'Create a new WhatsApp diffusion group (broadcast list)',
  })
  @ApiBody({ type: CreateDiffusionGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Diffusion group created successfully',
    type: CreateDiffusionGroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid diffusion group data or participants',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more participants not found on WhatsApp',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createDiffusionGroup(@Body() body: CreateDiffusionGroupDto) {
    const { name, participants, description } = body;
    return this.whatsappService.createDiffusionGroup(
      name,
      participants,
      description,
    );
  }

  @Post('send-media')
  @ApiOperation({ summary: 'Send a media message to a WhatsApp contact' })
  @ApiBody({ type: SendMediaMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Media message sent successfully',
    type: SendMediaMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid media data or contact',
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendMediaMessage(@Body() body: SendMediaMessageDto) {
    const { phone, mediaType, mediaUrl, caption, filename } = body;
    return this.whatsappService.sendMediaMessage(
      phone,
      mediaType,
      mediaUrl,
      caption,
      filename,
    );
  }

  @Post('send-group-media')
  @ApiOperation({ summary: 'Send a media message to a WhatsApp group' })
  @ApiBody({ type: SendGroupMediaMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Media message sent to group successfully',
    type: SendGroupMediaMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid media data or group',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendGroupMediaMessage(@Body() body: SendGroupMediaMessageDto) {
    const { groupName, mediaType, mediaUrl, caption, filename, searchById } =
      body;
    return this.whatsappService.sendMediaMessageToGroup(
      groupName,
      mediaType,
      mediaUrl,
      caption,
      filename,
      searchById,
    );
  }

  @Post('send-diffusion-media')
  @ApiOperation({
    summary: 'Send a media message to a WhatsApp diffusion group',
  })
  @ApiBody({ type: SendDiffusionMediaMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Media message sent to diffusion group successfully',
    type: SendDiffusionMediaMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid media data or diffusion group',
  })
  @ApiResponse({
    status: 404,
    description: 'Diffusion group not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async sendDiffusionMediaMessage(@Body() body: SendDiffusionMediaMessageDto) {
    const {
      diffusionName,
      mediaType,
      mediaUrl,
      caption,
      filename,
      searchById,
    } = body;
    return this.whatsappService.sendMediaMessageToDiffusion(
      diffusionName,
      mediaType,
      mediaUrl,
      caption,
      filename,
      searchById,
    );
  }
}
