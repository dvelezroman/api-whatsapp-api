import { ApiProperty } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({ description: 'Contact ID' })
  id: string;

  @ApiProperty({ description: 'Contact name' })
  name: string;

  @ApiProperty({ description: 'Contact phone number', required: false })
  phone?: string;

  @ApiProperty({ description: 'Contact push name', required: false })
  pushname?: string;

  @ApiProperty({
    description: 'Whether the contact is a business account',
    required: false,
  })
  isBusiness?: boolean;

  @ApiProperty({
    description: 'Whether the contact is verified',
    required: false,
  })
  isVerified?: boolean;

  @ApiProperty({ description: 'Contact profile picture URL', required: false })
  profilePicUrl?: string;

  @ApiProperty({ description: 'Contact status', required: false })
  status?: string;
}

export class GroupContactsResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: string;

  @ApiProperty({ description: 'Group information' })
  group: {
    id: string;
    name: string;
    participantsCount: number;
  };

  @ApiProperty({
    description: 'List of contacts in the group',
    type: [ContactDto],
  })
  contacts: ContactDto[];
}

export class DiffusionContactsResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: string;

  @ApiProperty({ description: 'Diffusion group information' })
  diffusion: {
    id: string;
    name: string;
    participantsCount: number;
  };

  @ApiProperty({
    description: 'List of contacts in the diffusion group',
    type: [ContactDto],
  })
  contacts: ContactDto[];
}

export class ContactResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: string;

  @ApiProperty({ description: 'Contact information', type: ContactDto })
  contact: ContactDto;
}
