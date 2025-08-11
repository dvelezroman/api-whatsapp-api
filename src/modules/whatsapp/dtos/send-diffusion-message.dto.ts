import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendDiffusionMessageDto {
  @ApiProperty({
    description: 'Diffusion group name or ID to send message to',
    example: 'Broadcast List 1',
  })
  @IsString()
  @IsNotEmpty()
  diffusionName: string;

  @ApiProperty({
    description: 'Message to be sent to the diffusion group',
    example: 'Hello everyone! This is a broadcast message.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Whether to search by diffusion ID instead of name',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsString()
  searchById?: boolean;
}
