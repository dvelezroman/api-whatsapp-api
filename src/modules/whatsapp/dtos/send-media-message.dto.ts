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
    description:
      'Media file URL or base64 data (supports data URLs like data:image/jpeg;base64,/9j/4AAQ...)',
    example:
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
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
