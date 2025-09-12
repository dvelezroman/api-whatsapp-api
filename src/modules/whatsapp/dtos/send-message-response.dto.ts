import { ApiProperty } from '@nestjs/swagger';

export class SendMessageResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Phone number in WhatsApp format',
    example: '593995710556@c.us',
  })
  phone: string;

  @ApiProperty({
    description: 'Contact name',
    example: 'John Doe',
  })
  contactName: string;

  @ApiProperty({
    description: 'The message that was sent',
    example: 'Hello! This is a test message.',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp when the message was sent',
    example: '2025-09-12T02:37:16.341Z',
  })
  sentAt: string;
}
