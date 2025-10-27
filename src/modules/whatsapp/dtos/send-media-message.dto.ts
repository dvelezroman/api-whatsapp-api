import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum MediaType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  STICKER = 'sticker',
}

export class SendMediaMessageDto {
  @ApiProperty({
    description: 'Phone number of the contact (any valid WhatsApp number)',
    example: '+593995710556',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Type of media to send',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsEnum(MediaType)
  mediaType: MediaType;

  @ApiProperty({
    description: 'Media file URL or base64 data',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  mediaUrl: string;

  @ApiProperty({
    description: 'Caption for the media (optional)',
    example: 'Check out this image!',
    required: false,
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({
    description: 'Filename for document type media (optional)',
    example: 'document.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  filename?: string;
}
