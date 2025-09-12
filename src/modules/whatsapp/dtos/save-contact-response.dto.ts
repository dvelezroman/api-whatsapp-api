import { ApiProperty } from '@nestjs/swagger';

export class ContactInfoDto {
  @ApiProperty({
    description: 'Phone number in WhatsApp format',
    example: '593995710556@c.us',
  })
  phone: string;

  @ApiProperty({
    description: 'Contact name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Contact description',
    example: 'Auto-saved from incoming message',
  })
  description: string;

  @ApiProperty({
    description: 'Whether the contact was manually created',
    example: true,
  })
  isManuallyCreated: boolean;

  @ApiProperty({
    description: 'Timestamp when the contact was validated',
    example: '2025-09-12T02:37:16.341Z',
  })
  validatedAt: string;
}

export class SaveContactResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Contact information',
    type: ContactInfoDto,
  })
  contact: ContactInfoDto;
}
