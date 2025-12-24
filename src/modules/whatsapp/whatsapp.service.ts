import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as QRCode from 'qrcode';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(WhatsAppService.name);
  private qrCodeData: string | null = null; // Store latest QR code
  private isClientReady: boolean = false; // Track client readiness
  private isClientAuthenticated: boolean = false; // Track client authentication
  private webHelpersInjected: boolean = false; // Track if WhatsApp Web helpers are injected
  private initializationAttempts: number = 0; // Track initialization attempts
  private maxInitializationAttempts: number = 5; // Maximum retry attempts
  private initializationRetryTimeout: NodeJS.Timeout | null = null; // Retry timeout reference

  // Webhook configuration
  private webhookConfig: {
    url: string;
    method: string;
    apiKey?: string;
    timeout: number;
  } | null = null;

  // Media cache configuration
  private mediaCache: Map<
    string,
    {
      media: MessageMedia;
      timestamp: number;
      url: string;
    }
  > = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached items

  constructor(private configService: ConfigService) {}

  /**
   * Recursively find and remove lock files
   */
  private removeLockFilesRecursive(dir: string, depth: number = 0): void {
    if (depth > 5) return; // Prevent infinite recursion

    try {
      if (!fs.existsSync(dir)) {
        return;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        try {
          // Check if it's a lock file
          const isLockFile =
            entry.name.toLowerCase().includes('lock') ||
            entry.name === 'SingletonLock' ||
            entry.name === 'lockfile' ||
            entry.name.startsWith('.lock');

          if (isLockFile && entry.isFile()) {
            this.logger.warn(`Removing Chromium lock file: ${fullPath}`);
            try {
              fs.unlinkSync(fullPath);
            } catch (unlinkError: any) {
              // Try to force remove by changing permissions first
              if (
                unlinkError.code === 'EACCES' ||
                unlinkError.code === 'EPERM'
              ) {
                try {
                  fs.chmodSync(fullPath, 0o666);
                  fs.unlinkSync(fullPath);
                  this.logger.warn(`Force removed lock file: ${fullPath}`);
                } catch (forceError: any) {
                  this.logger.debug(
                    `Could not force remove lock file ${fullPath}: ${forceError.message}`,
                  );
                }
              } else if (unlinkError.code !== 'ENOENT') {
                this.logger.debug(
                  `Could not remove lock file ${fullPath}: ${unlinkError.message}`,
                );
              }
            }
          } else if (entry.isDirectory()) {
            // Recursively search subdirectories
            this.removeLockFilesRecursive(fullPath, depth + 1);
          }
        } catch (entryError: any) {
          // Skip entries we can't read
          if (entryError.code !== 'EACCES' && entryError.code !== 'EPERM') {
            this.logger.debug(
              `Error processing entry ${fullPath}: ${entryError.message}`,
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.debug(`Error reading directory ${dir}: ${error.message}`);
    }
  }

  /**
   * Kill any lingering Chromium processes
   */
  private async killChromiumProcesses(): Promise<void> {
    try {
      this.logger.warn('Killing any lingering Chromium processes...');

      // Kill chromium processes
      try {
        await execAsync('pkill -9 chromium || true');
        await execAsync('pkill -9 chrome || true');
        await execAsync('pkill -9 chromium-browser || true');
        // Wait a bit for processes to die
        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.logger.log('Chromium processes killed');
      } catch (error: any) {
        // Ignore errors if no processes found
        this.logger.debug(`No Chromium processes to kill: ${error.message}`);
      }
    } catch (error: any) {
      this.logger.debug(`Error killing Chromium processes: ${error.message}`);
    }
  }

  /**
   * Clean up Chromium lock files that may prevent browser launch
   */
  private async cleanupChromiumLocks(): Promise<void> {
    try {
      // First, kill any lingering processes
      await this.killChromiumProcesses();

      const sessionPath = path.resolve('./whatsapp-session');
      if (!fs.existsSync(sessionPath)) {
        return;
      }

      this.logger.warn('Cleaning up Chromium lock files...');

      // Recursively remove all lock files
      this.removeLockFilesRecursive(sessionPath);

      // Also specifically check common locations with more paths
      const commonLockPaths = [
        'SingletonLock',
        'lockfile',
        '.lock',
        'SingletonCookie',
        'Default/SingletonLock',
        'Default/lockfile',
        'Default/.lock',
        'Default/SingletonCookie',
        'Default/Default/SingletonLock',
        'Session Storage/SingletonLock',
        'Local Storage/SingletonLock',
        'IndexedDB/SingletonLock',
        'GPUCache/SingletonLock',
        'Code Cache/SingletonLock',
      ];

      // Also find and remove any file containing "lock" in the name
      try {
        const findLockFiles = await execAsync(
          `find "${sessionPath}" -type f -iname "*lock*" -o -iname "*singleton*" 2>/dev/null || true`,
        );
        const foundLocks = findLockFiles.stdout
          .split('\n')
          .filter((line) => line.trim() && fs.existsSync(line.trim()));
        for (const lockFile of foundLocks) {
          try {
            this.logger.warn(`Removing found lock file: ${lockFile.trim()}`);
            await execAsync(`rm -f "${lockFile.trim()}"`);
          } catch {
            // Ignore
          }
        }
      } catch {
        // Ignore errors
      }

      // Try multiple times to ensure locks are removed
      for (let attempt = 0; attempt < 3; attempt++) {
        for (const lockFile of commonLockPaths) {
          const lockPath = path.join(sessionPath, lockFile);
          try {
            if (fs.existsSync(lockPath)) {
              this.logger.warn(`Removing Chromium lock file: ${lockPath}`);
              try {
                // Try to read and remove
                const stats = fs.statSync(lockPath);
                if (stats.isFile()) {
                  fs.chmodSync(lockPath, 0o666); // Make writable first
                  fs.unlinkSync(lockPath);
                  this.logger.log(`Removed lock file: ${lockPath}`);
                }
              } catch (error: any) {
                if (error.code !== 'ENOENT') {
                  this.logger.debug(
                    `Could not remove lock file ${lockPath}: ${error.message}`,
                  );
                  // Try force removal
                  try {
                    await execAsync(`rm -f "${lockPath}"`);
                  } catch {
                    // Ignore
                  }
                }
              }
            }
          } catch {
            // Ignore errors
          }
        }

        // Wait between attempts
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Force remove any remaining lock files using find and rm
      try {
        await execAsync(
          `find "${sessionPath}" -type f \\( -name "*lock*" -o -name "*Lock*" -o -name "*singleton*" -o -name "*Singleton*" \\) -delete 2>/dev/null || true`,
        );
        await execAsync(
          `find "${sessionPath}" -type d -name "*lock*" -exec rm -rf {} + 2>/dev/null || true`,
        );
      } catch {
        // Ignore errors
      }

      // Wait longer to ensure file system operations complete and sync
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Force filesystem sync
      try {
        await execAsync('sync');
      } catch {
        // Ignore if sync command not available
      }

      this.logger.log('Chromium lock file cleanup completed');
    } catch (error: any) {
      this.logger.warn(`Error cleaning up Chromium locks: ${error.message}`);
    }
  }

  /**
   * Bypass Content Security Policy to allow script injection
   */
  private async bypassCSP(): Promise<void> {
    try {
      // Access the internal puppeteer page from whatsapp-web.js client
      const clientAny = this.client as any;
      const page = clientAny.pupPage;

      if (page && !page.isClosed()) {
        // Set bypass CSP on the page
        await page.setBypassCSP(true);

        // Inject script to modify CSP meta tag if it exists
        await page.evaluateOnNewDocument(() => {
          // Remove CSP meta tags
          const metaTags = document.querySelectorAll(
            'meta[http-equiv="Content-Security-Policy"]',
          );
          metaTags.forEach((tag) => tag.remove());

          // Override CSP by modifying the meta tag
          const meta = document.createElement('meta');
          meta.httpEquiv = 'Content-Security-Policy';
          meta.content =
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';";
          document.head.appendChild(meta);

          // Override eval to allow script evaluation
          const originalEval = (window as any).eval;
          (window as any).eval = function (code: string) {
            return originalEval.call(window, code);
          };
        });

        this.logger.log('CSP bypass configured successfully');
      }
    } catch (error: any) {
      // Log but don't fail - CSP bypass is optional
      this.logger.debug(`Could not bypass CSP: ${error.message}`);
    }
  }

  /**
   * Generate a cache key for a media URL
   */
  private getCacheKey(url: string): string {
    // Use URL as key, but normalize it (remove query parameters for better cache hits)
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url; // Fallback to original URL if parsing fails
    }
  }

  /**
   * Get cached media if available and not expired
   */
  private getCachedMedia(url: string): MessageMedia | null {
    const cacheKey = this.getCacheKey(url);
    const cached = this.mediaCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache entry is expired
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.mediaCache.delete(cacheKey);
      this.logger.log(`Cache expired for media: ${url}`);
      return null;
    }

    this.logger.log(`Using cached media: ${url}`);
    return cached.media;
  }

  /**
   * Cache media for future use
   */
  private setCachedMedia(url: string, media: MessageMedia): void {
    const cacheKey = this.getCacheKey(url);

    // Check cache size limit
    if (this.mediaCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry (FIFO)
      const oldestKey = this.mediaCache.keys().next().value;
      this.mediaCache.delete(oldestKey);
      this.logger.log(
        `Cache limit reached, removed oldest entry: ${oldestKey}`,
      );
    }

    this.mediaCache.set(cacheKey, {
      media,
      timestamp: Date.now(),
      url,
    });

    this.logger.log(
      `Cached media: ${url} (cache size: ${this.mediaCache.size})`,
    );
  }

  /**
   * Clear expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, cached] of this.mediaCache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.mediaCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.log(`Cleaned ${removedCount} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  private getCacheStats(): { size: number; maxSize: number; duration: number } {
    return {
      size: this.mediaCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      duration: this.CACHE_DURATION,
    };
  }

  private async testWebHelpers(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Wait a bit for web helpers to be fully injected
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Try to get a simple chat to test if helpers are working
      // Use a timeout to avoid hanging
      const chats = await Promise.race([
        this.client.getChats(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000),
        ),
      ]);

      const isValid = Array.isArray(chats);
      if (isValid) {
        this.logger.log(`Web helpers test passed: Found ${chats.length} chats`);
      }
      return isValid;
    } catch (error: any) {
      // Log more details about the error
      const errorMsg = error.message || String(error);
      this.logger.warn(`Web helpers test failed: ${errorMsg}`);

      // Additional debugging information
      if (
        errorMsg.includes('getChats') ||
        errorMsg.includes('Evaluation failed') ||
        errorMsg.includes('Timeout')
      ) {
        this.logger.warn(
          'WhatsApp Web helpers may not be fully injected yet. Will retry automatically.',
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
    // If web helpers are already marked as injected, skip the test
    if (this.webHelpersInjected) {
      return;
    }

    // Try to test web helpers, but don't fail immediately if they're not ready
    // This allows operations to proceed even if helpers are still initializing
    const helpersWorking = await this.testWebHelpers();
    if (helpersWorking) {
      this.webHelpersInjected = true;
      this.logger.log('Web helpers verified and working');
    } else {
      // Don't throw error, just log a warning
      // Some operations may still work even if helpers aren't fully ready
      this.logger.warn(
        'Web helpers test failed, but continuing. Some features may be limited.',
      );
    }
  }

  /**
   * Safely cleanup client without throwing errors
   */
  private async cleanupClientSafely(): Promise<void> {
    try {
      if (this.client) {
        const clientAny = this.client as any;
        // Check if client has a valid puppeteer instance before destroying
        if (clientAny.pupPage && !clientAny.pupPage.isClosed()) {
          try {
            await this.client.destroy();
            this.logger.log('Client destroyed safely');
          } catch (destroyError: any) {
            // Ignore errors about already destroyed clients
            if (
              !destroyError.message?.includes('Target closed') &&
              !destroyError.message?.includes('Session closed') &&
              !destroyError.message?.includes(
                'Execution context was destroyed',
              ) &&
              !destroyError.message?.includes('Cannot read properties of null')
            ) {
              this.logger.warn(
                `Error destroying client: ${destroyError.message}`,
              );
            }
          }
        }
      }
      this.client = null;
      this.isClientReady = false;
      this.isClientAuthenticated = false;
      this.webHelpersInjected = false;
      this.qrCodeData = null;
    } catch (error: any) {
      this.logger.warn(`Error during client cleanup: ${error.message}`);
    }
  }

  async onModuleInit() {
    this.logger.log('Initializing WhatsApp Client...');

    // Initialize webhook configuration from environment variables
    this.initializeWebhookFromEnv();

    // ✅ REGLA DE ORO: Limpiar locks de Chromium al iniciar el módulo
    await this.cleanupChromiumLocks();

    // Set up global error handler to prevent process crashes
    process.on('uncaughtException', (error: Error) => {
      if (
        error.message?.includes('Execution context was destroyed') ||
        error.message?.includes('Target closed') ||
        error.message?.includes('Session closed')
      ) {
        this.logger.warn(
          `Uncaught error (likely from destroyed context): ${error.message}. Will attempt to reinitialize...`,
        );
        // Don't crash, just reinitialize
        this.cleanupClientSafely().then(() => {
          setTimeout(() => {
            this.initializeClientWithRetry();
          }, 5000);
        });
      } else {
        // For other uncaught errors, log and let it crash (or handle as needed)
        this.logger.error(`Uncaught exception: ${error.message}`, error.stack);
      }
    });

    // Start initialization with retry logic
    this.initializeClientWithRetry();
  }

  private async initializeClientWithRetry() {
    this.initializationAttempts++;

    if (this.initializationAttempts > this.maxInitializationAttempts) {
      this.logger.error(
        `Failed to initialize WhatsApp client after ${this.maxInitializationAttempts} attempts. Please check the logs and restart the service.`,
      );
      return;
    }

    if (this.initializationAttempts > 1) {
      const delay = Math.min(
        1000 * Math.pow(2, this.initializationAttempts - 2),
        30000,
      ); // Exponential backoff, max 30s
      this.logger.warn(
        `Retrying WhatsApp client initialization (attempt ${this.initializationAttempts}/${this.maxInitializationAttempts}) in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      // Clean up previous client if it exists
      if (this.client) {
        try {
          // Check if client has a valid puppeteer instance before destroying
          const clientAny = this.client as any;
          if (clientAny.pupPage && !clientAny.pupPage.isClosed()) {
            await this.client.destroy();
          } else {
            this.logger.warn(
              'Client already destroyed or invalid, skipping destroy',
            );
          }
        } catch (destroyError: any) {
          // Ignore errors about already destroyed clients
          if (
            !destroyError.message?.includes('Target closed') &&
            !destroyError.message?.includes('Session closed') &&
            !destroyError.message?.includes('Cannot read properties of null')
          ) {
            this.logger.warn(
              `Error destroying previous client: ${destroyError.message}`,
            );
          }
        } finally {
          // Set to null after cleanup attempt
          this.client = null as any;
        }
      }

      // Clean up Chromium lock files before initializing
      await this.cleanupChromiumLocks();

      // Wait longer to ensure any lingering processes are gone and file system is ready
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Reset state flags
      this.isClientReady = false;
      this.isClientAuthenticated = false;
      this.webHelpersInjected = false;
      this.qrCodeData = null;

      // ✅ REGLA DE ORO: Directorio dedicado para sesión de WhatsApp
      // LocalAuth maneja su propio userDataDir automáticamente
      // NO podemos especificar userDataDir en Puppeteer (incompatible con LocalAuth)
      const sessionPath = path.resolve('./whatsapp-session');

      // ✅ REGLA DE ORO: Crear directorio si no existe
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      // ✅ REGLA DE ORO: Log para validar configuración
      // LocalAuth creará el perfil de Chromium dentro de sessionPath automáticamente
      // Esto evita usar el perfil default (/root/.config/chromium)
      this.logger.log(`Using WhatsApp session path: ${sessionPath}`);
      this.logger.log(
        'LocalAuth will manage Chromium profile automatically (not using default /root/.config/chromium)',
      );

      this.logger.log('Creating WhatsApp Client instance...');
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: sessionPath }),
        puppeteer: {
          executablePath:
            process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
          // ⚠️ NO usar userDataDir aquí - LocalAuth lo maneja automáticamente
          // ⚠️ NO usar --user-data-dir como argumento - LocalAuth lo gestiona internamente
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor,IsolateOrigins,site-per-process',
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
            '--single-process', // Run in single process mode to avoid context issues
            '--disable-extensions',
            '--disable-plugins',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-site-isolation-trials', // Disable site isolation to allow script injection
            '--disable-breakpad', // Disable crash reporting
            '--disable-component-update', // Disable component updates
            '--disable-background-downloads', // Disable background downloads
            '--disable-client-side-phishing-detection', // Disable phishing detection
            '--disable-datasaver-prompt', // Disable data saver prompt
            '--disable-domain-reliability', // Disable domain reliability
            '--disable-features=TranslateUI', // Disable translate UI
            '--disable-ipc-flooding-protection', // Already present but keep for emphasis
            '--disable-notifications', // Disable notifications
            '--disable-reading-from-canvas', // Disable canvas reading
            '--disable-remote-fonts', // Disable remote fonts
            '--disable-speech-api', // Disable speech API
            '--disable-suggestions-ui', // Disable suggestions UI
            '--disable-web-resources', // Disable web resources
            '--force-color-profile=srgb', // Force color profile
            '--hide-scrollbars', // Hide scrollbars
            '--mute-audio', // Mute audio
            '--no-pings', // Disable pings
            '--noerrdialogs', // No error dialogs
            '--disable-infobars', // Disable info bars
          ],
          headless: true,
          timeout: 60000, // 60 second timeout
          ignoreHTTPSErrors: true,
        },
      });

      // Set up event handlers BEFORE initializing
      this.setupClientEventHandlers();

      // Initialize the client
      this.logger.log('Starting WhatsApp client initialization...');
      await this.client.initialize();
      this.logger.log(
        'WhatsApp client initialization completed (waiting for QR or authentication)...',
      );

      // Reset attempts on successful initialization
      this.initializationAttempts = 0;
    } catch (error) {
      this.logger.error(
        `Error initializing WhatsApp client (attempt ${this.initializationAttempts}/${this.maxInitializationAttempts}): ${error.message}`,
      );

      // Check if it's a protocol error or profile lock error that we should retry
      const isProtocolError =
        error.message?.includes('Protocol error') ||
        error.message?.includes('Execution context was destroyed') ||
        error.message?.includes('Target closed') ||
        error.message?.includes('Session closed');

      const isProfileLockError =
        error.message?.includes('profile appears to be in use') ||
        error.message?.includes('another Chromium process') ||
        error.message?.includes('Failed to launch the browser process');

      if (isProtocolError || isProfileLockError) {
        this.logger.warn(
          `${isProfileLockError ? 'Profile lock' : 'Protocol'} error detected. This is usually temporary. Will retry...`,
        );
        // Clean up locks again before retry
        if (isProfileLockError) {
          await this.cleanupChromiumLocks();
        }
        // Schedule retry
        this.initializationRetryTimeout = setTimeout(() => {
          this.initializeClientWithRetry();
        }, 5000);
      } else {
        // For other errors, retry with exponential backoff
        this.initializationRetryTimeout = setTimeout(
          () => {
            this.initializeClientWithRetry();
          },
          Math.min(1000 * Math.pow(2, this.initializationAttempts), 30000),
        );
      }
    }
  }

  private setupClientEventHandlers() {
    // Log when client starts loading
    this.client.on('loading_screen', (percent, message) => {
      this.logger.log(
        `WhatsApp loading: ${percent}% - ${message || 'Loading...'}`,
      );
    });

    this.client.on('qr', async (qr) => {
      this.logger.warn('QR Code received. Scan with your phone.');

      try {
        // Save raw QR
        this.qrCodeData = await QRCode.toDataURL(qr); // Convert to Base64 image
        this.logger.log('QR Code generated and stored successfully');

        // Also log to terminal (optional)
        qrcode.generate(qr, { small: true });
      } catch (error) {
        this.logger.error(`Error generating QR code: ${error.message}`);
      }
    });

    this.client.on('ready', async () => {
      // Check if client still exists and is valid before proceeding
      if (!this.client) {
        this.logger.warn(
          'Ready event received but client is null, ignoring...',
        );
        return;
      }

      try {
        this.logger.log('WhatsApp Client is ready!');
        this.qrCodeData = null; // No QR needed anymore
        this.isClientReady = true; // Mark client as ready
        this.initializationAttempts = 0; // Reset attempts on success

        // Bypass CSP after client is ready (with error handling)
        try {
          await this.bypassCSP();
        } catch (cspError: any) {
          // Don't fail if CSP bypass fails
          if (
            !cspError.message?.includes('Execution context was destroyed') &&
            !cspError.message?.includes('Target closed')
          ) {
            this.logger.warn(`CSP bypass failed: ${cspError.message}`);
          }
        }

        // Wait a bit for everything to settle, then test web helpers
        // This gives time for web helpers to be fully injected
        setTimeout(async () => {
          // Check again if client still exists
          if (!this.client || !this.isClientReady) {
            this.logger.warn(
              'Client no longer valid when testing web helpers, skipping...',
            );
            return;
          }

          try {
            this.logger.log('Testing web helpers after client ready...');
            let retries = 0;
            const maxRetries = 5;

            while (retries < maxRetries && !this.webHelpersInjected) {
              // Check client validity before each test
              if (!this.client || !this.isClientReady) {
                this.logger.warn(
                  'Client became invalid during web helpers test',
                );
                break;
              }

              const helpersWorking = await this.testWebHelpers();
              if (helpersWorking) {
                this.webHelpersInjected = true;
                this.logger.log('Web helpers are working correctly!');
                break;
              } else {
                retries++;
                if (retries < maxRetries) {
                  this.logger.warn(
                    `Web helpers test failed (attempt ${retries}/${maxRetries}). Retrying in 3 seconds...`,
                  );
                  await new Promise((resolve) => setTimeout(resolve, 3000));
                } else {
                  this.logger.warn(
                    'Web helpers test failed after all retries. Some features may not work correctly.',
                  );
                }
              }
            }
          } catch (error: any) {
            // Don't let errors in web helpers test crash the system
            if (
              !error.message?.includes('Execution context was destroyed') &&
              !error.message?.includes('Target closed')
            ) {
              this.logger.warn(`Error testing web helpers: ${error.message}`);
            }
          }
        }, 2000); // Wait 2 seconds after ready event
      } catch (error: any) {
        // Catch any errors in the ready handler
        if (
          error.message?.includes('Execution context was destroyed') ||
          error.message?.includes('Target closed')
        ) {
          this.logger.warn(
            `Context destroyed during ready event: ${error.message}`,
          );
        } else {
          this.logger.error(`Error in ready event handler: ${error.message}`);
        }
      }
    });

    this.client.on('authenticating', () => {
      this.logger.log(
        'WhatsApp Client is authenticating (using saved session)...',
      );
      // Clear QR code if we're authenticating (means we have a saved session)
      this.qrCodeData = null;
    });

    this.client.on('authenticated', async () => {
      this.logger.log('WhatsApp Client authenticated successfully!');
      this.isClientAuthenticated = true; // Mark client as authenticated
      this.qrCodeData = null; // Clear QR code after authentication

      // Try to bypass CSP early after authentication
      await this.bypassCSP();
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('Authentication failed:', msg);
      this.isClientReady = false; // Mark client as not ready
      this.isClientAuthenticated = false; // Mark client as not authenticated
      this.qrCodeData = null; // Clear QR code on auth failure
    });

    this.client.on('disconnected', (reason) => {
      const reasonStr = String(reason);
      this.logger.warn(`WhatsApp Client disconnected: ${reasonStr}`);
      this.isClientReady = false;
      this.isClientAuthenticated = false;
      this.webHelpersInjected = false;
      this.qrCodeData = null;

      // Handle LOGOUT specifically - session was closed, need to clean up and reinitialize
      if (reasonStr === 'LOGOUT') {
        this.logger.warn(
          'WhatsApp session was logged out. This may require a new QR code scan.',
        );

        // Clear any existing retry timeout
        if (this.initializationRetryTimeout) {
          clearTimeout(this.initializationRetryTimeout);
          this.initializationRetryTimeout = null;
        }

        // Clean up the client properly before reinitializing
        this.cleanupClientSafely().then(() => {
          // Wait a bit before reinitializing to allow cleanup to complete
          setTimeout(() => {
            this.logger.log('Reinitializing after LOGOUT...');
            this.initializeClientWithRetry();
          }, 3000);
        });
      } else if (
        // Attempt to reconnect if it was an unexpected disconnect
        reasonStr === 'NAVIGATION' ||
        reasonStr === 'CONNECTION_CLOSED' ||
        reasonStr.includes('CLOSED')
      ) {
        this.logger.log('Attempting to reconnect...');
        setTimeout(() => {
          this.initializeClientWithRetry();
        }, 5000);
      }
    });

    // Handle protocol errors and other errors
    this.client.on('error', (error) => {
      this.logger.error(`WhatsApp Client error: ${error.message}`);

      // Check if it's a protocol error that requires reinitialization
      if (
        error.message?.includes('Protocol error') ||
        error.message?.includes('Execution context was destroyed') ||
        error.message?.includes('Target closed') ||
        error.message?.includes('Session closed')
      ) {
        this.logger.warn(
          'Protocol error detected. Will attempt to reinitialize...',
        );
        this.isClientReady = false;
        this.webHelpersInjected = false;

        // Clear any existing retry timeout
        if (this.initializationRetryTimeout) {
          clearTimeout(this.initializationRetryTimeout);
        }

        // Retry initialization after a delay
        this.initializationRetryTimeout = setTimeout(() => {
          this.initializeClientWithRetry();
        }, 10000);
      }
    });

    // Listen for incoming messages
    this.client.on('message', async (message) => {
      await this.handleIncomingMessage(message);
    });
  }

  private async handleIncomingMessage(message: any) {
    try {
      // Skip messages from self
      if (message.fromMe) {
        return;
      }

      // Get sender information
      const sender = message.from;
      let senderContact: any = null;
      let isRegisteredContact = false;

      // Try to get contact information, but handle errors gracefully
      try {
        senderContact = await this.client.getContactById(sender);
        // Check if sender is a registered contact (has name or pushname)
        isRegisteredContact = Boolean(
          senderContact?.name || senderContact?.pushname,
        );
      } catch (contactError) {
        // Handle known WhatsApp Web API compatibility issues
        if (
          contactError.message?.includes('getIsMyContact') ||
          contactError.message?.includes('ContactMethods') ||
          contactError.message?.includes('getContactModel') ||
          contactError.message?.includes('getContact')
        ) {
          this.logger.warn(
            `Unable to retrieve contact info for ${sender} due to WhatsApp Web API changes. Using fallback contact data.`,
          );
          // Create a minimal contact object from message data
          senderContact = {
            id: {
              _serialized: sender,
              user: sender.replace('@c.us', ''),
            },
            pushname: message.notifyName || null,
            name: null,
            isBusiness: false,
            isVerified: false,
          };
          // Assume it's not a registered contact if we can't verify
          isRegisteredContact = false;
        } else {
          // Re-throw if it's a different error
          throw contactError;
        }
      }

      // If unknown contact, try to save it (but don't fail if this fails)
      if (!isRegisteredContact && senderContact) {
        try {
          await this.saveUnknownContact(senderContact);
        } catch (saveError) {
          this.logger.warn(
            `Failed to save unknown contact ${sender}: ${saveError.message}`,
          );
        }
      }

      // Forward to webhook if configured (for ALL contacts)
      if (this.webhookConfig && senderContact) {
        try {
          await this.forwardToWebhook(
            message,
            senderContact,
            isRegisteredContact,
          );
        } catch (webhookError) {
          this.logger.error(
            `Failed to forward message to webhook: ${webhookError.message}`,
          );
        }
      } else {
        // Log messages when no webhook is configured
        const contactName =
          senderContact?.name ||
          senderContact?.pushname ||
          message.notifyName ||
          'Unknown';
        if (!isRegisteredContact) {
          this.logger.warn(
            `Message from unknown contact ${sender} (${contactName}): ${message.body}`,
          );
        } else {
          this.logger.log(
            `Message from registered contact ${contactName} (${sender}): ${message.body}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error handling incoming message: ${error.message}`);
      // Log the full error stack for debugging
      if (error.stack) {
        this.logger.debug(`Error stack: ${error.stack}`);
      }
    }
  }

  private async saveUnknownContact(senderContact: any) {
    try {
      // Only try to save if web helpers are ready
      if (!this.webHelpersInjected) {
        this.logger.debug(
          'Skipping auto-save of unknown contact: web helpers not ready yet',
        );
        return;
      }

      const phone =
        senderContact.id?.user ||
        senderContact.id?._serialized?.replace('@c.us', '');
      if (!phone) {
        this.logger.warn(
          'Cannot auto-save contact: phone number not available',
        );
        return;
      }

      const pushname = senderContact.pushname || 'Unknown';

      // Try to validate and save, but don't fail if it doesn't work
      // This is just a convenience feature, not critical
      try {
        await this.saveContact(
          phone,
          pushname,
          'Auto-saved from incoming message',
        );
        this.logger.log(`Auto-saved unknown contact: ${pushname} (${phone})`);
      } catch (validationError: any) {
        // If validation fails (e.g., contact doesn't exist in WhatsApp),
        // just log it as debug info, don't treat it as an error
        this.logger.debug(
          `Could not validate/save contact ${phone}: ${validationError.message}`,
        );
      }
    } catch (error: any) {
      // Log as debug instead of error since this is non-critical
      this.logger.debug(`Error auto-saving unknown contact: ${error.message}`);
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

      // Try to get contact, but handle errors gracefully
      let contact;
      let contactName = name || 'Unknown';

      try {
        contact = await this.client.getContactById(formattedPhone);
        // Get contact name if available
        if (contact) {
          contactName = contact.name || contact.pushname || contactName;
        }
      } catch (contactError: any) {
        // If getContactById fails, it might be because:
        // 1. Contact doesn't exist in WhatsApp
        // 2. Web helpers aren't fully ready
        // 3. API changes in WhatsApp Web

        const errorMsg = contactError.message || String(contactError);

        if (errorMsg.includes('not found') || errorMsg.includes('404')) {
          throw new Error(
            `CONTACT_NOT_FOUND: Contact with phone ${phone} not found.`,
          );
        }

        // For other errors (like "Evaluation failed"), log but don't fail
        // if we have a name provided
        if (name) {
          this.logger.warn(
            `Could not validate contact ${formattedPhone}, but using provided name: ${name}`,
          );
          // Continue with the provided name
        } else {
          // If no name provided and we can't get contact info, throw error
          throw new Error(
            `CONTACT_VALIDATION_ERROR: Could not validate contact: ${errorMsg}`,
          );
        }
      }

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
    } catch (error: any) {
      this.logger.error(`Error validating contact: ${error.message}`);

      // Re-throw if it's already a formatted error
      if (
        error.message.includes('CONTACT_NOT_FOUND') ||
        error.message.includes('CONTACT_VALIDATION_ERROR')
      ) {
        throw error;
      }

      // Format other errors
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
      // Provide more diagnostic information
      const hasClient = !!this.client;
      const isReady = this.isClientReady;
      const isAuthenticated = this.isClientAuthenticated;
      const attempts = this.initializationAttempts;

      let message = 'No QR code available at this moment';
      if (!hasClient) {
        message += ' (Client not initialized)';
      } else if (isReady) {
        message = 'Client is already connected (no QR needed)';
      } else if (isAuthenticated) {
        message = 'Client is authenticated, waiting to be ready';
      } else if (attempts > this.maxInitializationAttempts) {
        message = 'Client initialization failed after maximum attempts';
      } else {
        message += ` (Initialization in progress, attempt ${attempts}/${this.maxInitializationAttempts})`;
      }

      return {
        status: 'no_qr',
        message,
        diagnostic: {
          hasClient,
          isReady,
          isAuthenticated,
          attempts,
          maxAttempts: this.maxInitializationAttempts,
        },
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

    // Clear any pending retry timeout
    if (this.initializationRetryTimeout) {
      clearTimeout(this.initializationRetryTimeout);
      this.initializationRetryTimeout = null;
    }

    // Reset all state flags
    this.isClientReady = false;
    this.isClientAuthenticated = false;
    this.webHelpersInjected = false;
    this.qrCodeData = null;
    this.initializationAttempts = 0; // Reset attempts counter

    // Destroy existing client
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (error: any) {
        this.logger.warn(
          `Error destroying client during restart: ${error.message}`,
        );
      } finally {
        this.client = null as any;
      }
    }

    // Kill any lingering Chromium processes
    await this.killChromiumProcesses();

    // Clean up Chromium lock files before restarting
    await this.cleanupChromiumLocks();

    // Wait a bit before reinitializing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Reinitialize client with retry logic
    this.initializeClientWithRetry();
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

        // Create MessageMedia object for proper image display with caching
        let media = this.getCachedMedia(mediaUrl);

        if (!media) {
          this.logger.log(`Downloading media from URL: ${mediaUrl}`);
          media = (await Promise.race([
            MessageMedia.fromUrl(mediaUrl),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Media download timeout')),
                30000,
              ),
            ),
          ])) as MessageMedia;

          // Cache the downloaded media
          this.setCachedMedia(mediaUrl, media);
        }

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

      // Create MessageMedia object for proper image display with caching
      let media = this.getCachedMedia(mediaUrl);

      if (!media) {
        this.logger.log(`Downloading media from URL: ${mediaUrl}`);
        media = (await Promise.race([
          MessageMedia.fromUrl(mediaUrl),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Media download timeout')),
              30000,
            ),
          ),
        ])) as MessageMedia;

        // Cache the downloaded media
        this.setCachedMedia(mediaUrl, media);
      }

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

      // Download media from URL with caching
      let media = this.getCachedMedia(mediaUrl);

      if (!media) {
        this.logger.log(`Downloading media from URL: ${mediaUrl}`);
        media = (await Promise.race([
          MessageMedia.fromUrl(mediaUrl),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Media download timeout')),
              30000,
            ),
          ),
        ])) as MessageMedia;

        // Cache the downloaded media
        this.setCachedMedia(mediaUrl, media);
      }

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

  /**
   * Clear all cached media
   */
  async clearMediaCache() {
    const clearedCount = this.mediaCache.size;
    this.mediaCache.clear();

    this.logger.log(`Cleared ${clearedCount} cached media files`);

    return {
      status: 'success',
      message: 'Media cache cleared successfully',
      clearedCount,
    };
  }

  /**
   * Get media cache statistics
   */
  async getMediaCacheStats() {
    const stats = this.getCacheStats();

    return {
      status: 'success',
      cache: {
        ...stats,
        durationMinutes: Math.round(stats.duration / (1000 * 60)),
      },
    };
  }
}
