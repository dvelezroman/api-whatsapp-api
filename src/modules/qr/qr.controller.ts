import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Controller('qr')
export class QRController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get()
  getQRPage(@Res() res: Response) {
    res.type('html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp QR Code</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
          #status { font-size: 18px; margin-bottom: 20px; }
          img { border: 2px solid #ccc; padding: 10px; }
        </style>
      </head>
      <body>
        <h1>WhatsApp QR Code</h1>
        <div id="status">Loading...</div>
        <div><img id="qrImage" src="" alt="QR Code" /></div>

        <script>
          async function fetchQR() {
            try {
              const res = await fetch('/whatsapp/qrcode');
              const data = await res.json();
              if (data.status === 'qr' && data.qr) {
                document.getElementById('status').innerText = 'Scan this QR code in WhatsApp → Linked Devices';
                document.getElementById('qrImage').src = data.qr;
              } else if (data.status === 'ready') {
                document.getElementById('status').innerText = '✅ WhatsApp client is connected';
                document.getElementById('qrImage').style.display = 'none';
              } else {
                document.getElementById('status').innerText = 'Waiting for QR...';
              }
            } catch (err) {
              document.getElementById('status').innerText = 'Error fetching QR code';
            }
          }
          fetchQR();
          setInterval(fetchQR, 5000);
        </script>
      </body>
      </html>
    `);
  }
}
