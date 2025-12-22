import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@ApiTags('Qr')
@Controller('qr')
export class QRController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get()
  @ApiOperation({ summary: 'Serve HTML page with QR code auto-refresh' })
  @ApiResponse({
    status: 200,
    description: 'Returns an HTML page displaying WhatsApp QR code',
    content: { 'text/html': { example: '<!DOCTYPE html>...' } },
  })
  getQRPage(@Res() res: Response) {
    res.type('html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp QR Code</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: #f5f5f5;
            margin: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { 
            color: #25D366; 
            margin-bottom: 10px;
            font-size: 28px;
          }
          #status { 
            font-size: 16px; 
            margin: 20px 0; 
            color: #666;
            min-height: 24px;
          }
          #clientStatus {
            font-size: 14px;
            color: #999;
            margin-top: 10px;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 5px;
          }
          #qrImage { 
            border: 2px solid #ddd; 
            padding: 20px; 
            border-radius: 10px;
            max-width: 100%;
            height: auto;
            display: none;
            margin: 20px auto;
          }
          #qrImage.show {
            display: block;
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #25D366;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
            vertical-align: middle;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .error {
            color: #e74c3c;
            background: #fee;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .success {
            color: #27ae60;
            background: #efe;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          button {
            background: #25D366;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
          }
          button:hover {
            background: #20ba5a;
          }
          button:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .instructions {
            text-align: left;
            background: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            font-size: 14px;
          }
          .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>WhatsApp QR Code</h1>
          <div id="status">
            <span class="loading"></span>Initializing...
          </div>
          <div id="qrImage" alt="QR Code"></div>
          <div id="clientStatus"></div>
          <button id="restartBtn" onclick="restartClient()" style="display: none;">Restart Client</button>
          <div id="instructions" class="instructions" style="display: none;">
            <strong>How to connect:</strong>
            <ol>
              <li>Open WhatsApp on your phone</li>
              <li>Go to Settings → Linked Devices</li>
              <li>Tap "Link a Device"</li>
              <li>Scan the QR code above</li>
            </ol>
          </div>
        </div>

        <script>
          let refreshInterval;
          let statusCheckInterval;

          async function fetchQR() {
            try {
              const res = await fetch('/whatsapp/qrcode');
              const data = await res.json();
              const statusDiv = document.getElementById('status');
              const qrImage = document.getElementById('qrImage');
              const instructions = document.getElementById('instructions');
              
              if (data.status === 'qr' && data.qr) {
                statusDiv.innerHTML = '<strong>Scan this QR code in WhatsApp → Linked Devices</strong>';
                qrImage.src = data.qr;
                qrImage.classList.add('show');
                instructions.style.display = 'block';
                document.getElementById('restartBtn').style.display = 'none';
              } else {
                // Check client status
                await checkClientStatus();
              }
            } catch (err) {
              document.getElementById('status').innerHTML = 
                '<div class="error">Error fetching QR code: ' + err.message + '</div>';
              console.error('QR fetch error:', err);
            }
          }

          async function checkClientStatus() {
            try {
              const res = await fetch('/whatsapp/status');
              const status = await res.json();
              const statusDiv = document.getElementById('status');
              const clientStatusDiv = document.getElementById('clientStatus');
              const qrImage = document.getElementById('qrImage');
              const restartBtn = document.getElementById('restartBtn');
              
              let statusHtml = '';
              let clientStatusHtml = '';

              if (status.isClientReady) {
                statusDiv.innerHTML = '<div class="success">✅ WhatsApp client is connected and ready!</div>';
                qrImage.style.display = 'none';
                restartBtn.style.display = 'none';
                clientStatusHtml = 'Status: Ready | Authenticated: ' + (status.isClientAuthenticated ? 'Yes' : 'No');
              } else if (status.status === 'waiting_for_qr_scan') {
                statusDiv.innerHTML = '<span class="loading"></span>Waiting for QR code generation...';
                clientStatusHtml = 'Status: Initializing | Web Helpers: ' + (status.webHelpersInjected ? 'Injected' : 'Not injected');
                restartBtn.style.display = 'block';
              } else if (status.status === 'authenticated_but_not_ready') {
                statusDiv.innerHTML = '<span class="loading"></span>Authenticated, initializing...';
                clientStatusHtml = 'Status: Authenticated | Ready: No';
                restartBtn.style.display = 'block';
              } else if (status.status === 'initializing') {
                statusDiv.innerHTML = '<span class="loading"></span>Initializing WhatsApp client...';
                clientStatusHtml = 'Status: Initializing';
                restartBtn.style.display = 'block';
              } else {
                statusDiv.innerHTML = '<span class="loading"></span>Waiting for QR code...';
                clientStatusHtml = 'Status: ' + status.status + ' | Initialized: ' + (status.isClientInitialized ? 'Yes' : 'No');
                restartBtn.style.display = 'block';
              }

              clientStatusDiv.innerHTML = clientStatusHtml;
            } catch (err) {
              console.error('Status check error:', err);
            }
          }

          async function restartClient() {
            const btn = document.getElementById('restartBtn');
            btn.disabled = true;
            btn.textContent = 'Restarting...';
            
            try {
              const res = await fetch('/whatsapp/restart', { method: 'POST' });
              const data = await res.json();
              document.getElementById('status').innerHTML = 
                '<div class="success">Client restart initiated. Waiting for QR code...</div>';
              setTimeout(() => {
                fetchQR();
                checkClientStatus();
              }, 3000);
            } catch (err) {
              document.getElementById('status').innerHTML = 
                '<div class="error">Error restarting client: ' + err.message + '</div>';
            } finally {
              btn.disabled = false;
              btn.textContent = 'Restart Client';
            }
          }

          // Initial fetch
          fetchQR();
          checkClientStatus();
          
          // Set up intervals
          refreshInterval = setInterval(fetchQR, 3000); // Check QR every 3 seconds
          statusCheckInterval = setInterval(checkClientStatus, 5000); // Check status every 5 seconds

          // Clean up on page unload
          window.addEventListener('beforeunload', () => {
            if (refreshInterval) clearInterval(refreshInterval);
            if (statusCheckInterval) clearInterval(statusCheckInterval);
          });
        </script>
      </body>
      </html>
    `);
  }
}
