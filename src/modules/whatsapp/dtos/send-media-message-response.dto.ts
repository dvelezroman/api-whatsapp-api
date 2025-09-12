import { ApiProperty } from '@nestjs/swagger';
import { MediaType } from './send-media-message.dto';

export class MediaInfoDto {
  @ApiProperty({
    description: 'Type of media sent',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  type: MediaType;

  @ApiProperty({
    description: 'Media URL or identifier',
    example: 'https://example.com/image.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Caption sent with the media',
    example: 'Check out this image!',
    required: false,
  })
  caption?: string;

  @ApiProperty({
    description: 'Filename for document type media',
    example: 'document.pdf',
    required: false,
  })
  filename?: string;
}

export class SendMediaMessageResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Phone number the media was sent to',
    example: '+593995710556',
  })
  phone: string;

  @ApiProperty({
    description: 'Contact name',
    example: 'John Doe',
  })
  contactName: string;

  @ApiProperty({
    description: 'Media information',
    type: MediaInfoDto,
  })
  media: MediaInfoDto;

  @ApiProperty({
    description: 'Timestamp when the media was sent',
    example: '2025-09-12T02:37:16.341Z',
  })
  sentAt: string;
}
