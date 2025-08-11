import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as QRCode from 'qrcode';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsAppService.name);
  private qrCodeData: string | null = null; // Store latest QR code

  onModuleInit() {
    this.logger.log('Initializing WhatsApp Client...');

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
      puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });

    this.client.on('qr', async (qr) => {
      this.logger.warn('QR Code received. Scan with your phone.');

      // Save raw QR
      this.qrCodeData = await QRCode.toDataURL(qr); // Convert to Base64 image

      // Also log to terminal (optional)
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.logger.log('WhatsApp Client is ready!');
      this.qrCodeData = null; // No QR needed anymore
    });

    this.client.on('authenticated', () => {
      this.logger.log('WhatsApp Client authenticated successfully!');
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('Authentication failed:', msg);
    });

    this.client.initialize();
  }

  async sendMessage(phone: string, message: string) {
    if (!phone.includes('@c.us')) {
      phone = phone.replace(/\D/g, '') + '@c.us';
    }
    await this.client.sendMessage(phone, message);
    this.logger.log(`Message sent to ${phone}`);
    return { status: 'success', phone, message };
  }

  async saveContact(phone: string, name?: string, description?: string) {
    try {
      // Format phone number to WhatsApp format
      const formattedPhone = phone.replace(/\D/g, '') + '@c.us';

      // Check if contact exists using WhatsApp Web.js
      await this.client.getContactById(formattedPhone);

      // If contact doesn't exist, we can't create it directly with WhatsApp Web.js
      // But we can store it in our own contact management system
      // For now, we'll return the contact info that would be saved

      this.logger.log(
        `Contact saved: ${formattedPhone} - ${name || 'Unknown'}`,
      );

      return {
        status: 'success',
        contact: {
          phone: formattedPhone,
          name: name || 'Unknown',
          description: description || '',
          savedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error saving contact: ${error.message}`);
      throw new Error(`Failed to save contact: ${error.message}`);
    }
  }

  getQRCode() {
    if (!this.qrCodeData) {
      return {
        status: 'no_qr',
        message: 'No QR code available at this moment',
      };
    }
    return { status: 'qr', qr: this.qrCodeData };
  }

  async getAllGroups() {
    try {
      // Get all groups from WhatsApp using the correct method
      const chats = await this.client.getChats();
      const groups = chats.filter((chat) => chat.isGroup);

      // Map groups to a more readable format
      const formattedGroups = groups.map((group) => {
        // Cast to any to access group-specific properties
        const groupChat = group as any;
        return {
          id: group.id._serialized,
          name: group.name,
          description: groupChat.description || '',
          participantsCount: groupChat.participants?.length || 0,
          isGroup: group.isGroup,
          createdAt: groupChat.createdAt
            ? new Date(groupChat.createdAt * 1000).toISOString()
            : null,
          participants:
            groupChat.participants?.map((participant: any) => ({
              id: participant.id._serialized,
              name: participant.name || participant.pushname || 'Unknown',
              isAdmin: participant.isAdmin,
              isSuperAdmin: participant.isSuperAdmin,
            })) || [],
        };
      });

      this.logger.log(`Retrieved ${formattedGroups.length} groups`);

      return {
        status: 'success',
        totalGroups: formattedGroups.length,
        groups: formattedGroups,
      };
    } catch (error) {
      this.logger.error(`Error retrieving groups: ${error.message}`);
      throw new Error(`Failed to retrieve groups: ${error.message}`);
    }
  }

  async getAllDiffusionGroups() {
    try {
      // Get all chats from WhatsApp
      const chats = await this.client.getChats();

      // Filter for diffusion groups (broadcast lists)
      const diffusionGroups = chats.filter(
        (chat) => chat.isGroup && chat.name.includes('Broadcast'),
      );

      // Map diffusion groups to a more readable format
      const formattedDiffusionGroups = diffusionGroups.map((group) => {
        // Cast to any to access group-specific properties
        const groupChat = group as any;
        return {
          id: group.id._serialized,
          name: group.name,
          description: groupChat.description || '',
          participantsCount: groupChat.participants?.length || 0,
          isGroup: group.isGroup,
          isBroadcast: true,
          createdAt: groupChat.createdAt
            ? new Date(groupChat.createdAt * 1000).toISOString()
            : null,
          participants:
            groupChat.participants?.map((participant: any) => ({
              id: participant.id._serialized,
              name: participant.name || participant.pushname || 'Unknown',
              isAdmin: participant.isAdmin,
              isSuperAdmin: participant.isSuperAdmin,
            })) || [],
        };
      });

      this.logger.log(
        `Retrieved ${formattedDiffusionGroups.length} diffusion groups`,
      );

      return {
        status: 'success',
        totalDiffusionGroups: formattedDiffusionGroups.length,
        diffusionGroups: formattedDiffusionGroups,
      };
    } catch (error) {
      this.logger.error(`Error retrieving diffusion groups: ${error.message}`);
      throw new Error(`Failed to retrieve diffusion groups: ${error.message}`);
    }
  }
}
