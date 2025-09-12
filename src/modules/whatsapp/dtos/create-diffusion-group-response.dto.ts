import { ApiProperty } from '@nestjs/swagger';

export class CreatedDiffusionGroupInfoDto {
  @ApiProperty({
    description: 'Diffusion group ID in WhatsApp format',
    example: '120363405552092242@g.us',
  })
  id: string;

  @ApiProperty({
    description: 'Diffusion group name',
    example: 'Marketing Broadcast',
  })
  name: string;

  @ApiProperty({
    description: 'Diffusion group description',
    example: 'Broadcast list for marketing campaigns',
  })
  description: string;

  @ApiProperty({
    description: 'Number of participants in the diffusion group',
    example: 3,
  })
  participantsCount: number;

  @ApiProperty({
    description: 'Whether this is a group chat',
    example: true,
  })
  isGroup: boolean;

  @ApiProperty({
    description: 'Whether this is a broadcast list',
    example: true,
  })
  isBroadcast: boolean;

  @ApiProperty({
    description: 'Diffusion group creation timestamp',
    example: '2025-09-12T02:37:16.341Z',
  })
  createdAt: string;
}

export class CreateDiffusionGroupResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Diffusion group created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Created diffusion group information',
    type: CreatedDiffusionGroupInfoDto,
  })
  diffusion: CreatedDiffusionGroupInfoDto;
}
