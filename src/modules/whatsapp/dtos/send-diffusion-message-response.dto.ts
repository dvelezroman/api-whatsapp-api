import { ApiProperty } from '@nestjs/swagger';

export class DiffusionInfoDto {
  @ApiProperty({
    description: 'Diffusion group ID',
    example: '120363405552092242@g.us',
  })
  id: string;

  @ApiProperty({
    description: 'Diffusion group name',
    example: 'BitFlow devs',
  })
  name: string;

  @ApiProperty({
    description: 'Number of participants in the diffusion group',
    example: 3,
  })
  participantsCount: number;
}

export class SendDiffusionMessageResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Diffusion group information',
    type: DiffusionInfoDto,
  })
  diffusion: DiffusionInfoDto;

  @ApiProperty({
    description: 'The message that was sent',
    example: 'Hello everyone! This is a broadcast message.',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp when the message was sent',
    example: '2025-09-12T02:44:05.384Z',
  })
  sentAt: string;
}
