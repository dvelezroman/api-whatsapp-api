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

  getQRCode() {
    if (!this.qrCodeData) {
      return {
        status: 'no_qr',
        message: 'No QR code available at this moment',
      };
    }
    return { status: 'qr', qr: this.qrCodeData };
  }
}
