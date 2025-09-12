import { ApiProperty } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({
    description: 'Contact ID in WhatsApp format',
    example: '593995710556@c.us',
  })
  id: string;

  @ApiProperty({
    description: 'Contact name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Contact pushname (display name)',
    example: 'John',
    required: false,
  })
  pushname?: string;

  @ApiProperty({
    description: 'Phone number without @c.us suffix',
    example: '+593995710556',
  })
  phone: string;

  @ApiProperty({
    description: 'Whether this is a business contact',
    example: false,
  })
  isBusiness: boolean;

  @ApiProperty({
    description: 'Whether this contact is verified',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Profile picture URL',
    example: 'https://pps.whatsapp.net/v/t61.24694-24/...',
    required: false,
  })
  profilePicUrl?: string;

  @ApiProperty({
    description: 'Contact status message',
    example: 'Available',
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: 'Whether the contact is online',
    example: true,
    required: false,
  })
  isOnline?: boolean;

  @ApiProperty({
    description: 'Last seen timestamp',
    example: '2025-09-12T02:37:16.341Z',
    required: false,
  })
  lastSeen?: string;
}

export class ContactsResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Total number of contacts',
    example: 150,
  })
  totalContacts: number;

  @ApiProperty({
    description: 'List of contacts',
    type: [ContactDto],
  })
  contacts: ContactDto[];
}
