import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class WebhookConfigDto {
  @ApiProperty({
    description:
      'External API endpoint URL to forward messages from unknown contacts',
    example: 'https://api.example.com/webhook/whatsapp',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'HTTP method to use for the webhook request',
    example: 'POST',
    default: 'POST',
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({
    description: 'API key or token for authentication (optional)',
    required: false,
    example: 'your-api-key-here',
  })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({
    description: 'Timeout for webhook requests in milliseconds',
    required: false,
    default: 10000,
    example: 10000,
  })
  @IsOptional()
  @IsString()
  timeout?: number;
}
