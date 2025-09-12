import { ApiProperty } from '@nestjs/swagger';

export class WebhookConfigInfoDto {
  @ApiProperty({
    description: 'Webhook URL',
    example: 'https://api.example.com/webhook',
  })
  url: string;

  @ApiProperty({
    description: 'HTTP method for webhook requests',
    example: 'POST',
  })
  method: string;

  @ApiProperty({
    description: 'API key for webhook authentication',
    example: 'your-api-key-here',
    required: false,
  })
  apiKey?: string;

  @ApiProperty({
    description: 'Request timeout in milliseconds',
    example: 10000,
  })
  timeout: number;
}

export class WebhookConfigResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Webhook configured successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Webhook configuration details',
    type: WebhookConfigInfoDto,
  })
  config: WebhookConfigInfoDto;
}
