import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as QRCode from 'qrcode';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsAppService.name);
  private qrCodeData: string | null = null; // Store latest QR code
  private isClientReady: boolean = false; // Track client readiness
  private isClientAuthenticated: boolean = false; // Track client authentication
  private webHelpersInjected: boolean = false; // Track if WhatsApp Web helpers are injected

  // Webhook configuration
  private webhookConfig: {
    url: string;
    method: string;
    apiKey?: string;
    timeout: number;
  } | null = null;

  constructor(private configService: ConfigService) {}

  private async testWebHelpers(): Promise<boolean> {
    try {
      // Try to get a simple chat to test if helpers are working
      const chats = await this.client.getChats();
      return Array.isArray(chats);
    } catch (error) {
      this.logger.warn(`Web helpers test failed: ${error.message}`);

      // Additional debugging information
      if (error.message.includes('getChats')) {
        this.logger.warn(
          'WhatsApp Web helpers not properly injected. Client may need restart.',
        );
      }

      return false;
    }
  }

  private async checkClientReady(): Promise<void> {
    if (!this.client) {
      throw new Error(
        'CLIENT_NOT_INITIALIZED: WhatsApp client has not been initialized yet. Please wait for the client to initialize.',
      );
    }
    if (!this.isClientAuthenticated) {
      throw new Error(
        'CLIENT_NOT_AUTHENTICATED: WhatsApp client is not authenticated yet. Please scan the QR code to authenticate.',
      );
    }
    if (!this.isClientReady) {
      throw new Error(
        'CLIENT_NOT_READY: WhatsApp client is authenticated but not ready yet. Please wait for the client to fully initialize.',
      );
    }

    // Test if WhatsApp Web helpers are actually working
    const helpersWorking = await this.testWebHelpers();
    if (!helpersWorking) {
      this.webHelpersInjected = false;
      throw new Error(
        'WEB_HELPERS_NOT_INJECTED: WhatsApp Web helpers are not properly injected. This may be due to a version mismatch or the client needs to be restarted.',
      );
    }
    this.webHelpersInjected = true;
  }

  onModuleInit() {
    this.logger.log('Initializing WhatsApp Client...');

    // Initialize webhook configuration from environment variables
    this.initializeWebhookFromEnv();

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
      puppeteer: {
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-translate',
          '--disable-windows10-custom-titlebar',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain',
        ],
      },
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
      this.isClientReady = true; // Mark client as ready
    });

    this.client.on('authenticated', () => {
      this.logger.log('WhatsApp Client authenticated successfully!');
      this.isClientAuthenticated = true; // Mark client as authenticated
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('Authentication failed:', msg);
      this.isClientReady = false; // Mark client as not ready
      this.isClientAuthenticated = false; // Mark client as not authenticated
    });

    // Listen for incoming messages
    this.client.on('message', async (message) => {
      await this.handleIncomingMessage(message);
    });

    this.client.initialize();
  }

  private async handleIncomingMessage(message: any) {
    try {
      // Skip messages from self
      if (message.fromMe) {
        return;
      }

      // Get sender information
      const sender = message.from;
      const senderContact = await this.client.getContactById(sender);

      // Check if sender is a registered contact (has name or pushname)
      const isRegisteredContact = senderContact.name || senderContact.pushname;

      // If unknown contact, save it first
      if (!isRegisteredContact) {
        await this.saveUnknownContact(senderContact);
      }

      // Forward to webhook if configured (for ALL contacts)
      if (this.webhookConfig) {
        await this.forwardToWebhook(
          message,
          senderContact,
          Boolean(isRegisteredContact),
        );
      } else {
        // Log messages when no webhook is configured
        if (!isRegisteredContact) {
          this.logger.warn(
            `Message from unknown contact ${sender}: ${message.body}`,
          );
        } else {
          this.logger.log(
            `Message from registered contact ${senderContact.name || senderContact.pushname}: ${message.body}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error handling incoming message: ${error.message}`);
    }
  }

  private async saveUnknownContact(senderContact: any) {
    try {
      const phone = senderContact.id.user;
      const pushname = senderContact.pushname || 'Unknown';

      // Use the existing saveContact method to validate and save
      await this.saveContact(
        phone,
        pushname,
        'Auto-saved from incoming message',
      );

      this.logger.log(`Auto-saved unknown contact: ${pushname} (${phone})`);
    } catch (error) {
      this.logger.error(`Error auto-saving unknown contact: ${error.message}`);
      // Don't throw error to avoid breaking message processing
    }
  }

  private async ensureReady() {
    // wait until the client has injected its helpers
    if (!this.client) throw new Error('CLIENT_NOT_INITIALIZED');
    // `getState` resolves when page is up; retry briefly if needed
    const state = await this.client.getState().catch(() => null);
    if (!state || state === 'CONFLICT' || state === 'UNPAIRED') {
      throw new Error(`CLIENT_NOT_READY: ${state}`);
    }
  }

  /** Normalizes +E.164 to WhatsApp ID and verifies registration */
  private async resolveWhatsAppId(rawNumber: string): Promise<string> {
    // 1) strip '+' and non-digits
    const digits = rawNumber.replace(/\D/g, '');
    // 2) ask WA if this number has an account
    const info = await this.client.getNumberId(digits);
    if (!info) throw new Error('NUMBER_NOT_ON_WHATSAPP');
    return info._serialized; // e.g. "593995710556@c.us"
  }

  private initializeWebhookFromEnv() {
    const webhookUrl = this.configService.get<string>('WEBHOOK_URL');
    const webhookApiKey = this.configService.get<string>('WEBHOOK_API_KEY');
    const webhookTimeout =
      this.configService.get<number>('WEBHOOK_TIMEOUT') || 10000;

    if (webhookUrl) {
      this.webhookConfig = {
        url: webhookUrl,
        method: 'POST',
        apiKey: webhookApiKey,
        timeout: webhookTimeout,
      };
      this.logger.log(`Webhook configured from environment: ${webhookUrl}`);
    } else {
      this.logger.log('No webhook URL configured in environment variables');
    }
  }

  private async forwardToWebhook(
    message: any,
    senderContact: any,
    isRegisteredContact: boolean,
  ) {
    try {
      const webhookData = {
        messageId: message.id._serialized,
        from: message.from,
        sender: {
          id: senderContact.id._serialized,
          phone: senderContact.id.user,
          pushname: senderContact.pushname,
          name: senderContact.name,
          isBusiness: senderContact.isBusiness,
          isVerified: senderContact.isVerified,
          isRegisteredContact: isRegisteredContact,
        },
        message: {
          body: message.body,
          type: message.type,
          timestamp: message.timestamp,
        },
        chat: {
          id: message.from,
          type: message.chat.isGroup ? 'group' : 'individual',
        },
        receivedAt: new Date().toISOString(),
      };

      this.logger.log(
        `Forwarding message to webhook: ${this.webhookConfig.url}`,
      );

      const response: AxiosResponse = await axios({
        method: this.webhookConfig.method,
        url: this.webhookConfig.url,
        data: webhookData,
        headers: {
          'Content-Type': 'application/json',
          ...(this.webhookConfig.apiKey && {
            Authorization: `Bearer ${this.webhookConfig.apiKey}`,
          }),
        },
        timeout: this.webhookConfig.timeout,
      });

      // Handle webhook response
      if (response.data && response.data.reply) {
        await this.sendMessage(message.from, response.data.reply);
        this.logger.log(
          `Sent reply to ${message.from}: ${response.data.reply}`,
        );
      }

      this.logger.log(`Webhook response received: ${response.status}`);
    } catch (error) {
      this.logger.error(`Error forwarding to webhook: ${error.message}`);

      // Optionally send a default response on webhook failure
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.logger.warn(
          `Webhook unavailable, message from ${message.from} not processed`,
        );
      }
    }
  }

  async sendMessage(phone: string, message: string) {
    try {
      return await this.retryOperation(async () => {
        // Check if client is ready before proceeding
        await this.checkClientReady();

        // Format phone number to WhatsApp format
        const formattedPhone = phone.includes('@c.us')
          ? phone
          : phone.replace(/\D/g, '') + '@c.us';

        // Send message directly to the phone number
        await this.client.sendMessage(formattedPhone, message);

        // Try to get contact info for logging (optional)
        let contactName = 'Unknown';
        try {
          const contact = await this.client.getContactById(formattedPhone);
          contactName = contact.name || contact.pushname || 'Unknown';
        } catch {
          // Contact doesn't exist yet, that's okay
          this.logger.log(`Sending message to new contact: ${formattedPhone}`);
        }

        this.logger.log(`Message sent to ${contactName} (${formattedPhone})`);

        return {
          status: 'success',
          phone: formattedPhone,
          contactName,
          message,
          sentAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      this.logger.error(`Error sending message to ${phone}: ${error.message}`);

      if (
        error.message.includes('CLIENT_NOT_INITIALIZED') ||
        error.message.includes('CLIENT_NOT_AUTHENTICATED') ||
        error.message.includes('CLIENT_NOT_READY') ||
        error.message.includes('WEB_HELPERS_NOT_INJECTED')
      ) {
        throw new Error(error.message);
      } else if (error.message.includes('not found')) {
        throw new Error(
          `CONTACT_NOT_FOUND: Contact with phone ${phone} not found.`,
        );
      } else if (error.message.includes('Failed to send')) {
        throw new Error(
          `SEND_FAILED: Failed to send message. Please check if you have permission to send messages to this contact.`,
        );
      } else {
        throw new Error(`MESSAGE_SEND_ERROR: ${error.message}`);
      }
    }
  }

  async saveContact(phone: string, name?: string, description?: string) {
    try {
      // Check if client is ready before proceeding
      await this.checkClientReady();

      // Format phone number to WhatsApp format
      const formattedPhone = phone.replace(/\D/g, '') + '@c.us';

      // Check if contact exists using WhatsApp Web.js
      const contact = await this.client.getContactById(formattedPhone);

      // Get contact name for logging (optional)
      const contactName = contact.name || contact.pushname || 'Unknown';

      this.logger.log(`Contact validated: ${formattedPhone} - ${contactName}`);

      return {
        status: 'success',
        contact: {
          phone: formattedPhone,
          name: contactName,
          description: description || '',
          isManuallyCreated: true,
          validatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error validating contact: ${error.message}`);

      if (error.message.includes('not found')) {
        throw new Error(
          `CONTACT_NOT_FOUND: Contact with phone ${phone} not found.`,
        );
      } else {
        throw new Error(`CONTACT_VALIDATION_ERROR: ${error.message}`);
      }
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

  getClientStatus() {
    let status = 'initializing';
    if (this.isClientReady) {
      status = 'ready';
    } else if (this.isClientAuthenticated) {
      status = 'authenticated_but_not_ready';
    } else if (this.qrCodeData) {
      status = 'waiting_for_qr_scan';
    } else if (this.client) {
      status = 'initializing';
    }

    return {
      isClientInitialized: !!this.client,
      isClientAuthenticated: this.isClientAuthenticated,
      isClientReady: this.isClientReady,
      webHelpersInjected: this.webHelpersInjected,
      hasQRCode: !!this.qrCodeData,
      status,
    };
  }

  async waitForClientReady(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isClientReady && this.webHelpersInjected) {
      return true;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(async () => {
        if (this.isClientReady) {
          // Test if helpers are actually working
          const helpersWorking = await this.testWebHelpers();
          if (helpersWorking) {
            this.webHelpersInjected = true;
            clearInterval(checkInterval);
            resolve(true);
          }
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 1000); // Check every 1 second
    });
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 2000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // If it's a web helpers issue, wait and retry
        if (
          error.message.includes('WEB_HELPERS_NOT_INJECTED') ||
          error.message.includes('getContact') ||
          error.message.includes('getChat')
        ) {
          this.logger.warn(
            `Attempt ${attempt}/${maxRetries} failed due to web helpers issue, retrying in ${delayMs}ms...`,
          );

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            // Reset the web helpers flag to force re-test
            this.webHelpersInjected = false;
            continue;
          }
        }

        // For other errors, don't retry
        throw error;
      }
    }

    throw lastError;
  }

  async restartClient(): Promise<void> {
    this.logger.log('Restarting WhatsApp client...');

    // Reset all state flags
    this.isClientReady = false;
    this.isClientAuthenticated = false;
    this.webHelpersInjected = false;
    this.qrCodeData = null;

    // Destroy existing client
    if (this.client) {
      await this.client.destroy();
    }

    // Reinitialize client
    this.onModuleInit();
  }

  async getAllGroups() {
    try {
      // Check if client is ready before proceeding
      await this.checkClientReady();

      // Get all groups from WhatsApp using the correct method
      const chats = await this.client.getChats();
      const groups = chats.filter((chat) => chat.isGroup);

      // Map groups to a more readable format
      const formattedGroups = groups.map((group) => {
        try {
          // Cast to any to access group-specific properties
          const groupChat = group as any;

          // Safely handle createdAt timestamp with more robust validation
          let createdAt = null;
          if (groupChat.createdAt) {
            try {
              // Handle different timestamp formats
              let timestamp = groupChat.createdAt;

              // If it's already in milliseconds (13 digits), use as is
              // If it's in seconds (10 digits), multiply by 1000
              if (typeof timestamp === 'number') {
                if (timestamp.toString().length === 10) {
                  timestamp = timestamp * 1000;
                } else if (timestamp.toString().length === 13) {
                  // Already in milliseconds
                } else {
                  // Invalid timestamp length
                  timestamp = null;
                }
              } else {
                timestamp = null;
              }

              if (
                timestamp &&
                timestamp > 0 &&
                timestamp < Date.now() + 86400000
              ) {
                // Valid timestamp (not in the far future)
                const date = new Date(timestamp);
                if (
                  !isNaN(date.getTime()) &&
                  date.getFullYear() > 1970 &&
                  date.getFullYear() < 2100
                ) {
                  createdAt = date.toISOString();
                }
              }
            } catch {
              this.logger.warn(
                `Invalid timestamp for group ${group.name}: ${groupChat.createdAt}`,
              );
            }
          }

          return {
            id: group.id._serialized,
            name: group.name,
            description: groupChat.description || '',
            participantsCount: groupChat.participants?.length || 0,
            isGroup: group.isGroup,
            createdAt,
            participants:
              groupChat.participants?.map((participant: any) => ({
                id:
                  participant.id._serialized
                    ?.replace('@c.us', '')
                    .replace(/^/, '+') || 'unknown',
                name: participant.name || participant.pushname || 'Unknown',
                isAdmin: participant.isAdmin,
                isSuperAdmin: participant.isSuperAdmin,
              })) || [],
          };
        } catch (groupError) {
          this.logger.warn(`Error processing group: ${groupError.message}`);
          // Return a safe fallback for this group
          return {
            id: 'error',
            name: 'Error Group',
            description: 'Error processing this group',
            participantsCount: 0,
            isGroup: true,
            createdAt: null,
            participants: [],
          };
        }
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
      // Note: WhatsApp broadcast lists are typically groups, but the name filter might vary
      const diffusionGroups = chats.filter(
        (chat) =>
          chat.isGroup &&
          (chat.name.includes('Broadcast') ||
            chat.name.includes('diffusion') ||
            chat.name.includes('broadcast') ||
            // Include all groups for now to be more flexible
            true),
      );

      // Map diffusion groups to a more readable format
      const formattedDiffusionGroups = diffusionGroups.map((group) => {
        try {
          // Cast to any to access group-specific properties
          const groupChat = group as any;

          // Safely handle createdAt timestamp with more robust validation
          let createdAt = null;
          if (groupChat.createdAt) {
            try {
              // Handle different timestamp formats
              let timestamp = groupChat.createdAt;

              // If it's already in milliseconds (13 digits), use as is
              // If it's in seconds (10 digits), multiply by 1000
              if (typeof timestamp === 'number') {
                if (timestamp.toString().length === 10) {
                  timestamp = timestamp * 1000;
                } else if (timestamp.toString().length === 13) {
                  // Already in milliseconds
                } else {
                  // Invalid timestamp length
                  timestamp = null;
                }
              } else {
                timestamp = null;
              }

              if (
                timestamp &&
                timestamp > 0 &&
                timestamp < Date.now() + 86400000
              ) {
                // Valid timestamp (not in the far future)
                const date = new Date(timestamp);
                if (
                  !isNaN(date.getTime()) &&
                  date.getFullYear() > 1970 &&
                  date.getFullYear() < 2100
                ) {
                  createdAt = date.toISOString();
                }
              }
            } catch {
              this.logger.warn(
                `Invalid timestamp for diffusion group ${group.name}: ${groupChat.createdAt}`,
              );
            }
          }

          return {
            id: group.id._serialized,
            name: group.name,
            description: groupChat.description || '',
            participantsCount: groupChat.participants?.length || 0,
            isGroup: group.isGroup,
            isBroadcast: true,
            createdAt,
            participants:
              groupChat.participants?.map((participant: any) => ({
                id:
                  participant.id._serialized
                    ?.replace('@c.us', '')
                    .replace(/^/, '+') || 'unknown',
                name: participant.name || participant.pushname || 'Unknown',
                isAdmin: participant.isAdmin,
                isSuperAdmin: participant.isSuperAdmin,
              })) || [],
          };
        } catch (groupError) {
          this.logger.warn(
            `Error processing diffusion group: ${groupError.message}`,
          );
          // Return a safe fallback for this group
          return {
            id: 'error',
            name: 'Error Diffusion Group',
            description: 'Error processing this diffusion group',
            participantsCount: 0,
            isGroup: true,
            isBroadcast: true,
            createdAt: null,
            participants: [],
          };
        }
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

  async sendMessageToGroup(
    groupName: string,
    message: string,
    searchById: boolean = false,
  ) {
    try {
      // Get all chats from WhatsApp
      const chats = await this.client.getChats();

      // Filter for groups
      const groups = chats.filter((chat) => chat.isGroup);

      let targetGroup;

      if (searchById) {
        // Search by group ID
        targetGroup = groups.find(
          (group) => group.id._serialized === groupName,
        );
        if (!targetGroup) {
          throw new Error(
            `Group with ID '${groupName}' not found. Available groups: ${groups.map((g) => g.id._serialized).join(', ')}`,
          );
        }
      } else {
        // Search by group name (case-insensitive)
        targetGroup = groups.find((group) =>
          group.name.toLowerCase().includes(groupName.toLowerCase()),
        );

        if (!targetGroup) {
          const availableGroups = groups.map((g) => g.name).join(', ');
          throw new Error(
            `Group with name containing '${groupName}' not found. Available groups: ${availableGroups}`,
          );
        }
      }

      // Send message to the group
      await this.client.sendMessage(targetGroup.id._serialized, message);

      this.logger.log(
        `Message sent to group: ${targetGroup.name} (${targetGroup.id._serialized})`,
      );

      return {
        status: 'success',
        group: {
          id: targetGroup.id._serialized,
          name: targetGroup.name,
          participantsCount: (targetGroup as any).participants?.length || 0,
        },
        message,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error sending message to group '${groupName}': ${error.message}`,
      );

      // Provide detailed error information
      if (error.message.includes('not found')) {
        throw new Error(`GROUP_NOT_FOUND: ${error.message}`);
      } else if (error.message.includes('Failed to send')) {
        throw new Error(
          `SEND_FAILED: Failed to send message to group. Please check if you have permission to send messages in this group.`,
        );
      } else {
        throw new Error(`GROUP_SEND_ERROR: ${error.message}`);
      }
    }
  }

  async sendMessageToDiffusion(
    diffusionName: string,
    message: string,
    searchById: boolean = false,
  ) {
    try {
      // Get all chats from WhatsApp
      const chats = await this.client.getChats();

      // Filter for diffusion groups (broadcast lists)
      // Note: WhatsApp broadcast lists are typically groups, but the name filter might vary
      const diffusionGroups = chats.filter(
        (chat) =>
          chat.isGroup &&
          (chat.name.includes('Broadcast') ||
            chat.name.includes('diffusion') ||
            chat.name.includes('broadcast') ||
            // Include all groups for now to be more flexible
            true),
      );

      this.logger.log(
        `Found ${diffusionGroups.length} potential diffusion groups: ${diffusionGroups.map((g) => g.name).join(', ')}`,
      );

      let targetDiffusion;

      if (searchById) {
        // Search by diffusion ID
        targetDiffusion = diffusionGroups.find(
          (group) => group.id._serialized === diffusionName,
        );
        if (!targetDiffusion) {
          throw new Error(
            `Diffusion group with ID '${diffusionName}' not found. Available diffusion groups: ${diffusionGroups.map((g) => g.id._serialized).join(', ')}`,
          );
        }
      } else {
        // Search by diffusion name (case-insensitive)
        targetDiffusion = diffusionGroups.find((group) =>
          group.name.toLowerCase().includes(diffusionName.toLowerCase()),
        );

        if (!targetDiffusion) {
          const availableDiffusions = diffusionGroups
            .map((g) => g.name)
            .join(', ');
          throw new Error(
            `Diffusion group with name containing '${diffusionName}' not found. Available diffusion groups: ${availableDiffusions}`,
          );
        }
      }

      // Send message to the diffusion group
      await this.client.sendMessage(targetDiffusion.id._serialized, message);

      this.logger.log(
        `Message sent to diffusion group: ${targetDiffusion.name} (${targetDiffusion.id._serialized})`,
      );

      return {
        status: 'success',
        diffusion: {
          id: targetDiffusion.id._serialized,
          name: targetDiffusion.name,
          participantsCount: (targetDiffusion as any).participants?.length || 0,
        },
        message,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error sending message to diffusion group '${diffusionName}': ${error.message}`,
      );

      // Provide detailed error information
      if (error.message.includes('not found')) {
        throw new Error(`DIFFUSION_NOT_FOUND: ${error.message}`);
      } else if (error.message.includes('Failed to send')) {
        throw new Error(
          `SEND_FAILED: Failed to send message to diffusion group. Please check if you have permission to send messages in this diffusion group.`,
        );
      } else {
        throw new Error(`DIFFUSION_SEND_ERROR: ${error.message}`);
      }
    }
  }

  async getGroupContacts(groupName: string, searchById: boolean = false) {
    try {
      // Get all chats from WhatsApp
      const chats = await this.client.getChats();

      // Filter for groups
      const groups = chats.filter((chat) => chat.isGroup);

      let targetGroup;

      if (searchById) {
        // Search by group ID
        targetGroup = groups.find(
          (group) => group.id._serialized === groupName,
        );
        if (!targetGroup) {
          throw new Error(
            `Group with ID '${groupName}' not found. Available groups: ${groups.map((g) => g.id._serialized).join(', ')}`,
          );
        }
      } else {
        // Search by group name (case-insensitive)
        targetGroup = groups.find((group) =>
          group.name.toLowerCase().includes(groupName.toLowerCase()),
        );

        if (!targetGroup) {
          const availableGroups = groups.map((g) => g.name).join(', ');
          throw new Error(
            `Group with name containing '${groupName}' not found. Available groups: ${availableGroups}`,
          );
        }
      }

      // Get participants from the group
      const participants = (targetGroup as any).participants || [];

      // Map participants to contact format
      const contacts = participants.map((participant: any) => ({
        id:
          participant.id._serialized?.replace('@c.us', '').replace(/^/, '+') ||
          'unknown',
        name: participant.name || participant.pushname || 'Unknown',
        phone: participant.id.user ? `+${participant.id.user}` : 'unknown',
        pushname: participant.pushname,
        isBusiness: participant.isBusiness || false,
        isVerified: participant.isVerified || false,
        profilePicUrl: participant.profilePicUrl,
        status: participant.status,
      }));

      this.logger.log(
        `Retrieved ${contacts.length} contacts from group: ${targetGroup.name}`,
      );

      return {
        status: 'success',
        group: {
          id: targetGroup.id._serialized,
          name: targetGroup.name,
          participantsCount: contacts.length,
        },
        contacts,
      };
    } catch (error) {
      this.logger.error(
        `Error getting contacts from group '${groupName}': ${error.message}`,
      );

      if (error.message.includes('not found')) {
        throw new Error(`GROUP_NOT_FOUND: ${error.message}`);
      } else {
        throw new Error(`GROUP_CONTACTS_ERROR: ${error.message}`);
      }
    }
  }

  async getDiffusionContacts(
    diffusionName: string,
    searchById: boolean = false,
  ) {
    try {
      // Get all chats from WhatsApp
      const chats = await this.client.getChats();

      // Filter for diffusion groups (broadcast lists)
      // Note: WhatsApp broadcast lists are typically groups, but the name filter might vary
      const diffusionGroups = chats.filter(
        (chat) =>
          chat.isGroup &&
          (chat.name.includes('Broadcast') ||
            chat.name.includes('diffusion') ||
            chat.name.includes('broadcast') ||
            // Include all groups for now to be more flexible
            true),
      );

      let targetDiffusion;

      if (searchById) {
        // Search by diffusion ID
        targetDiffusion = diffusionGroups.find(
          (group) => group.id._serialized === diffusionName,
        );
        if (!targetDiffusion) {
          throw new Error(
            `Diffusion group with ID '${diffusionName}' not found. Available diffusion groups: ${diffusionGroups.map((g) => g.id._serialized).join(', ')}`,
          );
        }
      } else {
        // Search by diffusion name (case-insensitive)
        targetDiffusion = diffusionGroups.find((group) =>
          group.name.toLowerCase().includes(diffusionName.toLowerCase()),
        );

        if (!targetDiffusion) {
          const availableDiffusions = diffusionGroups
            .map((g) => g.name)
            .join(', ');
          throw new Error(
            `Diffusion group with name containing '${diffusionName}' not found. Available diffusion groups: ${availableDiffusions}`,
          );
        }
      }

      // Get participants from the diffusion group
      const participants = (targetDiffusion as any).participants || [];

      // Map participants to contact format
      const contacts = participants.map((participant: any) => ({
        id:
          participant.id._serialized?.replace('@c.us', '').replace(/^/, '+') ||
          'unknown',
        name: participant.name || participant.pushname || 'Unknown',
        phone: participant.id.user ? `+${participant.id.user}` : 'unknown',
        pushname: participant.pushname,
        isBusiness: participant.isBusiness || false,
        isVerified: participant.isVerified || false,
        profilePicUrl: participant.profilePicUrl,
        status: participant.status,
      }));

      this.logger.log(
        `Retrieved ${contacts.length} contacts from diffusion group: ${targetDiffusion.name}`,
      );

      return {
        status: 'success',
        group: {
          id: targetDiffusion.id._serialized,
          name: targetDiffusion.name,
          participantsCount: contacts.length,
        },
        contacts,
      };
    } catch (error) {
      this.logger.error(
        `Error getting contacts from diffusion group '${diffusionName}': ${error.message}`,
      );

      if (error.message.includes('not found')) {
        throw new Error(`DIFFUSION_NOT_FOUND: ${error.message}`);
      } else {
        throw new Error(`DIFFUSION_CONTACTS_ERROR: ${error.message}`);
      }
    }
  }

  async getContact(contactIdentifier: string, searchById: boolean = false) {
    try {
      // Check if client is ready before proceeding
      await this.checkClientReady();

      let contact;

      if (searchById) {
        // Search by contact ID
        contact = await this.client.getContactById(contactIdentifier);
      } else {
        // Search by contact name (get all contacts and filter)
        const contacts = await this.client.getContacts();
        contact = contacts.find(
          (c) =>
            c.name?.toLowerCase().includes(contactIdentifier.toLowerCase()) ||
            c.pushname?.toLowerCase().includes(contactIdentifier.toLowerCase()),
        );

        if (!contact) {
          const availableContacts = contacts
            .filter((c) => c.name || c.pushname)
            .map((c) => c.name || c.pushname)
            .slice(0, 10) // Limit to first 10 for error message
            .join(', ');
          throw new Error(
            `Contact with name containing '${contactIdentifier}' not found. Available contacts: ${availableContacts}`,
          );
        }
      }

      // Format contact information
      const contactInfo = {
        id: contact.id._serialized,
        name: contact.name || contact.pushname || 'Unknown',
        phone: contact.id.user,
        pushname: contact.pushname,
        isBusiness: contact.isBusiness || false,
        isVerified: contact.isVerified || false,
        profilePicUrl: contact.profilePicUrl,
        status: contact.status,
      };

      this.logger.log(
        `Retrieved contact: ${contactInfo.name} (${contactInfo.id})`,
      );

      return {
        status: 'success',
        contact: contactInfo,
      };
    } catch (error) {
      this.logger.error(
        `Error getting contact '${contactIdentifier}': ${error.message}`,
      );

      if (error.message.includes('not found')) {
        throw new Error(`CONTACT_NOT_FOUND: ${error.message}`);
      } else {
        throw new Error(`CONTACT_ERROR: ${error.message}`);
      }
    }
  }

  // Webhook configuration methods
  async configureWebhook(config: {
    url: string;
    method?: string;
    apiKey?: string;
    timeout?: number;
  }) {
    this.webhookConfig = {
      url: config.url,
      method: config.method || 'POST',
      apiKey: config.apiKey,
      timeout: config.timeout || 10000,
    };

    this.logger.log(`Webhook configured: ${config.url}`);
    return {
      status: 'success',
      message: 'Webhook configured successfully',
      config: this.webhookConfig,
    };
  }

  async getWebhookConfig() {
    if (!this.webhookConfig) {
      return {
        status: 'not_configured',
        message: 'No webhook configured',
      };
    }

    return {
      status: 'success',
      config: this.webhookConfig,
    };
  }

  async removeWebhook() {
    this.webhookConfig = null;
    this.logger.log('Webhook configuration removed');
    return {
      status: 'success',
      message: 'Webhook configuration removed successfully',
    };
  }

  async testWebhook(testData: any) {
    if (!this.webhookConfig) {
      throw new Error('No webhook configured');
    }

    try {
      const response: AxiosResponse = await axios({
        method: this.webhookConfig.method,
        url: this.webhookConfig.url,
        data: testData,
        headers: {
          'Content-Type': 'application/json',
          ...(this.webhookConfig.apiKey && {
            Authorization: `Bearer ${this.webhookConfig.apiKey}`,
          }),
        },
        timeout: this.webhookConfig.timeout,
      });

      return {
        status: 'success',
        message: 'Webhook test successful',
        response: {
          status: response.status,
          data: response.data,
        },
      };
    } catch (error) {
      throw new Error(`Webhook test failed: ${error.message}`);
    }
  }

  async getAllContacts() {
    try {
      // Check if client is ready before proceeding
      await this.checkClientReady();

      // Get all contacts from WhatsApp
      const contacts = await this.client.getContacts();

      // Map contacts to a more readable format
      const formattedContacts = contacts.map((contact) => {
        try {
          // Safely handle contact data
          const contactData = contact as any;

          // Format phone number
          let phone = 'unknown';
          if (contactData.id && contactData.id.user) {
            phone = `+${contactData.id.user}`;
          }

          // Handle last seen timestamp
          let lastSeen = null;
          if (contactData.lastSeen) {
            try {
              const timestamp = contactData.lastSeen;
              let date;

              // Handle different timestamp formats
              if (typeof timestamp === 'number') {
                if (timestamp.toString().length === 10) {
                  date = new Date(timestamp * 1000);
                } else if (timestamp.toString().length === 13) {
                  date = new Date(timestamp);
                }
              }

              if (
                date &&
                !isNaN(date.getTime()) &&
                date.getFullYear() > 1970 &&
                date.getFullYear() < 2100
              ) {
                lastSeen = date.toISOString();
              }
            } catch {
              this.logger.warn(
                `Invalid lastSeen timestamp for contact ${contactData.name}: ${contactData.lastSeen}`,
              );
            }
          }

          return {
            id: contactData.id?._serialized || 'unknown',
            name: contactData.name || contactData.pushname || 'Unknown',
            pushname: contactData.pushname,
            phone,
            isBusiness: contactData.isBusiness || false,
            isVerified: contactData.isVerified || false,
            profilePicUrl: contactData.profilePicUrl,
            status: contactData.status,
            isOnline: contactData.isOnline,
            lastSeen,
          };
        } catch (contactError) {
          this.logger.warn(`Error processing contact: ${contactError.message}`);
          // Return a safe fallback for this contact
          return {
            id: 'error',
            name: 'Error Contact',
            phone: 'unknown',
            isBusiness: false,
            isVerified: false,
            isOnline: false,
          };
        }
      });

      this.logger.log(`Retrieved ${formattedContacts.length} contacts`);

      return {
        status: 'success',
        totalContacts: formattedContacts.length,
        contacts: formattedContacts,
      };
    } catch (error) {
      this.logger.error(`Error retrieving contacts: ${error.message}`);
      throw new Error(`Failed to retrieve contacts: ${error.message}`);
    }
  }

  async createGroup(
    name: string,
    participants: string[],
    description?: string,
  ) {
    try {
      // Check if client is ready before proceeding
      await this.checkClientReady();

      // Format participant phone numbers to WhatsApp format
      const formattedParticipants = participants.map((phone) => {
        const cleanPhone = phone.replace(/\D/g, '');
        return `${cleanPhone}@c.us`;
      });

      this.logger.log(
        `Creating group: ${name} with ${formattedParticipants.length} participants`,
      );

      // Create the group using WhatsApp Web.js
      const groupResult = await this.client.createGroup(
        name,
        formattedParticipants,
      );

      this.logger.log(`Group creation result type: ${typeof groupResult}`);
      this.logger.log(`Group creation result: ${JSON.stringify(groupResult)}`);

      // Handle the result - it can be a string (error) or CreateGroupResult object
      if (typeof groupResult === 'string') {
        throw new Error(`Failed to create group: ${groupResult}`);
      }

      const group = groupResult as any;

      // Validate that the group object has the required properties
      if (!group) {
        this.logger.error(`Invalid group result: ${JSON.stringify(group)}`);
        throw new Error('Group creation failed: No group object returned');
      }

      // Check if the group has an id property and handle different possible structures
      let groupId = null;
      let groupName = name; // fallback to the name we provided

      if (group.id) {
        if (typeof group.id === 'string') {
          groupId = group.id;
        } else if (group.id._serialized) {
          groupId = group.id._serialized;
        }
      }

      if (group.name) {
        groupName = group.name;
      }

      if (!groupId) {
        this.logger.error(
          `Group created but no valid ID found: ${JSON.stringify(group)}`,
        );
        throw new Error('Group creation failed: No valid group ID returned');
      }

      // Set description if provided
      if (description) {
        try {
          await group.setDescription(description);
        } catch (descError) {
          this.logger.warn(
            `Failed to set group description: ${descError.message}`,
          );
        }
      }

      this.logger.log(`Group created successfully: ${groupName} (${groupId})`);

      return {
        status: 'success',
        message: 'Group created successfully',
        group: {
          id: groupId,
          name: groupName,
          description: description || '',
          participantsCount: formattedParticipants.length,
          isGroup: true,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error creating group '${name}': ${error.message}`);

      if (error.message.includes('CLIENT_NOT_READY')) {
        throw new Error(`CLIENT_NOT_READY: ${error.message}`);
      } else if (error.message.includes('not found')) {
        throw new Error(
          `PARTICIPANT_NOT_FOUND: One or more participants not found on WhatsApp`,
        );
      } else if (error.message.includes('permission')) {
        throw new Error(
          `PERMISSION_DENIED: You don't have permission to create groups`,
        );
      } else {
        throw new Error(`GROUP_CREATION_ERROR: ${error.message}`);
      }
    }
  }

  async createDiffusionGroup(
    name: string,
    participants: string[],
    description?: string,
  ) {
    try {
      // Check if client is ready before proceeding
      await this.checkClientReady();

      // Format participant phone numbers to WhatsApp format
      const formattedParticipants = participants.map((phone) => {
        const cleanPhone = phone.replace(/\D/g, '');
        return `${cleanPhone}@c.us`;
      });

      this.logger.log(
        `Creating diffusion group: ${name} with ${formattedParticipants.length} participants`,
      );

      // Create the broadcast list using WhatsApp Web.js
      // For broadcast lists, we need to use a different approach
      // First, let's try to create a regular group and then convert it to broadcast if needed
      const broadcastResult = await this.client.createGroup(
        name,
        formattedParticipants,
      );

      this.logger.log(
        `Diffusion group creation result type: ${typeof broadcastResult}`,
      );
      this.logger.log(
        `Diffusion group creation result: ${JSON.stringify(broadcastResult)}`,
      );

      // Handle the result - it can be a string (error) or CreateGroupResult object
      if (typeof broadcastResult === 'string') {
        throw new Error(`Failed to create diffusion group: ${broadcastResult}`);
      }

      const broadcast = broadcastResult as any;

      // Validate that the broadcast object has the required properties
      if (!broadcast) {
        this.logger.error(
          `Invalid broadcast result: ${JSON.stringify(broadcast)}`,
        );
        throw new Error(
          'Diffusion group creation failed: No broadcast object returned',
        );
      }

      // Check if the broadcast has an id property and handle different possible structures
      let broadcastId = null;
      let broadcastName = name; // fallback to the name we provided

      if (broadcast.id) {
        if (typeof broadcast.id === 'string') {
          broadcastId = broadcast.id;
        } else if (broadcast.id._serialized) {
          broadcastId = broadcast.id._serialized;
        }
      }

      if (broadcast.name) {
        broadcastName = broadcast.name;
      }

      if (!broadcastId) {
        this.logger.error(
          `Broadcast created but no valid ID found: ${JSON.stringify(broadcast)}`,
        );
        throw new Error(
          'Diffusion group creation failed: No valid broadcast ID returned',
        );
      }

      this.logger.log(
        `Diffusion group created successfully: ${broadcastName} (${broadcastId})`,
      );

      return {
        status: 'success',
        message: 'Diffusion group created successfully',
        group: {
          id: broadcastId,
          name: broadcastName,
          description: description || '',
          participantsCount: formattedParticipants.length,
          isGroup: true,
          isBroadcast: true,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error creating diffusion group '${name}': ${error.message}`,
      );

      if (error.message.includes('CLIENT_NOT_READY')) {
        throw new Error(`CLIENT_NOT_READY: ${error.message}`);
      } else if (error.message.includes('not found')) {
        throw new Error(
          `PARTICIPANT_NOT_FOUND: One or more participants not found on WhatsApp`,
        );
      } else if (error.message.includes('permission')) {
        throw new Error(
          `PERMISSION_DENIED: You don't have permission to create broadcast lists`,
        );
      } else {
        throw new Error(`DIFFUSION_CREATION_ERROR: ${error.message}`);
      }
    }
  }

  async sendMediaMessage(
    phone: string,
    mediaType: string,
    mediaUrl: string,
    caption?: string,
    filename?: string,
  ) {
    try {
      return await this.retryOperation(async () => {
        // Check if client is ready before proceeding
        await this.checkClientReady();

        // Format phone number to WhatsApp format
        const formattedPhone = phone.includes('@c.us')
          ? phone
          : phone.replace(/\D/g, '') + '@c.us';

        // Try to get contact info for logging (optional)
        let contactName = 'Unknown';
        try {
          const contact = await this.client.getContactById(formattedPhone);
          contactName = contact.name || contact.pushname || 'Unknown';
        } catch {
          // Contact doesn't exist yet, that's okay
          this.logger.log(`Sending media to new contact: ${formattedPhone}`);
        }

        // Send media message based on type
        const mediaOptions: any = {};

        if (caption) {
          mediaOptions.caption = caption;
        }

        if (filename && mediaType === 'document') {
          mediaOptions.filename = filename;
        }

        // Create MessageMedia object for proper image display with timeout
        this.logger.log(`Downloading media from URL: ${mediaUrl}`);
        const media = (await Promise.race([
          MessageMedia.fromUrl(mediaUrl),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Media download timeout')),
              30000,
            ),
          ),
        ])) as MessageMedia;

        switch (mediaType.toLowerCase()) {
          case 'image':
            await this.client.sendMessage(formattedPhone, media, {
              ...mediaOptions,
            });
            break;
          case 'document':
            await this.client.sendMessage(formattedPhone, media, {
              ...mediaOptions,
            });
            break;
          case 'audio':
            await this.client.sendMessage(formattedPhone, media, {
              ...mediaOptions,
            });
            break;
          case 'video':
            await this.client.sendMessage(formattedPhone, media, {
              ...mediaOptions,
            });
            break;
          case 'sticker':
            await this.client.sendMessage(formattedPhone, media, {
              ...mediaOptions,
            });
            break;
          default:
            throw new Error(`Unsupported media type: ${mediaType}`);
        }

        this.logger.log(
          `Media message sent to ${contactName} (${formattedPhone})`,
        );

        return {
          status: 'success',
          phone: formattedPhone,
          contactName,
          media: {
            type: mediaType,
            url: mediaUrl,
            caption,
            filename,
          },
          sentAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error sending media message to ${phone}: ${error.message}`,
      );

      if (
        error.message.includes('CLIENT_NOT_INITIALIZED') ||
        error.message.includes('CLIENT_NOT_AUTHENTICATED') ||
        error.message.includes('CLIENT_NOT_READY') ||
        error.message.includes('WEB_HELPERS_NOT_INJECTED')
      ) {
        throw new Error(error.message);
      } else if (error.message.includes('not found')) {
        throw new Error(
          `CONTACT_NOT_FOUND: Contact with phone ${phone} not found.`,
        );
      } else if (error.message.includes('Unsupported media type')) {
        throw new Error(`MEDIA_TYPE_ERROR: ${error.message}`);
      } else if (error.message.includes('Media download timeout')) {
        throw new Error(
          `MEDIA_DOWNLOAD_TIMEOUT: Media download timed out after 30 seconds. Please try with a smaller file or different URL.`,
        );
      } else {
        throw new Error(`MEDIA_SEND_ERROR: ${error.message}`);
      }
    }
  }

  async sendMediaMessageToGroup(
    groupName: string,
    mediaType: string,
    mediaUrl: string,
    caption?: string,
    filename?: string,
    searchById: boolean = false,
  ) {
    try {
      // Check if client is ready before proceeding
      await this.checkClientReady();

      // Get all chats from WhatsApp
      const chats = await this.client.getChats();
      const groups = chats.filter((chat) => chat.isGroup);

      let targetGroup;

      if (searchById) {
        // Search by group ID
        targetGroup = groups.find(
          (group) => group.id._serialized === groupName,
        );
        if (!targetGroup) {
          throw new Error(
            `Group with ID '${groupName}' not found. Available groups: ${groups.map((g) => g.id._serialized).join(', ')}`,
          );
        }
      } else {
        // Search by group name (case-insensitive)
        targetGroup = groups.find((group) =>
          group.name.toLowerCase().includes(groupName.toLowerCase()),
        );

        if (!targetGroup) {
          const availableGroups = groups.map((g) => g.name).join(', ');
          throw new Error(
            `Group with name containing '${groupName}' not found. Available groups: ${availableGroups}`,
          );
        }
      }

      // Send media message to the group
      const mediaOptions: any = {};

      if (caption) {
        mediaOptions.caption = caption;
      }

      if (filename && mediaType === 'document') {
        mediaOptions.filename = filename;
      }

      // Create MessageMedia object for proper image display with timeout
      this.logger.log(`Downloading media from URL: ${mediaUrl}`);
      const media = (await Promise.race([
        MessageMedia.fromUrl(mediaUrl),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Media download timeout')), 30000),
        ),
      ])) as MessageMedia;

      switch (mediaType.toLowerCase()) {
        case 'image':
          await this.client.sendMessage(targetGroup.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        case 'document':
          await this.client.sendMessage(targetGroup.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        case 'audio':
          await this.client.sendMessage(targetGroup.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        case 'video':
          await this.client.sendMessage(targetGroup.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        case 'sticker':
          await this.client.sendMessage(targetGroup.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      this.logger.log(
        `Media message sent to group: ${targetGroup.name} (${targetGroup.id._serialized})`,
      );

      return {
        status: 'success',
        group: {
          id: targetGroup.id._serialized,
          name: targetGroup.name,
          participantsCount: (targetGroup as any).participants?.length || 0,
        },
        media: {
          type: mediaType,
          url: mediaUrl,
          caption,
          filename,
        },
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error sending media message to group '${groupName}': ${error.message}`,
      );

      if (error.message.includes('not found')) {
        throw new Error(`GROUP_NOT_FOUND: ${error.message}`);
      } else if (error.message.includes('Failed to send')) {
        throw new Error(
          `SEND_FAILED: Failed to send media message to group. Please check if you have permission to send messages in this group.`,
        );
      } else if (error.message.includes('Unsupported media type')) {
        throw new Error(`MEDIA_TYPE_ERROR: ${error.message}`);
      } else if (error.message.includes('Media download timeout')) {
        throw new Error(
          `MEDIA_DOWNLOAD_TIMEOUT: Media download timed out after 30 seconds. Please try with a smaller file or different URL.`,
        );
      } else {
        throw new Error(`GROUP_MEDIA_SEND_ERROR: ${error.message}`);
      }
    }
  }

  async sendMediaMessageToDiffusion(
    diffusionName: string,
    mediaType: string,
    mediaUrl: string,
    caption?: string,
    filename?: string,
    searchById: boolean = false,
  ) {
    try {
      // Check if client is ready before proceeding
      await this.checkClientReady();

      // Get all chats from WhatsApp
      const chats = await this.client.getChats();

      // Filter for diffusion groups (broadcast lists)
      const diffusionGroups = chats.filter(
        (chat) =>
          chat.isGroup &&
          (chat.name.includes('Broadcast') ||
            chat.name.includes('diffusion') ||
            chat.name.includes('broadcast') ||
            // Include all groups for now to be more flexible
            true),
      );

      let targetDiffusion;

      if (searchById) {
        // Search by diffusion ID
        targetDiffusion = diffusionGroups.find(
          (group) => group.id._serialized === diffusionName,
        );
        if (!targetDiffusion) {
          throw new Error(
            `Diffusion group with ID '${diffusionName}' not found. Available diffusion groups: ${diffusionGroups.map((g) => g.id._serialized).join(', ')}`,
          );
        }
      } else {
        // Search by diffusion name (case-insensitive)
        targetDiffusion = diffusionGroups.find((group) =>
          group.name.toLowerCase().includes(diffusionName.toLowerCase()),
        );

        if (!targetDiffusion) {
          const availableDiffusions = diffusionGroups
            .map((g) => g.name)
            .join(', ');
          throw new Error(
            `Diffusion group with name containing '${diffusionName}' not found. Available diffusion groups: ${availableDiffusions}`,
          );
        }
      }

      // Send media message to the diffusion group
      const mediaOptions: any = {};

      if (caption) {
        mediaOptions.caption = caption;
      }

      if (filename && mediaType === 'document') {
        mediaOptions.filename = filename;
      }

      // Download media from URL
      this.logger.log(`Downloading media from URL: ${mediaUrl}`);
      const media = (await Promise.race([
        MessageMedia.fromUrl(mediaUrl),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Media download timeout')), 30000),
        ),
      ])) as MessageMedia;

      switch (mediaType.toLowerCase()) {
        case 'image':
          await this.client.sendMessage(targetDiffusion.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        case 'document':
          await this.client.sendMessage(targetDiffusion.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        case 'audio':
          await this.client.sendMessage(targetDiffusion.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        case 'video':
          await this.client.sendMessage(targetDiffusion.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        case 'sticker':
          await this.client.sendMessage(targetDiffusion.id._serialized, media, {
            ...mediaOptions,
          });
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      this.logger.log(
        `Media message sent to diffusion group: ${targetDiffusion.name} (${targetDiffusion.id._serialized})`,
      );

      return {
        status: 'success',
        group: {
          id: targetDiffusion.id._serialized,
          name: targetDiffusion.name,
          participantsCount: targetDiffusion.participants?.length || 0,
        },
        media: {
          type: mediaType,
          url: mediaUrl,
          caption,
          filename,
        },
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error sending media message to diffusion group '${diffusionName}': ${error.message}`,
      );

      if (error.message.includes('not found')) {
        throw new Error(`DIFFUSION_NOT_FOUND: ${error.message}`);
      } else if (error.message.includes('Failed to send')) {
        throw new Error(
          `SEND_FAILED: Failed to send media message to diffusion group. Please check if you have permission to send messages in this diffusion group.`,
        );
      } else if (error.message.includes('Unsupported media type')) {
        throw new Error(`MEDIA_TYPE_ERROR: ${error.message}`);
      } else if (error.message.includes('Media download timeout')) {
        throw new Error(
          `MEDIA_DOWNLOAD_TIMEOUT: Media download timed out after 30 seconds. Please try with a smaller file or different URL.`,
        );
      } else {
        throw new Error(`DIFFUSION_MEDIA_SEND_ERROR: ${error.message}`);
      }
    }
  }
}
