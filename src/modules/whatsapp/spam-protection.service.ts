import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RateLimitEntry {
  count: number;
  resetAt: number;
  lastMessageAt: number;
}

interface DailyLimitEntry {
  count: number;
  date: string; // YYYY-MM-DD
}

@Injectable()
export class SpamProtectionService {
  private readonly logger = new Logger(SpamProtectionService.name);

  // Rate limiting per phone number
  private phoneRateLimits: Map<string, RateLimitEntry> = new Map();

  // Global rate limiting
  private globalRateLimit: RateLimitEntry = {
    count: 0,
    resetAt: Date.now(),
    lastMessageAt: 0,
  };

  // Daily limits per phone number
  private dailyLimits: Map<string, DailyLimitEntry> = new Map();

  // Blacklist of phone numbers
  private blacklist: Set<string> = new Set();

  // Configuration from environment or defaults
  private readonly config = {
    // Messages per minute per phone number
    messagesPerMinutePerPhone: parseInt(
      this.configService.get<string>('SPAM_MESSAGES_PER_MINUTE_PER_PHONE') ||
        '5',
    ),
    // Messages per hour per phone number
    messagesPerHourPerPhone: parseInt(
      this.configService.get<string>('SPAM_MESSAGES_PER_HOUR_PER_PHONE') ||
        '20',
    ),
    // Messages per day per phone number
    messagesPerDayPerPhone: parseInt(
      this.configService.get<string>('SPAM_MESSAGES_PER_DAY_PER_PHONE') || '50',
    ),
    // Global messages per minute (all phones combined)
    globalMessagesPerMinute: parseInt(
      this.configService.get<string>('SPAM_GLOBAL_MESSAGES_PER_MINUTE') || '30',
    ),
    // Global messages per hour
    globalMessagesPerHour: parseInt(
      this.configService.get<string>('SPAM_GLOBAL_MESSAGES_PER_HOUR') || '200',
    ),
    // Global messages per day
    globalMessagesPerDay: parseInt(
      this.configService.get<string>('SPAM_GLOBAL_MESSAGES_PER_DAY') || '1000',
    ),
    // Minimum delay between messages to same phone (milliseconds)
    minDelayBetweenMessages: parseInt(
      this.configService.get<string>('SPAM_MIN_DELAY_MS') || '2000',
    ),
    // Minimum delay between any messages (milliseconds)
    minDelayBetweenAnyMessages: parseInt(
      this.configService.get<string>('SPAM_MIN_DELAY_ANY_MS') || '1000',
    ),
  };

  constructor(private configService: ConfigService) {
    // Clean up old rate limit entries every 5 minutes
    setInterval(
      () => {
        this.cleanupOldEntries();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Check if sending a message to a phone number is allowed
   * @param phone Phone number in WhatsApp format (e.g., "1234567890@c.us")
   * @returns Object with allowed status and optional delay
   */
  async checkRateLimit(phone: string): Promise<{
    allowed: boolean;
    delay?: number;
    reason?: string;
  }> {
    const normalizedPhone = this.normalizePhone(phone);

    // Check blacklist
    if (this.blacklist.has(normalizedPhone)) {
      return {
        allowed: false,
        reason: 'Phone number is blacklisted',
      };
    }

    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Check per-phone rate limits
    const phoneLimit = this.phoneRateLimits.get(normalizedPhone);
    if (phoneLimit) {
      // Check per-minute limit
      if (now < phoneLimit.resetAt) {
        if (phoneLimit.count >= this.config.messagesPerMinutePerPhone) {
          const waitTime = phoneLimit.resetAt - now;
          return {
            allowed: false,
            delay: waitTime,
            reason: `Rate limit exceeded: ${this.config.messagesPerMinutePerPhone} messages per minute per phone`,
          };
        }
      } else {
        // Reset counter
        phoneLimit.count = 0;
        phoneLimit.resetAt = now + 60000; // Reset in 1 minute
      }

      // Check minimum delay between messages to same phone
      if (
        phoneLimit.lastMessageAt > 0 &&
        now - phoneLimit.lastMessageAt < this.config.minDelayBetweenMessages
      ) {
        const waitTime =
          this.config.minDelayBetweenMessages -
          (now - phoneLimit.lastMessageAt);
        return {
          allowed: false,
          delay: waitTime,
          reason: `Minimum delay not met: ${this.config.minDelayBetweenMessages}ms between messages to same phone`,
        };
      }
    }

    // Check daily limit per phone
    const dailyLimit = this.dailyLimits.get(normalizedPhone);
    if (dailyLimit) {
      if (dailyLimit.date === today) {
        if (dailyLimit.count >= this.config.messagesPerDayPerPhone) {
          return {
            allowed: false,
            reason: `Daily limit exceeded: ${this.config.messagesPerDayPerPhone} messages per day per phone`,
          };
        }
      } else {
        // Reset for new day
        dailyLimit.count = 0;
        dailyLimit.date = today;
      }
    }

    // Check global rate limits
    if (now >= this.globalRateLimit.resetAt) {
      this.globalRateLimit.count = 0;
      this.globalRateLimit.resetAt = now + 60000; // Reset in 1 minute
    }

    if (this.globalRateLimit.count >= this.config.globalMessagesPerMinute) {
      const waitTime = this.globalRateLimit.resetAt - now;
      return {
        allowed: false,
        delay: waitTime,
        reason: `Global rate limit exceeded: ${this.config.globalMessagesPerMinute} messages per minute globally`,
      };
    }

    // Check minimum delay between any messages
    if (
      this.globalRateLimit.lastMessageAt > 0 &&
      now - this.globalRateLimit.lastMessageAt <
        this.config.minDelayBetweenAnyMessages
    ) {
      const waitTime =
        this.config.minDelayBetweenAnyMessages -
        (now - this.globalRateLimit.lastMessageAt);
      return {
        allowed: false,
        delay: waitTime,
        reason: `Minimum delay not met: ${this.config.minDelayBetweenAnyMessages}ms between any messages`,
      };
    }

    // All checks passed
    return { allowed: true };
  }

  /**
   * Record that a message was sent (call this after successful send)
   */
  recordMessageSent(phone: string): void {
    const normalizedPhone = this.normalizePhone(phone);
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Update per-phone rate limit
    let phoneLimit = this.phoneRateLimits.get(normalizedPhone);
    if (!phoneLimit) {
      phoneLimit = {
        count: 0,
        resetAt: now + 60000,
        lastMessageAt: 0,
      };
      this.phoneRateLimits.set(normalizedPhone, phoneLimit);
    }
    phoneLimit.count++;
    phoneLimit.lastMessageAt = now;

    // Update daily limit
    let dailyLimit = this.dailyLimits.get(normalizedPhone);
    if (!dailyLimit || dailyLimit.date !== today) {
      dailyLimit = {
        count: 0,
        date: today,
      };
      this.dailyLimits.set(normalizedPhone, dailyLimit);
    }
    dailyLimit.count++;

    // Update global rate limit
    this.globalRateLimit.count++;
    this.globalRateLimit.lastMessageAt = now;

    this.logger.debug(
      `Message recorded: ${normalizedPhone} (per-phone: ${phoneLimit.count}/min, daily: ${dailyLimit.count}/day, global: ${this.globalRateLimit.count}/min)`,
    );
  }

  /**
   * Add a phone number to blacklist
   */
  addToBlacklist(phone: string): void {
    const normalizedPhone = this.normalizePhone(phone);
    this.blacklist.add(normalizedPhone);
    this.logger.warn(`Phone number added to blacklist: ${normalizedPhone}`);
  }

  /**
   * Remove a phone number from blacklist
   */
  removeFromBlacklist(phone: string): void {
    const normalizedPhone = this.normalizePhone(phone);
    this.blacklist.delete(normalizedPhone);
    this.logger.log(`Phone number removed from blacklist: ${normalizedPhone}`);
  }

  /**
   * Check if a phone number is blacklisted
   */
  isBlacklisted(phone: string): boolean {
    return this.blacklist.has(this.normalizePhone(phone));
  }

  /**
   * Get current rate limit stats for a phone number
   */
  getRateLimitStats(phone?: string): {
    perPhone?: {
      messagesThisMinute: number;
      messagesToday: number;
      resetAt: Date;
    };
    global: {
      messagesThisMinute: number;
      resetAt: Date;
    };
    config: typeof this.config;
  } {
    const stats: any = {
      global: {
        messagesThisMinute: this.globalRateLimit.count,
        resetAt: new Date(this.globalRateLimit.resetAt),
      },
      config: this.config,
    };

    if (phone) {
      const normalizedPhone = this.normalizePhone(phone);
      const phoneLimit = this.phoneRateLimits.get(normalizedPhone);
      const dailyLimit = this.dailyLimits.get(normalizedPhone);
      const today = new Date().toISOString().split('T')[0];

      stats.perPhone = {
        messagesThisMinute: phoneLimit?.count || 0,
        messagesToday:
          dailyLimit && dailyLimit.date === today ? dailyLimit.count : 0,
        resetAt: phoneLimit
          ? new Date(phoneLimit.resetAt)
          : new Date(Date.now() + 60000),
      };
    }

    return stats;
  }

  /**
   * Normalize phone number to consistent format
   */
  private normalizePhone(phone: string): string {
    // Remove @c.us if present and extract just the number
    return phone.replace('@c.us', '').replace(/\D/g, '');
  }

  /**
   * Clean up old rate limit entries
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Remove old per-phone rate limits (older than 1 hour)
    for (const [phone, limit] of this.phoneRateLimits.entries()) {
      if (now > limit.resetAt + 3600000) {
        // 1 hour after reset
        this.phoneRateLimits.delete(phone);
      }
    }

    // Remove old daily limits (not from today)
    for (const [phone, limit] of this.dailyLimits.entries()) {
      if (limit.date !== today) {
        this.dailyLimits.delete(phone);
      }
    }

    this.logger.debug('Cleaned up old rate limit entries');
  }
}
