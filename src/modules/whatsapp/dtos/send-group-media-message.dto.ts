import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { MediaType } from './send-media-message.dto';

export class SendGroupMediaMessageDto {
  @ApiProperty({
    description: 'Name or ID of the group',
    example: 'BitFlow devs',
  })
  @IsString()
  groupName: string;

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

  @ApiProperty({
    description: 'Whether to search by group ID instead of name',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  searchById?: boolean;
}
