import { ApiProperty } from '@nestjs/swagger';
import { MediaType } from './send-media-message.dto';

export class DiffusionMediaInfoDto {
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

export class SendDiffusionMediaMessageResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Diffusion group information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '120363405552092242@g.us' },
      name: { type: 'string', example: 'Marketing Broadcast' },
      participantsCount: { type: 'number', example: 3 },
    },
  })
  diffusion: {
    id: string;
    name: string;
    participantsCount: number;
  };

  @ApiProperty({
    description: 'Media information',
    type: DiffusionMediaInfoDto,
  })
  media: DiffusionMediaInfoDto;

  @ApiProperty({
    description: 'Timestamp when the media was sent',
    example: '2025-09-12T02:37:16.341Z',
  })
  sentAt: string;
}
